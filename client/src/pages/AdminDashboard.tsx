import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchPendingNgoVerifications, 
  verifyNgoOrganization, 
  fetchAdminProviders,
  verifyProviderOrganization,
  fetchPlatformAnalytics, 
  triggerDemoSeed,
  fetchAdminUsers,
  fetchAdminAllDonations,
  fetchAdminAllRequests,
  type PlatformAnalytics,
  type DonationItem,
  type ProviderVerificationItem
} from '../services/api';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Building2, 
  Sliders, 
  Database,
  MapPin,
  Users,
  Utensils,
  Inbox,
  Clock,
  XCircle,
  AlertCircle,
  Search,
  Calendar,
  Phone,
  Mail,
  User,
  Filter,
  Loader2,
  X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { StatCardSkeleton, TableRowSkeleton } from '../components/SkeletonLoader';
import { AnimatedCounter } from '../components/motion/AnimatedCounter';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { DashboardRefreshBar } from '../components/DashboardRefreshBar';

export const AdminDashboard: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'verifications' | 'providers' | 'users' | 'donations' | 'requests'>('verifications');
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [pendingNgos, setPendingNgos] = useState<any[]>([]);
  const [allProviders, setAllProviders] = useState<ProviderVerificationItem[]>([]);
  const [providerFilter, setProviderFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [providerSearch, setProviderSearch] = useState<string>('');
  const [rejectModalProvider, setRejectModalProvider] = useState<ProviderVerificationItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDonations, setAllDonations] = useState<DonationItem[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [analyticsRes, pendingRes, providersRes, usersRes, donationsRes, requestsRes] = await Promise.all([
        fetchPlatformAnalytics().catch(() => null),
        fetchPendingNgoVerifications().catch(() => ({ count: 0, pendingNgos: [] })),
        fetchAdminProviders().catch(() => ({ count: 0, providers: [] })),
        fetchAdminUsers().catch(() => ({ count: 0, users: [] })),
        fetchAdminAllDonations().catch(() => ({ count: 0, donations: [] })),
        fetchAdminAllRequests().catch(() => ({ count: 0, requests: [] })),
      ]);
      if (analyticsRes) setAnalytics(analyticsRes);
      setPendingNgos(pendingRes.pendingNgos || []);
      setAllProviders(providersRes.providers || []);
      setAllUsers(usersRes.users || []);
      setAllDonations(donationsRes.donations || []);
      setAllRequests(requestsRes.requests || []);
    } catch (err) {
      console.error('Error loading admin analytics:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const {
    isRefreshing,
    autoRefresh,
    setAutoRefresh,
    lastUpdated,
    refreshNow,
  } = useDashboardRefresh({
    onRefresh: async () => {
      await loadData(true);
    },
    intervalSeconds: 15,
    defaultAutoRefresh: true,
  });

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleVerify = async (ngoId: string, action: 'approve' | 'reject') => {
    setActionLoading(ngoId);
    setErrorMsg(null);
    try {
      await verifyNgoOrganization(ngoId, action);
      const msg = `NGO ${action === 'approve' ? 'approved and marked verified' : 'rejected'}.`;
      setSuccessMsg(msg);
      showToast('success', action === 'approve' ? 'Organization Verified' : 'Application Rejected', msg);
      await loadData(true);
    } catch (err: any) {
      setErrorMsg('Failed to update verification status.');
      showToast('error', 'Action Error', 'Failed to update verification status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyProvider = async (providerId: string, action: 'approve' | 'reject', notes?: string) => {
    setActionLoading(providerId);
    setErrorMsg(null);
    try {
      await verifyProviderOrganization(providerId, action, notes);
      const msg = `Food Provider ${action === 'approve' ? 'approved and activated for food listings' : 'application rejected'}.`;
      setSuccessMsg(msg);
      showToast('success', action === 'approve' ? 'Provider Approved' : 'Application Rejected', msg);
      if (rejectModalProvider?._id === providerId) {
        setRejectModalProvider(null);
        setRejectNotes('');
      }
      await loadData(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update provider verification status.';
      setErrorMsg(msg);
      showToast('error', 'Action Error', msg);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetDemoData = async () => {
    setActionLoading('seed');
    try {
      await triggerDemoSeed();
      const msg = 'Demo database reset and seeded with fresh test records!';
      setSuccessMsg(msg);
      showToast('success', 'Database Reset', msg);
      await loadData();
    } catch (err) {
      setErrorMsg('Failed to reset demo database.');
      showToast('error', 'Reset Failed', 'Failed to reset demo database.');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingProvidersCount = allProviders.filter(p => p.verificationStatus === 'pending').length;
  const approvedProvidersCount = allProviders.filter(p => p.verificationStatus === 'approved' || p.verificationStatus === 'verified').length;
  const rejectedProvidersCount = allProviders.filter(p => p.verificationStatus === 'rejected').length;

  const filteredProviders = allProviders.filter(p => {
    if (providerFilter !== 'all') {
      if (providerFilter === 'approved') {
        if (p.verificationStatus !== 'approved' && p.verificationStatus !== 'verified') return false;
      } else {
        if (p.verificationStatus !== providerFilter) return false;
      }
    }
    if (providerSearch.trim()) {
      const q = providerSearch.toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchEmail = (p.email || p.userEmail || '').toLowerCase().includes(q);
      const matchPhone = (p.phone || p.userPhone || '').toLowerCase().includes(q);
      const matchContact = (p.contactPerson || p.userName || '').toLowerCase().includes(q);
      const matchCity = (p.city || '').toLowerCase().includes(q);
      const matchAddress = (p.address || '').toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchContact || matchCity || matchAddress;
    }
    return true;
  });

  const metrics = analytics?.metrics;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Top Banner */}
      {/* Top Banner */}
      <div className="rounded-3xl p-6 sm:p-8 border border-forest/30 shadow-editorial flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-forest text-white">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-700 text-sage text-xs font-bold border border-forest-600 shadow-xs select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-apricot" />
            <span>Platform Governance & Compliance Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
            FoodBridge <span className="text-apricot italic">Administrator</span>
          </h1>
          <p className="text-xs sm:text-sm text-white/85 font-sans">
            Audit food safety thresholds, verify recipient organizations, and tune intelligent redistribution weights.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <DashboardRefreshBar
            isRefreshing={isRefreshing}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={setAutoRefresh}
            lastUpdated={lastUpdated}
            onRefreshNow={refreshNow}
            variant="dark"
          />

          {/* 1-Click Demo Reset for Judges */}
          <button
            onClick={handleResetDemoData}
            disabled={actionLoading === 'seed'}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-apricot hover:bg-[#d58a38] text-darkink font-bold text-xs shadow-warm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Database className="w-4 h-4 text-darkink" />
            <span>{actionLoading === 'seed' ? 'Resetting...' : 'Reset Demo Records'}</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Platform Impact Counters */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-emerald-500 shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Total Donations</div>
            <div className="text-3xl font-extrabold text-forest mt-2 font-display">
              <AnimatedCounter to={metrics?.totalDonations || 0} duration={1.2} />
            </div>
            <div className="text-xs text-emerald-700 font-medium mt-1">{metrics?.activeDonations || 0} active now</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-forest shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Meals Redistributed</div>
            <div className="text-3xl font-extrabold text-forest mt-2 font-display">
              <AnimatedCounter to={metrics?.mealsRedistributed || 0} duration={1.5} />
            </div>
            <div className="text-xs text-emerald-800 font-medium mt-1">Beneficiaries fed</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-lime-500 shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Food Rescued (kg)</div>
            <div className="text-3xl font-extrabold text-forest mt-2 font-display">
              <AnimatedCounter to={metrics?.kgRescued || 0} suffix=" kg" duration={1.6} />
            </div>
            <div className="text-xs text-forest font-medium mt-1">Diverted from waste</div>
          </div>

          <div className="glass-card p-5 rounded-2xl border-l-4 border-l-apricot shadow-glass hover:shadow-glass-hover transition-all bg-white hover:-translate-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500">Estimated CO2e Avoided</div>
            <div className="text-3xl font-extrabold text-forest mt-2 font-display">
              <AnimatedCounter to={metrics?.estimatedCo2AvoidedKg || 0} suffix=" kg" duration={1.6} />
            </div>
            <div className="text-xs text-apricot-800 font-medium mt-1">GHG offset</div>
          </div>
        </div>
      )}

      {/* Main Grid: Admin Operational Management (Left) & Algorithm Weights (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMN 1 & 2: Tabbed Operational Management Panel */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Tabs Navigation */}
          <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-cream-100/90 border border-sage/80 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('verifications')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'verifications'
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/70'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Pending NGOs</span>
              {pendingNgos.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-apricot text-darkink font-extrabold leading-none">
                  {pendingNgos.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('providers')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'providers'
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/70'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Food Provider Verification</span>
              {pendingProvidersCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-apricot text-darkink font-extrabold leading-none">
                  {pendingProvidersCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/70'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Registered Users ({allUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('donations')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'donations'
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/70'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Food Listings & Deliveries ({allDonations.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'requests'
                  ? 'bg-forest text-white shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-white/70'
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Collection Requests ({allRequests.length})</span>
            </button>
          </div>

          {/* TAB 1: PENDING NGO VERIFICATIONS */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-charcoal-900">NGO Verification Queue</h2>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  {pendingNgos.length} Pending Approval
                </span>
              </div>

              {loading ? (
                <div className="space-y-3">
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </div>
              ) : pendingNgos.length === 0 ? (
                <div className="glass-card rounded-3xl p-8 text-center space-y-2 border border-charcoal-200 text-xs text-charcoal-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-charcoal-800">All NGO applications have been reviewed.</p>
                  <p>No organizations currently awaiting compliance vetting.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingNgos.map(ngo => (
                    <div 
                      key={ngo._id}
                      className="glass-card rounded-2xl p-5 border border-charcoal-200 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-charcoal-900">{ngo.name}</h3>
                          <div className="text-xs text-charcoal-500 flex items-center gap-2 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{ngo.location.address}, {ngo.location.city}</span>
                            <span>•</span>
                            <span>Reg #{ngo.registrationNumber || 'Not submitted'}</span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Pending Vetting
                        </span>
                      </div>

                      <p className="text-xs text-charcoal-600">
                        {ngo.description || 'Community shelter and welfare home.'}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-medium text-charcoal-700 p-3 rounded-xl bg-offwhite border border-charcoal-200/70">
                        <div>Capacity: <span className="font-bold text-charcoal-900">{ngo.capacity?.maxMealsPerDay} meals</span></div>
                        <div>Cold Storage: <span className="font-bold text-charcoal-900">{ngo.capacity?.hasRefrigeration ? 'Yes' : 'No'}</span></div>
                        <div>Transport Fleet: <span className="font-bold text-charcoal-900">{ngo.capacity?.hasTransportFleet ? 'Yes' : 'No'}</span></div>
                        <div>Volunteers: <span className="font-bold text-charcoal-900">{ngo.capacity?.activeVolunteers || 5}</span></div>
                      </div>

                      <div className="pt-2 flex items-center gap-3">
                        <button
                          onClick={() => handleVerify(ngo._id, 'approve')}
                          disabled={actionLoading === ngo._id}
                          className="flex-1 py-2 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                          <span>Approve & Verify Organization</span>
                        </button>

                        <button
                          onClick={() => handleVerify(ngo._id, 'reject')}
                          disabled={actionLoading === ngo._id}
                          className="px-4 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: FOOD PROVIDER VERIFICATION */}
          {activeTab === 'providers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h2 className="text-lg font-bold text-charcoal-900">Food Provider Verification</h2>
                    <p className="text-xs text-charcoal-500">Review commercial kitchens, restaurants, and surplus food providers.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {pendingProvidersCount > 0 && (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                      {pendingProvidersCount} Pending Approval
                    </span>
                  )}
                  <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full border border-forest/20">
                    {allProviders.length} Total Providers
                  </span>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-offwhite border border-charcoal-200/80">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-charcoal-500 mr-1 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setProviderFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      providerFilter === 'all'
                        ? 'bg-forest text-white shadow-xs'
                        : 'bg-white text-charcoal-600 hover:bg-cream-100 border border-charcoal-200'
                    }`}
                  >
                    All ({allProviders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      providerFilter === 'pending'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
                    }`}
                  >
                    Pending ({pendingProvidersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderFilter('approved')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      providerFilter === 'approved'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    Approved ({approvedProvidersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderFilter('rejected')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      providerFilter === 'rejected'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                    }`}
                  >
                    Rejected ({rejectedProvidersCount})
                  </button>
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    placeholder="Search name, email, city..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-white border border-charcoal-200 focus:outline-none focus:ring-2 focus:ring-forest/30"
                  />
                  {providerSearch && (
                    <button
                      onClick={() => setProviderSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Provider Cards List */}
              {loading ? (
                <div className="space-y-3">
                  <TableRowSkeleton />
                  <TableRowSkeleton />
                </div>
              ) : filteredProviders.length === 0 ? (
                <div className="glass-card rounded-3xl p-8 text-center space-y-2 border border-charcoal-200 text-xs text-charcoal-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                  <p className="font-semibold text-charcoal-800">No Food Providers match the selected filter.</p>
                  <p>Try switching filter tabs or clearing your search term.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProviders.map(provider => {
                    const isPending = provider.verificationStatus === 'pending';
                    const isApproved = provider.verificationStatus === 'approved' || provider.verificationStatus === 'verified';
                    const isRejected = provider.verificationStatus === 'rejected';

                    const statusBadge = isApproved
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : isPending
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200';

                    const statusLabel = isApproved ? 'Approved & Active' : isPending ? 'Pending Verification' : 'Rejected';

                    const displayEmail = provider.email || provider.userEmail || 'No email provided';
                    const displayPhone = provider.phone || provider.userPhone || 'No phone provided';
                    const fullAddress = provider.address 
                      ? `${provider.address}${provider.city ? ', ' + provider.city : ''}`
                      : (provider.city || 'Facility address not specified');

                    return (
                      <div
                        key={provider._id}
                        className={`glass-card rounded-2xl p-5 border transition-all shadow-xs ${
                          isPending ? 'border-amber-200 bg-amber-50/20' : 'border-charcoal-200'
                        }`}
                      >
                        {/* Header Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-charcoal-900">{provider.name}</h3>
                              <span className="text-[11px] font-semibold text-charcoal-500 px-2 py-0.5 rounded-md bg-offwhite border border-charcoal-200">
                                {provider.type ? provider.type.replace('_', ' ').toUpperCase() : 'FOOD PROVIDER'}
                              </span>
                            </div>
                            <div className="text-xs text-charcoal-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5 text-charcoal-400" />
                                {provider.contactPerson || provider.userName || 'Primary Contact'}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <Mail className="w-3.5 h-3.5 text-charcoal-400" />
                                {displayEmail}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3.5 h-3.5 text-charcoal-400" />
                                {displayPhone}
                              </span>
                            </div>
                          </div>

                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-center ${statusBadge}`}>
                            {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {isPending && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                            {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            <span>{statusLabel}</span>
                          </span>
                        </div>

                        {/* Facility & Metadata Details */}
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-charcoal-700 p-3 rounded-xl bg-offwhite border border-charcoal-200/70">
                          <div className="flex items-start gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-charcoal-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="text-charcoal-500">Facility Address: </span>
                              <span className="font-semibold text-charcoal-900">{fullAddress}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-charcoal-400 shrink-0" />
                            <div>
                              <span className="text-charcoal-500">Registered On: </span>
                              <span className="font-semibold text-charcoal-900">
                                {provider.createdAt ? new Date(provider.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                              </span>
                            </div>
                          </div>
                          {provider.verifiedAt && (
                            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold sm:col-span-2">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Verified by Admin on {new Date(provider.verifiedAt).toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 flex flex-wrap items-center gap-3">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleVerifyProvider(provider._id, 'approve')}
                                disabled={actionLoading === provider._id}
                                className="flex-1 py-2 px-4 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === provider._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                                )}
                                <span>Approve Provider</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectModalProvider(provider);
                                  setRejectNotes('');
                                }}
                                disabled={actionLoading === provider._id}
                                className="px-4 py-2 rounded-xl border border-rose-300 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {isApproved && (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Provider is authorized to publish surplus listings and coordinate pickups.
                              </span>
                              <button
                                onClick={() => {
                                  setRejectModalProvider(provider);
                                  setRejectNotes('');
                                }}
                                disabled={actionLoading === provider._id}
                                className="px-3 py-1.5 rounded-lg border border-charcoal-200 text-xs font-medium text-charcoal-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 cursor-pointer transition-colors"
                              >
                                Revoke / Reject
                              </button>
                            </div>
                          )}

                          {isRejected && (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                                Provider is currently blocked from publishing food listings.
                              </span>
                              <button
                                onClick={() => handleVerifyProvider(provider._id, 'approve')}
                                disabled={actionLoading === provider._id}
                                className="px-3 py-1.5 rounded-lg bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-lime-400" />
                                <span>Re-approve Provider</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTERED USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-charcoal-900">Registered Users Directory</h2>
                </div>
                <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full border border-forest/20">
                  {allUsers.length} Users Enrolled
                </span>
              </div>

              {allUsers.length === 0 ? (
                <div className="glass-card rounded-3xl p-8 text-center text-xs text-charcoal-500 border border-charcoal-200">
                  No registered users found.
                </div>
              ) : (
                <div className="glass-card rounded-2xl border border-charcoal-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-offwhite text-charcoal-600 font-bold border-b border-charcoal-200">
                        <tr>
                          <th className="p-3">User & Email</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Organization</th>
                          <th className="p-3">Registered Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal-100">
                        {allUsers.map((u) => {
                          const roleColor = 
                            u.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 border-purple-200' 
                              : u.role === 'provider' 
                              ? 'bg-blue-100 text-blue-800 border-blue-200' 
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200';

                          return (
                            <tr key={u._id} className="hover:bg-cream-50/50 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-charcoal-900">{u.name}</div>
                                <div className="text-charcoal-500 font-mono text-[11px]">{u.email}</div>
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${roleColor}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="p-3 text-charcoal-700">
                                <div className="font-semibold">{u.organizationId?.name || '—'}</div>
                                {u.organizationId?.type && (
                                  <div className="text-[11px] text-charcoal-500 capitalize">{u.organizationId.type}</div>
                                )}
                              </td>
                              <td className="p-3 text-charcoal-500 font-mono text-[11px]">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FOOD LISTINGS & DELIVERIES */}
          {activeTab === 'donations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-charcoal-900">Food Listings & Active Deliveries</h2>
                </div>
                <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full border border-forest/20">
                  {allDonations.length} Listings Total
                </span>
              </div>

              {allDonations.length === 0 ? (
                <div className="glass-card rounded-3xl p-8 text-center text-xs text-charcoal-500 border border-charcoal-200">
                  No food listings recorded in the database.
                </div>
              ) : (
                <div className="space-y-3">
                  {allDonations.map((d) => {
                    const statusClass = 
                      ['delivered', 'completed'].includes(d.status)
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : d.status === 'picked_up'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : ['accepted', 'pickup_scheduled'].includes(d.status)
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-cream-200 text-charcoal-800 border-charcoal-300';

                    return (
                      <div key={d._id} className="glass-card rounded-2xl p-4 border border-charcoal-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded-md">
                            {d.foodCategory.replace('_', ' ')}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${statusClass}`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-charcoal-900">{d.title}</h4>
                            <div className="text-xs text-charcoal-500">
                              <span>{d.quantityMeals} meals ({d.quantityKg} kg)</span>
                              <span> • </span>
                              <span>Provider: {(d.organizationId as any)?.name || 'Food Provider'}</span>
                              {d.assignedNgoId && (
                                <>
                                  <span> • </span>
                                  <span className="text-emerald-700 font-semibold">Assigned NGO: {(d.assignedNgoId as any)?.name || 'NGO Recipient'}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right text-[11px] text-charcoal-500">
                            <div>Deadline: {new Date(d.collectionDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div>City: {d.location?.city}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: COLLECTION REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-lg font-bold text-charcoal-900">Collection Requests Audit</h2>
                </div>
                <span className="text-xs font-bold text-forest bg-forest/10 px-2.5 py-1 rounded-full border border-forest/20">
                  {allRequests.length} Total Requests
                </span>
              </div>

              {allRequests.length === 0 ? (
                <div className="glass-card rounded-3xl p-8 text-center text-xs text-charcoal-500 border border-charcoal-200">
                  No collection requests logged.
                </div>
              ) : (
                <div className="glass-card rounded-2xl border border-charcoal-200 overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-offwhite text-charcoal-600 font-bold border-b border-charcoal-200">
                        <tr>
                          <th className="p-3">Donation Title</th>
                          <th className="p-3">Requesting NGO</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">ETA Pickup</th>
                          <th className="p-3">Requested At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal-100">
                        {allRequests.map((r) => {
                          const statusBadge = 
                            r.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : r.status === 'pending'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-rose-100 text-rose-800 border-rose-200';

                          return (
                            <tr key={r._id} className="hover:bg-cream-50/50 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-charcoal-900">{r.donationId?.title || 'Donation Item'}</div>
                                <div className="text-[11px] text-charcoal-500">{r.donationId?.quantityMeals || 0} meals</div>
                              </td>
                              <td className="p-3 font-semibold text-charcoal-800">
                                {r.ngoOrganizationId?.name || r.ngoId?.name || 'NGO Recipient'}
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="p-3 text-charcoal-600 text-[11px]">
                                {r.estimatedPickupTime 
                                  ? new Date(r.estimatedPickupTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                  : 'Not specified'}
                              </td>
                              <td className="p-3 text-charcoal-500 font-mono text-[11px]">
                                {new Date(r.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* COLUMN 3: Algorithm Weight Tuner */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-charcoal-900">Matching Weights</h2>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-charcoal-200 shadow-md space-y-4">
            <p className="text-xs text-charcoal-500 leading-relaxed">
              Real-time weights governing the recommendation engine for surplus redistribution.
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Urgency (Shelf-life)</span>
                  <span className="text-emerald-700 font-mono">30%</span>
                </div>
                <div className="w-full bg-charcoal-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '30%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Distance (Geodesic Proximity)</span>
                  <span className="text-emerald-700 font-mono">25%</span>
                </div>
                <div className="w-full bg-charcoal-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Recipient Intake Capacity</span>
                  <span className="text-emerald-700 font-mono">20%</span>
                </div>
                <div className="w-full bg-charcoal-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Pickup Fleet Availability</span>
                  <span className="text-emerald-700 font-mono">15%</span>
                </div>
                <div className="w-full bg-charcoal-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Food Handling Compatibility</span>
                  <span className="text-emerald-700 font-mono">10%</span>
                </div>
                <div className="w-full bg-charcoal-100 rounded-full h-2">
                  <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-forest-900/5 text-xs text-forest-900 font-medium">
              Sum: 100% Normalized. Exclusion criteria active for unverified or capacity-overflow recipients.
            </div>
          </div>
        </div>

      </div>

      {/* Rejection Modal Dialog */}
      {rejectModalProvider && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-charcoal-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">Reject Food Provider</h3>
              </div>
              <button
                onClick={() => setRejectModalProvider(null)}
                className="text-charcoal-400 hover:text-charcoal-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-charcoal-600 leading-relaxed">
              You are rejecting verification for <strong className="text-charcoal-900">{rejectModalProvider.name}</strong>. The provider will retain their account but will be prevented from publishing food listings until approved.
            </p>

            <div>
              <label className="block text-xs font-bold text-charcoal-700 mb-1">
                Reason / Compliance Notes (Optional)
              </label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="e.g. Incomplete FSSAI license or unable to confirm commercial kitchen address."
                rows={3}
                className="w-full p-3 rounded-xl text-xs bg-offwhite border border-charcoal-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-charcoal-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalProvider(null)}
                className="px-4 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleVerifyProvider(rejectModalProvider._id, 'reject', rejectNotes)}
                disabled={actionLoading === rejectModalProvider._id}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === rejectModalProvider._id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
