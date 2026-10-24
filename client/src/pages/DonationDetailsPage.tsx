import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  fetchDonationById, 
  fetchMatchingNgos, 
  requestDonationPickup, 
  respondToDonationRequest, 
  updateDonationStatus,
  regeneratePickupOtp,
  verifyPickupOtp,
  type DonationItem, 
  type NgoMatchItem,
  type DonationRequestItem 
} from '../services/api';
import { 
  MapPin, 
  ShieldCheck, 
  HeartHandshake, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  Sparkles, 
  Loader2, 
  Send,
  Copy,
  RefreshCw
} from 'lucide-react';

import { DetailSkeleton } from '../components/SkeletonLoader';
import { useToast } from '../context/ToastContext';
import { DonationLifecycleTimeline } from '../components/DonationLifecycleTimeline';
import { NgoMatchCard } from '../components/NgoMatchCard';

export const DonationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [donation, setDonation] = useState<DonationItem | null>(null);
  const [requests, setRequests] = useState<DonationRequestItem[]>([]);
  const [matches, setMatches] = useState<NgoMatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Request modal state for NGOs
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [requestNotes, setRequestNotes] = useState<string>('Requesting pickup for evening community shelter distribution.');
  const [estimatedPickupTime, setEstimatedPickupTime] = useState<string>(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  // OTP input modal for status progression
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [otpTargetStatus, setOtpTargetStatus] = useState<string>('picked_up');
  const [enteredOtp, setEnteredOtp] = useState<string>('');

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detailsData = await fetchDonationById(id);
      setDonation(detailsData.donation);
      setRequests(detailsData.requests);

      // Fetch intelligent matches if donation is available/requested
      if (['available', 'requested'].includes(detailsData.donation.status)) {
        try {
          const matchData = await fetchMatchingNgos(id);
          setMatches(matchData.matches);
        } catch (matchErr) {
          console.warn('Match calculation notice:', matchErr);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load donation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!donation) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-charcoal-900">Donation Listing Not Found</h2>
        <Link to="/" className="inline-block px-4 py-2 bg-forest-900 text-white rounded-xl text-xs font-semibold">
          Return Home
        </Link>
      </div>
    );
  }

  const isProviderOwner = user && (
    (user.id === (donation.providerId?._id || donation.providerId)) ||
    (user.organization?.id === (donation.organizationId?._id || donation.organizationId))
  );

  const isAssignedNgo = user && user.role === 'ngo' && donation.assignedNgoId && (
    user.organization?.id === (donation.assignedNgoId?._id || donation.assignedNgoId)
  );

  // Check if current NGO has already submitted a request
  const myExistingRequest = requests.find((req) => {
    const reqNgoUserId = (req.ngoId as any)?._id || req.ngoId;
    const reqOrgId = (req.ngoOrganizationId as any)?._id || req.ngoOrganizationId;
    return (user?.id && reqNgoUserId === user.id) || (user?.organization?.id && reqOrgId === user.organization.id);
  });

  const isVerifiedNgo = user?.role === 'ngo' && user.organization?.verificationStatus === 'verified';
  const isPendingNgo = user?.role === 'ngo' && user.organization?.verificationStatus !== 'verified';
  const isEligibleNgo = user && user.role === 'ngo' && ['available', 'requested'].includes(donation.status) && !myExistingRequest && isVerifiedNgo;

  // Handle NGO request submission
  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    if (!user) {
      const msg = 'Please sign in with your verified NGO account to request food collection.';
      setError(msg);
      showToast('error', 'Authentication Required', msg);
      return;
    }

    if (user.role !== 'ngo') {
      const msg = 'Only verified NGO accounts can request food collections.';
      setError(msg);
      showToast('error', 'Access Denied', msg);
      return;
    }

    if (user.organization?.verificationStatus !== 'verified') {
      const msg = 'Your organization verification is pending administrator approval.';
      setError(msg);
      showToast('error', 'Verification Required', msg);
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      const res = await requestDonationPickup(id, { requestNotes, estimatedPickupTime });
      setSuccessMsg(res.message || 'Collection request submitted successfully! Awaiting provider confirmation.');
      showToast('success', 'Collection Request Sent', 'Provider has been notified and can review your request.');
      setShowRequestModal(false);
      await loadData();
    } catch (err: any) {
      const status = err.response?.status;
      let msg = err.response?.data?.message || 'Failed to submit request.';
      if (status === 401) {
        msg = 'Your session has expired. Please sign in again to submit a collection request.';
      } else if (status === 409) {
        msg = 'A collection request for this donation has already been submitted by your organization.';
      }
      setError(msg);
      showToast('error', 'Request Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Provider approval
  const handleRequestResponse = async (requestId: string, action: 'approve' | 'reject') => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await respondToDonationRequest(id, { requestId, action });
      const msg = action === 'approve' ? 'Request approved! Donation is now locked for pickup.' : 'Request rejected.';
      setSuccessMsg(msg);
      showToast('success', action === 'approve' ? 'Request Approved' : 'Request Rejected', msg);
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to respond to request.';
      setError(msg);
      showToast('error', 'Action Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Lifecycle progression
  const handleStatusProgression = async (nextStatus: string, otpRequired = false) => {
    if (otpRequired) {
      setOtpTargetStatus(nextStatus);
      setShowOtpModal(true);
      return;
    }

    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await updateDonationStatus(id, { nextStatus });
      const msg = `Status updated to ${nextStatus.replace('_', ' ')}.`;
      setSuccessMsg(msg);
      showToast('success', 'Status Advanced', msg);
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update status.';
      setError(msg);
      showToast('error', 'Status Update Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateOtp = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      await regeneratePickupOtp(id);
      showToast('success', 'OTP Regenerated', 'New 4-digit pickup code generated. Previous code invalidated.');
      setSuccessMsg('Pickup OTP regenerated successfully. Previous code has been invalidated.');
      await loadData();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to regenerate OTP.';
      setError(msg);
      showToast('error', 'Regeneration Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOtpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const cleanOtp = enteredOtp.trim();
    if (!/^\d{4}$/.test(cleanOtp)) {
      const err = 'Please enter a valid 4-digit numeric OTP.';
      setError(err);
      showToast('error', 'Invalid Format', err);
      return;
    }

    setActionLoading(true);
    setError(null);
    try {
      if (otpTargetStatus === 'picked_up') {
        await verifyPickupOtp(id, cleanOtp);
      } else {
        await updateDonationStatus(id, { nextStatus: otpTargetStatus, otp: cleanOtp });
      }
      const msg = `OTP verified! Status progressed to ${otpTargetStatus.replace('_', ' ')}.`;
      setSuccessMsg(msg);
      showToast('success', 'OTP Verified', msg);
      setShowOtpModal(false);
      setEnteredOtp('');
      await loadData();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      let displayMsg = serverMsg || 'OTP verification failed.';
      if (serverMsg?.includes('Invalid pickup OTP')) {
        displayMsg = 'Incorrect pickup OTP. Provider must share the 4-digit code.';
      } else if (serverMsg?.includes('expired') || serverMsg?.includes('Expired')) {
        displayMsg = 'Pickup OTP has expired. Please ask the food provider to regenerate a new code.';
      } else if (serverMsg?.includes('exceeded') || err.response?.status === 429) {
        displayMsg = 'Maximum OTP verification attempts exceeded. Please ask the provider to regenerate a new code.';
      } else if (serverMsg?.includes('consumed') || serverMsg?.includes('Already Used')) {
        displayMsg = 'Pickup OTP has already been verified and consumed.';
      }
      setError(displayMsg);
      showToast('error', 'Verification Error', displayMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Expiry calculation
  const diffMs = new Date(donation.collectionDeadline).getTime() - Date.now();
  const isExpired = diffMs <= 0;
  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
  const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Breadcrumb & Alerts */}
      <div className="flex items-center justify-between">
        <Link 
          to={user?.role === 'provider' ? '/provider' : user?.role === 'ngo' ? '/ngo' : '/'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-charcoal-600 hover:text-emerald-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500">
          Listing ID: #{donation._id.slice(-6)}
        </span>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:underline">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main Grid: Details (Left) + Smart Matching & Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Donation Information & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Card */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-sage/80 shadow-glass space-y-6 bg-white/95">
            
            {/* Title & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-sage/60">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-forest text-lime border border-lime/30">
                  {donation.foodCategory.replace('_', ' ')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold capitalize bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {donation.dietaryType.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400">Status:</span>
                <span className="px-3.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-forest text-lime border border-lime/30 shadow-xs">
                  {donation.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900 leading-tight tracking-tight">
                {donation.title}
              </h1>
              <p className="text-sm text-charcoal-600 mt-2 leading-relaxed">
                {donation.description || 'Prepared surplus batch in compliant containers.'}
              </p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-cream/50 border border-sage/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Meals</div>
                <div className="text-xl font-extrabold text-forest mt-1 font-display">{donation.quantityMeals} servings</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-offwhite border border-charcoal-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Estimated Weight</div>
                <div className="text-xl font-extrabold text-charcoal-900 mt-1 font-display">{donation.quantityKg} kg</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-offwhite border border-charcoal-200/80">
                <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Storage Required</div>
                <div className="text-xs font-bold text-forest-900 mt-2 capitalize">{donation.storageRequirement.replace('_', ' ')}</div>
              </div>

              <div className={`p-3.5 rounded-2xl border ${isExpired ? 'bg-rose-50 border-rose-200' : hoursLeft < 3 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Collection Limit</div>
                <div className={`text-xs font-bold mt-2 ${isExpired ? 'text-rose-700' : 'text-emerald-800'}`}>
                  {isExpired ? 'Expired' : `${hoursLeft}h ${minsLeft}m remaining`}
                </div>
              </div>
            </div>

            {/* Food Safety Specifications */}
            <div className="p-4 rounded-2xl bg-forest-950 text-white space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-lime-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Food Safety Audit Specifications</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-charcoal-300">
                <div>Prepared: <span className="text-white font-medium">{new Date(donation.preparationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span></div>
                <div>Deadline: <span className="text-white font-medium">{new Date(donation.collectionDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span></div>
                <div>Allergen Flags: <span className="text-lime-300 font-medium">{donation.allergens.length ? donation.allergens.join(', ') : 'None listed'}</span></div>
                <div>Insulation: <span className="text-white font-medium">Verified temperature control</span></div>
              </div>
            </div>

            {/* Location & Contact Information */}
            <div className="space-y-3 text-xs text-charcoal-700 pt-2">
              <h4 className="font-bold uppercase tracking-wider text-charcoal-500">Pickup Location</h4>
              <div className="p-4 rounded-2xl bg-offwhite border border-charcoal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-charcoal-900 text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>{donation.location.address}, {donation.location.city}</span>
                  </div>
                  <p className="text-charcoal-500 text-[11px]">
                    Instructions: {donation.pickupContact.pickupInstructions || 'Inquire at kitchen loading dock.'}
                  </p>
                </div>
                <div className="text-left sm:text-right text-xs">
                  <span className="font-semibold block text-charcoal-900">POC: {donation.pickupContact.name}</span>
                  <span className="text-charcoal-500 font-mono">{donation.pickupContact.phone}</span>
                </div>
              </div>
            </div>

            {/* OTP Secret Display (Only visible to Provider or Assigned NGO) */}
            {(donation.pickupOtp || donation.deliveryOtp) && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Security Verification PIN
                  </span>
                  <p className="text-xs text-emerald-950 font-medium mt-0.5">
                    Share this code with the driver on physical meal handover.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-4 py-2 rounded-xl bg-forest-900 text-lime-300 font-mono font-extrabold text-2xl shadow-sm tracking-wider">
                    {donation.pickupOtp}
                  </div>
                  <button
                    onClick={() => {
                      if (donation.pickupOtp) {
                        navigator.clipboard.writeText(donation.pickupOtp);
                        showToast('success', 'PIN Copied', `Security PIN ${donation.pickupOtp} copied to clipboard.`);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    title="Copy 4-digit PIN"
                    aria-label="Copy 4-digit PIN"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Enhanced Lifecycle & Stepper Audit Trail */}
          <DonationLifecycleTimeline 
            currentStatus={donation.status} 
            timeline={donation.timeline} 
          />

        </div>

        {/* RIGHT COLUMN: Matching Leaderboard & Action Panel */}
        <div className="space-y-6">
          
          {/* 1. Action Box for Stakeholders */}
          <div className="glass-card rounded-3xl p-6 border border-emerald-300 shadow-lg bg-gradient-to-b from-white to-emerald-50/30 space-y-4">
            <h3 className="text-base font-bold text-charcoal-900">Redistribution Coordination</h3>
            
            {/* Unauthenticated View: Prompt to sign in */}
            {!user && ['available', 'requested'].includes(donation.status) && (
              <div className="space-y-3 p-3.5 rounded-2xl bg-cream/70 border border-sage/60">
                <p className="text-xs text-charcoal-700 leading-relaxed">
                  Are you a verified non-profit or community kitchen? Sign in with your NGO account to submit a food collection request.
                </p>
                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <HeartHandshake className="w-4 h-4 text-lime-300" />
                  <span>Sign In as Verified NGO</span>
                </Link>
              </div>
            )}

            {/* NGO View: Already Submitted Request */}
            {user?.role === 'ngo' && myExistingRequest && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Collection Request Submitted</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Your request is currently {myExistingRequest.status}. The food provider will review and confirm pickup coordination.
                </p>
              </div>
            )}

            {/* NGO View: Pending Verification */}
            {user?.role === 'ngo' && isPendingNgo && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Verification Required</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Your NGO account is pending administrative verification. Collection requests can only be placed once verified.
                </p>
              </div>
            )}

            {/* NGO View: Can submit collection request */}
            {isEligibleNgo && (
              <div className="space-y-3">
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Your organization is eligible to claim this surplus batch. Submit a collection request with your planned pickup time.
                </p>
                <button
                  onClick={() => setShowRequestModal(true)}
                  disabled={actionLoading || isExpired}
                  className="w-full py-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-xs shadow-md shadow-forest-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <HeartHandshake className="w-4 h-4 text-lime-300" />
                  <span>Request Food Collection</span>
                </button>
              </div>
            )}

            {/* Provider View: Requests pending review */}
            {isProviderOwner && requests.length > 0 && donation.status === 'requested' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  {requests.length} NGO collection request pending your review.
                </div>
                {requests.map(req => (
                  <div key={req._id} className="p-3.5 rounded-2xl bg-white border border-charcoal-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-charcoal-900">{req.ngoOrganizationId?.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800">
                        {req.matchScore}% Match
                      </span>
                    </div>
                    <p className="text-[11px] text-charcoal-600 italic">"{req.requestNotes}"</p>
                    <div className="text-[10px] text-charcoal-500">
                      Est. Pickup: {new Date(req.estimatedPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="pt-2 flex gap-2">
                      <button
                        onClick={() => handleRequestResponse(req._id, 'approve')}
                        disabled={actionLoading}
                        className="flex-1 py-1.5 rounded-lg bg-forest-900 text-white text-[11px] font-bold hover:bg-forest-800"
                      >
                        Approve & Lock
                      </button>
                      <button
                        onClick={() => handleRequestResponse(req._id, 'reject')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg border border-charcoal-200 text-charcoal-600 text-[11px] hover:bg-charcoal-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Provider View: Secure Pickup OTP Handover Box */}
            {isProviderOwner && ['accepted', 'pickup_scheduled'].includes(donation.status) && (
              <div className="p-4 rounded-2xl bg-forest-950 text-white space-y-3 border border-forest-800 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-lime-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Secure Handover OTP</span>
                  </span>
                  <button
                    onClick={handleRegenerateOtp}
                    disabled={actionLoading}
                    className="text-[11px] text-charcoal-300 hover:text-white flex items-center gap-1 font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${actionLoading ? 'animate-spin' : ''}`} />
                    <span>Regenerate Code</span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-forest-900/60 p-3 rounded-xl border border-forest-800">
                  <div>
                    <span className="text-[10px] text-charcoal-300 uppercase block font-semibold">Share with NGO Collector:</span>
                    <span className="font-mono font-extrabold text-2xl tracking-widest text-lime-400">
                      {donation.pickupOtp || '----'}
                    </span>
                  </div>
                  {donation.pickupOtp && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(donation.pickupOtp!);
                        showToast('info', 'Code Copied', 'Pickup OTP copied to clipboard.');
                      }}
                      className="p-2 rounded-lg bg-forest-800 hover:bg-forest-700 text-charcoal-200 text-xs cursor-pointer"
                      title="Copy OTP"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-charcoal-300 leading-relaxed">
                  <strong>Share OTP with Collector:</strong> Provide this 4-digit code to the verified NGO driver when they arrive to take possession of the meals.
                </p>
              </div>
            )}

            {/* Progression for Assigned NGO / Driver */}
            {isAssignedNgo && donation.status === 'accepted' && (
              <div className="space-y-2">
                <p className="text-xs text-charcoal-600">Donation approved! Vehicle dispatched or driver arrived?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStatusProgression('pickup_scheduled')}
                    disabled={actionLoading}
                    className="py-2.5 rounded-xl border border-charcoal-300 text-charcoal-700 text-xs font-bold hover:bg-charcoal-50 cursor-pointer"
                  >
                    Schedule Pickup
                  </button>
                  <button
                    onClick={() => handleStatusProgression('picked_up', true)}
                    disabled={actionLoading}
                    className="py-2.5 rounded-xl bg-forest-900 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-lime-400" />
                    <span>Enter Pickup OTP</span>
                  </button>
                </div>
              </div>
            )}

            {isAssignedNgo && donation.status === 'pickup_scheduled' && (
              <div className="space-y-2">
                <p className="text-xs text-charcoal-600">Driver arrived at kitchen? Enter provider's 4-digit OTP to confirm collection.</p>
                <button
                  onClick={() => handleStatusProgression('picked_up', true)}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-forest-900 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5 text-lime-400" />
                  <span>Enter Pickup OTP</span>
                </button>
              </div>
            )}

            {(isAssignedNgo || isProviderOwner) && donation.status === 'picked_up' && (
              <div className="space-y-2">
                <p className="text-xs text-charcoal-600">Meals in transit. Arrived at community shelter?</p>
                <button
                  onClick={() => handleStatusProgression('delivered')}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Delivery to Shelter</span>
                </button>
              </div>
            )}

            {(isAssignedNgo || isProviderOwner) && donation.status === 'delivered' && (
              <div className="space-y-2">
                <button
                  onClick={() => handleStatusProgression('completed')}
                  disabled={actionLoading}
                  className="w-full py-2.5 rounded-xl bg-forest-900 text-white text-xs font-bold shadow-sm"
                >
                  Close & Archive Record
                </button>
              </div>
            )}

            {donation.status === 'completed' && (
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Rescue Cycle 100% Completed</span>
              </div>
            )}
          </div>

          {/* 2. 5-Factor Intelligent Matching Leaderboard */}
          <div className="glass-card rounded-3xl p-6 border border-charcoal-200 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-charcoal-900">5-Factor Recommendation Leaderboard</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                {matches.length} Verified
              </span>
            </div>

            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Scored via 30% Urgency, 25% Distance, 20% Capacity, 15% Fleet Availability, and 10% Storage Compatibility.
            </p>

            {matches.length === 0 ? (
              <div className="p-4 rounded-2xl bg-charcoal-50 text-center text-xs text-charcoal-500">
                {isExpired ? 'Donation expired. Automated matching locked.' : 'No verified NGOs currently match the strict capacity/distance criteria.'}
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match, idx) => (
                  <NgoMatchCard
                    key={match.ngoId}
                    match={match}
                    rank={idx + 1}
                  />
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* NGO Request Collection Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full bg-white space-y-4 border border-emerald-300 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-900 text-lime-400 flex items-center justify-center">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-charcoal-900">Confirm Collection Request</h3>
                <p className="text-xs text-charcoal-500">{donation.title}</p>
              </div>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Estimated Arrival & Pickup Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={estimatedPickupTime}
                  min={new Date().toISOString().slice(0, 16)}
                  max={new Date(donation.collectionDeadline).toISOString().slice(0, 16)}
                  onChange={(e) => setEstimatedPickupTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs sm:text-sm bg-white font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-charcoal-700">
                    Collection Logistics Notes
                  </label>
                  <span className="text-[10px] text-charcoal-400">{requestNotes.length}/500</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="Provide vehicle details, driver name, or storage equipment notes..."
                  className="w-full p-3 rounded-xl border border-charcoal-200 text-xs focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-600 hover:bg-charcoal-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 shadow-sm flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-sm w-full bg-white space-y-4 border border-emerald-300 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-forest-900 text-lime-400 flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-charcoal-900">Enter Pickup Handover OTP</h3>
              <p className="text-xs text-charcoal-500 mt-1">
                Ask the food provider for the 4-digit confirmation code displayed on their dashboard.
              </p>
            </div>

            <form onSubmit={handleOtpVerifySubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={4}
                  value={enteredOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setEnteredOtp(val);
                    if (error) setError(null);
                  }}
                  placeholder="0000"
                  className="w-36 mx-auto text-center font-mono font-extrabold text-3xl tracking-widest py-3 border-2 border-emerald-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50/20"
                />
                <span className="block text-[11px] text-charcoal-400 mt-1">4-digit numeric code</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowOtpModal(false);
                    setError(null);
                  }}
                  className="flex-1 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold hover:bg-charcoal-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || enteredOtp.length !== 4}
                  className="flex-1 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {actionLoading ? 'Verifying...' : 'Validate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
