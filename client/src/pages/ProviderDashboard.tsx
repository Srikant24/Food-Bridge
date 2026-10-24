import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  fetchDonations, 
  regeneratePickupOtp,
  fetchProviderIncomingRequests,
  respondToDonationRequest,
  type DonationItem 
} from '../services/api';
import { 
  Utensils, 
  Plus, 
  Clock, 
  MapPin, 
  Key, 
  ChevronRight, 
  Sparkles,
  RefreshCw,
  Eye,
  ShieldCheck,
  Copy,
  Check,
  AlertCircle,
  HeartHandshake,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { CardSkeleton } from '../components/SkeletonLoader';
import { AnimatedCounter } from '../components/motion/AnimatedCounter';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { DashboardRefreshBar } from '../components/DashboardRefreshBar';

export const ProviderDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedDonationForOtp, setSelectedDonationForOtp] = useState<DonationItem | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadDonations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [donationsData, requestsData] = await Promise.all([
        fetchDonations({ providerOnly: 'true' }),
        fetchProviderIncomingRequests().catch(() => ({ count: 0, requests: [] })),
      ]);
      setDonations(donationsData.donations);
      setIncomingRequests(requestsData.requests || []);
    } catch (err) {
      console.error('Error fetching provider dashboard data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const handleRespondRequest = async (donationId: string, requestId: string, action: 'approve' | 'reject') => {
    setRespondingRequestId(requestId);
    try {
      await respondToDonationRequest(donationId, { requestId, action });
      const msg = action === 'approve' 
        ? 'Request approved! Pickup code generated and donation locked for handover.' 
        : 'Request rejected.';
      showToast('success', action === 'approve' ? 'Request Approved' : 'Request Rejected', msg);
      await loadDonations(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update request response.';
      showToast('error', 'Action Failed', msg);
    } finally {
      setRespondingRequestId(null);
    }
  };

  const {
    isRefreshing,
    autoRefresh,
    setAutoRefresh,
    lastUpdated,
    refreshNow,
  } = useDashboardRefresh({
    onRefresh: async () => {
      await loadDonations(true);
    },
    intervalSeconds: 15,
    defaultAutoRefresh: true,
  });

  useEffect(() => {
    loadDonations(false);
    const handleDonationUpdate = () => {
      loadDonations(true);
    };
    window.addEventListener('foodbridge:donations:updated', handleDonationUpdate);
    return () => {
      window.removeEventListener('foodbridge:donations:updated', handleDonationUpdate);
    };
  }, [loadDonations]);

  // Compute live statistics from actual records
  const totalListed = donations.length;
  const activeCount = donations.filter(d => ['available', 'requested', 'accepted', 'pickup_scheduled'].includes(d.status)).length;
  const completedDonations = donations.filter(d => ['delivered', 'completed'].includes(d.status));
  const mealsRescued = completedDonations.reduce((sum, d) => sum + d.quantityMeals, 0);
  const kgRescued = Math.round(completedDonations.reduce((sum, d) => sum + d.quantityKg, 0) * 10) / 10;

  // Active donations waiting for pickup handover
  const pendingPickupDonations = donations.filter(d => ['accepted', 'pickup_scheduled'].includes(d.status));

  const handleRegenerateOtp = async (donationId: string) => {
    setRegeneratingId(donationId);
    try {
      const res = await regeneratePickupOtp(donationId);
      showToast('success', 'OTP Regenerated', 'New 4-digit pickup code generated. Previous code has been invalidated.');
      setDonations(prev => prev.map(d => d._id === donationId ? { ...d, pickupOtp: res.pickupOtp } : d));
      if (selectedDonationForOtp?._id === donationId) {
        setSelectedDonationForOtp(prev => prev ? { ...prev, pickupOtp: res.pickupOtp } : null);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to regenerate OTP.';
      showToast('error', 'Regeneration Failed', msg);
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleCopyOtp = (donationId: string, otp: string) => {
    if (!otp) return;
    navigator.clipboard.writeText(otp);
    setCopiedId(donationId);
    showToast('info', 'Code Copied', 'Pickup OTP copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Filter donations
  const filteredDonations = donations.filter(d => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return ['available', 'requested', 'accepted', 'pickup_scheduled'].includes(d.status);
    if (activeFilter === 'completed') return ['delivered', 'completed'].includes(d.status);
    if (activeFilter === 'urgent') {
      const hoursLeft = (new Date(d.collectionDeadline).getTime() - Date.now()) / (1000 * 60 * 60);
      return d.status === 'available' && hoursLeft > 0 && hoursLeft <= 3;
    }
    return d.status === activeFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Available</span>;
      case 'requested':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">Request Pending</span>;
      case 'accepted':
      case 'pickup_scheduled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">Pickup Scheduled</span>;
      case 'picked_up':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">In Transit</span>;
      case 'delivered':
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-forest-900 text-white">Completed</span>;
      case 'expired':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">Expired</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-charcoal-100 text-charcoal-700">{status}</span>;
    }
  };

  const getTimeRemainingText = (deadlineStr: string) => {
    const diffMs = new Date(deadlineStr).getTime() - Date.now();
    if (diffMs <= 0) return <span className="text-rose-600 font-bold">Expired</span>;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 2) {
      return <span className="text-rose-600 font-bold flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Urgent: {hours}h {mins}m left</span>;
    }
    return <span className="text-charcoal-600 font-medium flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {hours}h {mins}m left</span>;
  };

    const orgStatus = user?.organization?.verificationStatus;
    const isApproved = orgStatus === 'approved' || orgStatus === 'verified';
    const isPending = orgStatus === 'pending' || !orgStatus;
    const isRejected = orgStatus === 'rejected';

    return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Top Banner / Welcome */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-sage/80 shadow-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-white via-cream/50 to-emerald-50/30">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-bold border border-forest/15">
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            <span>Food Provider Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900 tracking-tight">
            Welcome, <span className="text-forest">{user?.name || 'Partner Kitchen'}</span>
          </h1>
          <div className="text-xs sm:text-sm text-charcoal-500 flex flex-wrap items-center gap-2">
            <span>{user?.organization?.name} • {user?.organization?.city || 'Delhi NCR'}</span>
            {isApproved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified Partner
              </span>
            )}
            {isPending && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
              </span>
            )}
            {isRejected && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                <AlertCircle className="w-3 h-3 text-rose-600" /> Not Approved
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <DashboardRefreshBar
            isRefreshing={isRefreshing}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={setAutoRefresh}
            lastUpdated={lastUpdated}
            onRefreshNow={refreshNow}
          />
          {isApproved ? (
            <Link
              to="/donations/create"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-900 text-white font-semibold text-xs shadow-glow transition-all hover:scale-[1.02] active:scale-95 border border-lime/30"
            >
              <Plus className="w-4 h-4 text-lime" />
              <span>List Surplus Food</span>
            </Link>
          ) : (
            <button
              onClick={() => {
                showToast(
                  'info',
                  'Verification Required',
                  'Your food provider account is pending administrator approval before you can publish surplus food listings.'
                );
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-charcoal-100 text-charcoal-500 font-semibold text-xs border border-charcoal-200 cursor-not-allowed select-none shadow-xs"
              title="Surplus food listing is locked pending administrator verification"
            >
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Listing Locked (Pending Verification)</span>
            </button>
          )}
        </div>
      </div>

      {/* Account Verification Status Alert Banner */}
      {isPending && (
        <div className="rounded-2xl p-5 bg-amber-50/90 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-amber-900">Account Pending Verification</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                  Under Admin Review
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Your Food Provider account is currently undergoing administrator review. You have full access to view your dashboard, but surplus food listing capabilities will be activated once your facility credentials are confirmed.
              </p>
            </div>
          </div>
          <div className="shrink-0 self-end sm:self-center">
            <span className="text-[11px] font-medium text-amber-700 bg-amber-100/60 px-3 py-1.5 rounded-xl border border-amber-200">
              Typical turnaround: &lt; 24h
            </span>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="rounded-2xl p-5 bg-rose-50/90 border border-rose-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-rose-900">Account Application Not Approved</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Your provider registration could not be verified by platform administrators. Surplus food listings are temporarily locked. Please contact support@foodbridge.org to update your documentation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Active Listings</div>
          <div className="text-3xl font-extrabold text-forest mt-2 font-display">
            <AnimatedCounter to={activeCount} duration={1.2} />
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">Ready for pickup</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-forest shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Total Created</div>
          <div className="text-3xl font-extrabold text-forest mt-2 font-display">
            <AnimatedCounter to={totalListed} duration={1.4} />
          </div>
          <div className="text-xs text-charcoal-500 font-medium mt-1">Lifetime donations</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-lime-500 shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Meals Rescued</div>
          <div className="text-3xl font-extrabold text-forest mt-2 font-display">
            <AnimatedCounter to={mealsRescued} duration={1.6} />
          </div>
          <div className="text-xs text-emerald-800 font-medium mt-1">Delivered to shelters</div>
        </div>

        <div className="glass-card p-5 rounded-2xl border-l-4 border-l-apricot shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Food Diverted (kg)</div>
          <div className="text-3xl font-extrabold text-forest mt-2 font-display">
            <AnimatedCounter to={kgRescued} suffix=" kg" duration={1.6} />
          </div>
          <div className="text-xs text-charcoal-600 font-medium mt-1">Saved from landfill</div>
        </div>
      </div>

      {/* Incoming NGO Collection Requests Section */}
      {incomingRequests.filter((r: any) => r.status === 'pending').length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
                <HeartHandshake className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold font-display text-charcoal-900">
                  Incoming NGO Collection Requests
                </h2>
                <p className="text-xs text-charcoal-500">
                  Verified shelters requesting surplus food pickups. Approve to generate a 4-digit handover OTP.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {incomingRequests.filter((r: any) => r.status === 'pending').length} Awaiting Approval
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingRequests.filter((r: any) => r.status === 'pending').map((req: any) => (
              <div
                key={req._id}
                className="glass-card rounded-3xl p-5 border-2 border-amber-400/60 bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 shadow-glass space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      Pending Your Review
                    </span>
                    <h3 className="text-base font-bold text-charcoal-900">
                      {req.donationId?.title || 'Food Donation'}
                    </h3>
                    <div className="text-xs text-charcoal-600 flex items-center gap-2 font-medium">
                      <span>{req.donationId?.quantityMeals} meals</span>
                      <span>•</span>
                      <span>NGO: <strong>{req.ngoOrganizationId?.name || 'Verified Shelter'}</strong></span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {req.matchScore ? `${Math.round(req.matchScore)}% Match` : 'Matched'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-white/90 border border-amber-200/80 text-xs space-y-1.5 text-charcoal-700">
                  <div>
                    <span className="font-semibold text-charcoal-500 text-[11px] uppercase tracking-wider">Pickup Van ETA: </span>
                    <span className="font-bold text-forest-900">
                      {new Date(req.estimatedPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(req.estimatedPickupTime).toLocaleDateString()})
                    </span>
                  </div>
                  {req.requestNotes && (
                    <p className="text-[11px] text-charcoal-600 italic">
                      "{req.requestNotes}"
                    </p>
                  )}
                  <div className="text-[11px] text-charcoal-500">
                    Contact: {req.ngoId?.name} ({req.ngoId?.phone || req.ngoOrganizationId?.phone || 'On File'})
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRespondRequest(req.donationId?._id || req.donationId, req._id, 'approve')}
                    disabled={respondingRequestId === req._id}
                    className="flex-1 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {respondingRequestId === req._id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-lime-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-lime-400" />
                    )}
                    <span>Approve Collection & Issue OTP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRespondRequest(req.donationId?._id || req.donationId, req._id, 'reject')}
                    disabled={respondingRequestId === req._id}
                    className="px-4 py-2.5 rounded-xl border border-charcoal-300 text-charcoal-700 hover:bg-charcoal-100 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TASK 3: Dedicated Pickup Verification Section for Approved Requests */}
      {pendingPickupDonations.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-forest-900 text-lime-400">
                <Key className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold font-display text-charcoal-900">
                  Pickup Verification & Collector Handover
                </h2>
                <p className="text-xs text-charcoal-500">
                  Approved collections awaiting NGO driver arrival. Share the 4-digit code verbally upon physical inspection.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
              {pendingPickupDonations.length} Pending Handover
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPickupDonations.map((donation) => (
              <div 
                key={donation._id} 
                className="glass-card rounded-3xl p-5 border-2 border-emerald-500/40 bg-gradient-to-br from-white via-cream/30 to-emerald-50/40 shadow-glass space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Approved • Ready for Pickup
                    </span>
                    <h3 className="text-base font-bold text-charcoal-900">
                      {donation.title}
                    </h3>
                    <div className="text-xs text-charcoal-600 flex items-center gap-2 font-medium">
                      <span>{donation.quantityMeals} meals ({donation.quantityKg} kg)</span>
                      <span>•</span>
                      <span className="capitalize">{donation.foodCategory.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <Link 
                    to={`/donations/${donation._id}`}
                    className="p-2 rounded-xl border border-charcoal-200 hover:bg-charcoal-50 text-charcoal-600"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>

                {/* Recipient & Schedule Info */}
                <div className="p-3 rounded-2xl bg-white/80 border border-emerald-200/80 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-charcoal-700">
                    <span className="font-semibold text-charcoal-500 text-[11px] uppercase tracking-wider">Approved NGO Recipient:</span>
                    <span className="font-bold text-forest-900">
                      {donation.assignedNgoId?.name || 'Verified Community NGO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-charcoal-600 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Collection Deadline:</span>
                    </span>
                    <span className="font-semibold">
                      {new Date(donation.collectionDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(donation.collectionDeadline).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                {/* Secure OTP Card */}
                <div className="p-4 rounded-2xl bg-forest-950 text-white space-y-2 border border-forest-800 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-lime-400 font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Secure Handover OTP</span>
                    </div>
                    <span className="text-[10px] text-charcoal-300 bg-white/10 px-2 py-0.5 rounded">
                      Secret PIN
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="font-mono font-extrabold text-3xl tracking-widest text-lime-400 drop-shadow-xs">
                      {donation.pickupOtp || '----'}
                    </div>

                    <div className="flex items-center gap-2">
                      {donation.pickupOtp && (
                        <button
                          onClick={() => handleCopyOtp(donation._id, donation.pickupOtp!)}
                          className="p-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-charcoal-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Copy OTP"
                        >
                          {copiedId === donation._id ? <Check className="w-4 h-4 text-lime-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}

                      <button
                        onClick={() => handleRegenerateOtp(donation._id)}
                        disabled={regeneratingId === donation._id}
                        className="px-3 py-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        title="Regenerate OTP"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === donation._id ? 'animate-spin' : ''}`} />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-charcoal-300 font-normal pt-1 flex items-start gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-lime-300 flex-shrink-0 mt-0.5" />
                    <span><strong>Share OTP with Collector:</strong> Ask driver to enter this code on their app to verify meal possession.</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Listings Section */}
      <div className="space-y-4">
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-charcoal-200 pb-3">
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Listings' },
              { id: 'active', label: 'Active & In-Progress' },
              { id: 'urgent', label: 'Critical Urgency (<3h)' },
              { id: 'completed', label: 'Completed' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  activeFilter === tab.id
                    ? 'bg-forest-900 text-white shadow-sm'
                    : 'bg-white text-charcoal-600 border border-charcoal-200 hover:bg-charcoal-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-charcoal-500 font-medium">
            Showing {filteredDonations.length} listing{filteredDonations.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filteredDonations.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-dashed border-charcoal-300">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <Utensils className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-charcoal-900">No surplus food listings in this view</h3>
              <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
                Have extra prepared meals or fresh produce from lunch service? List them now to find matched NGOs.
              </p>
            </div>
            <Link
              to="/donations/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-900 text-white font-semibold text-xs shadow-md"
            >
              <Plus className="w-4 h-4 text-lime-400" />
              <span>Create New Listing</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDonations.map(donation => (
              <div 
                key={donation._id}
                className="glass-card rounded-2xl p-5 border border-charcoal-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded-md">
                      {donation.foodCategory.replace('_', ' ')}
                    </span>
                    {getStatusBadge(donation.status)}
                  </div>

                  <h3 className="text-base font-bold text-charcoal-900 line-clamp-1">
                    {donation.title}
                  </h3>

                  <p className="text-xs text-charcoal-600 line-clamp-2">
                    {donation.description || 'Surplus meals packed in food-safe containers.'}
                  </p>
                </div>

                {/* Details Pills */}
                <div className="py-2.5 border-y border-charcoal-100 grid grid-cols-2 gap-2 text-xs text-charcoal-700">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Utensils className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{donation.quantityMeals} meals ({donation.quantityKg} kg)</span>
                  </div>
                  <div>
                    {getTimeRemainingText(donation.collectionDeadline)}
                  </div>
                  <div className="flex items-center gap-1.5 text-charcoal-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{donation.location.city}</span>
                  </div>
                  <div className="text-charcoal-500 capitalize">
                    {donation.storageRequirement.replace('_', ' ')}
                  </div>
                </div>

                {/* Assigned NGO / Request Alert */}
                {donation.assignedNgoId && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-700 block">Assigned Recipient:</span>
                      <span className="font-semibold">{donation.assignedNgoId.name || 'Hope Community Shelter'}</span>
                    </div>
                    {donation.pickupOtp && (
                      <button
                        onClick={() => setSelectedDonationForOtp(donation)}
                        className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs"
                      >
                        <Key className="w-3 h-3" />
                        <span>OTP</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Action Footer */}
                <div className="pt-2 flex items-center justify-between gap-2">
                  <Link
                    to={`/donations/${donation._id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-forest-900 text-white font-semibold text-xs hover:bg-forest-800 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-lime-400" />
                    <span>Match Leaderboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/donations/${donation._id}`}
                    className="p-2 rounded-xl border border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* OTP Display Modal */}
      {selectedDonationForOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-sm w-full bg-white space-y-5 border border-emerald-200 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-forest-900 text-lime-400 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Authorized Collection PIN
              </span>
              <h3 className="text-xl font-bold font-display text-charcoal-900 mt-2">
                Pickup Verification OTP
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Provide this 4-digit code to the verified NGO driver when they arrive to take possession of the meals.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-forest-950 text-white font-mono font-extrabold text-3xl tracking-widest text-lime-400 border border-forest-800 shadow-inner">
              {selectedDonationForOtp.pickupOtp || '----'}
            </div>

            <p className="text-[11px] text-charcoal-500">
              Listing: <span className="font-semibold text-charcoal-800">{selectedDonationForOtp.title}</span>
            </p>

            <div className="flex gap-2">
              {selectedDonationForOtp.pickupOtp && (
                <button
                  type="button"
                  onClick={() => handleCopyOtp(selectedDonationForOtp._id, selectedDonationForOtp.pickupOtp!)}
                  className="flex-1 py-2 rounded-xl border border-charcoal-200 text-charcoal-700 text-xs font-semibold hover:bg-charcoal-50 flex items-center justify-center gap-1.5"
                >
                  {copiedId === selectedDonationForOtp._id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedId === selectedDonationForOtp._id ? 'Copied' : 'Copy Code'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleRegenerateOtp(selectedDonationForOtp._id)}
                disabled={regeneratingId === selectedDonationForOtp._id}
                className="flex-1 py-2 rounded-xl bg-forest-800 hover:bg-forest-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${regeneratingId === selectedDonationForOtp._id ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            <button
              onClick={() => setSelectedDonationForOtp(null)}
              className="w-full py-2.5 rounded-xl bg-charcoal-900 text-white text-xs font-semibold hover:bg-charcoal-800"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
