import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  fetchDonations, 
  updateNgoCapacity, 
  updateDonationStatus,
  verifyPickupOtp,
  fetchNgoMyRequests,
  requestDonationPickup,
  type DonationItem 
} from '../services/api';
import { 
  HeartHandshake, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  Key, 
  Sparkles, 
  Sliders,
  AlertCircle,
  Inbox,
  Send,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useDashboardRefresh } from '../hooks/useDashboardRefresh';
import { DashboardRefreshBar } from '../components/DashboardRefreshBar';

export interface DonationEligibility {
  eligible: boolean;
  reason: string;
}

export const checkNgoDonationEligibility = (donation: DonationItem, user: any): DonationEligibility => {
  if (!user || user.role !== 'ngo') {
    return { eligible: false, reason: 'Sign in with a registered NGO account to request pickup' };
  }
  const org = user.organization;
  if (!org) {
    return { eligible: false, reason: 'NGO organization record not linked to account' };
  }
  if (org.verificationStatus !== 'verified') {
    return { eligible: false, reason: 'Pending verification: Administrator approval required before requesting surplus' };
  }
  const now = Date.now();
  const deadline = new Date(donation.collectionDeadline).getTime();
  if (deadline <= now || donation.status === 'expired') {
    return { eligible: false, reason: 'Collection deadline has passed' };
  }
  const capacity = org.capacity?.currentAvailableCapacity ?? 0;
  if (capacity < donation.quantityMeals) {
    return { 
      eligible: false, 
      reason: `Insufficient capacity: listing requires ${donation.quantityMeals} meals (your current available capacity is ${capacity} meals)` 
    };
  }
  if ((donation.storageRequirement === 'refrigerated' || donation.storageRequirement === 'frozen') && !org.capacity?.hasRefrigeration) {
    return { 
      eligible: false, 
      reason: `Cold storage mismatch: listing requires ${donation.storageRequirement} storage, but your facility lacks commercial refrigeration` 
    };
  }
  if (donation.storageRequirement === 'hot_insulated' && !org.capacity?.hasWarmStorage) {
    return { 
      eligible: false, 
      reason: 'Hot holding mismatch: listing requires hot insulated holding equipment' 
    };
  }
  if (org.compatibleCategories && org.compatibleCategories.length > 0 && !org.compatibleCategories.includes(donation.foodCategory)) {
    return { 
      eligible: false, 
      reason: `Category mismatch: ${donation.foodCategory.replace('_', ' ')} is not in your accepted categories` 
    };
  }
  return { 
    eligible: true, 
    reason: `Eligible: Your facility satisfies capacity (${capacity} available >= ${donation.quantityMeals} meals), verification, and storage requirements` 
  };
};

export const NgoDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [assignedDonations, setAssignedDonations] = useState<DonationItem[]>([]);
  const [nearbyAvailable, setNearbyAvailable] = useState<DonationItem[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [surplusFilterTab, setSurplusFilterTab] = useState<'all' | 'eligible'>('all');
  
  // Capacity Modal
  const [showCapacityModal, setShowCapacityModal] = useState<boolean>(false);
  const [capacityMeals, setCapacityMeals] = useState<number>(user?.organization?.capacity?.currentAvailableCapacity || 140);
  const [maxMeals, setMaxMeals] = useState<number>(user?.organization?.capacity?.maxMealsPerDay || 200);

  // OTP Modal
  const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
  const [activeDonationForOtp, setActiveDonationForOtp] = useState<DonationItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('picked_up');
  const [enteredOtp, setEnteredOtp] = useState<string>('');

  // Request Modal
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [selectedDonationForRequest, setSelectedDonationForRequest] = useState<DonationItem | null>(null);
  const [requestNotes, setRequestNotes] = useState<string>('Requesting pickup for community shelter distribution.');
  const [estimatedPickupTime, setEstimatedPickupTime] = useState<string>(
    new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)
  );

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [assignedRes, availRes, reqsRes] = await Promise.all([
        fetchDonations({ assignedToMe: 'true' }),
        fetchDonations({ status: 'available' }),
        fetchNgoMyRequests().catch(() => ({ count: 0, requests: [] })),
      ]);
      setAssignedDonations(assignedRes.donations || []);
      setNearbyAvailable(availRes.donations || []);
      setMyRequests(reqsRes.requests || []);
    } catch (err) {
      console.error('Error loading NGO dashboard:', err);
    }
  }, []);

  const {
    isRefreshing,
    autoRefresh,
    setAutoRefresh,
    lastUpdated,
    refreshNow,
  } = useDashboardRefresh({
    onRefresh: loadData,
    intervalSeconds: 15,
    defaultAutoRefresh: true,
  });

  useEffect(() => {
    loadData();
    const handleDonationUpdate = () => {
      loadData();
    };
    window.addEventListener('foodbridge:donations:updated', handleDonationUpdate);
    return () => {
      window.removeEventListener('foodbridge:donations:updated', handleDonationUpdate);
    };
  }, [loadData]);

  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await updateNgoCapacity({
        currentAvailableCapacity: capacityMeals,
        maxMealsPerDay: maxMeals,
      });
      setSuccessMsg('Intake capacity updated successfully!');
      showToast('success', 'Capacity Updated', `Intake capacity updated to ${capacityMeals} meals.`);
      setShowCapacityModal(false);
    } catch (err) {
      setErrorMsg('Failed to update capacity.');
      showToast('error', 'Update Failed', 'Failed to update capacity.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDonationForOtp) return;

    const cleanOtp = enteredOtp.trim();
    if (!/^\d{4}$/.test(cleanOtp)) {
      const err = 'Please enter a valid 4-digit numeric OTP.';
      setErrorMsg(err);
      showToast('error', 'Invalid Format', err);
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    try {
      if (targetStatus === 'picked_up') {
        await verifyPickupOtp(activeDonationForOtp._id, cleanOtp);
        setSuccessMsg('Pickup verified successfully! Meals are now marked as Picked Up.');
        showToast('success', 'Pickup Confirmed', 'Meals transferred and verified. In transit to distribution center.');
      } else {
        await updateDonationStatus(activeDonationForOtp._id, {
          nextStatus: targetStatus,
          otp: cleanOtp,
        });
        setSuccessMsg(`Status updated to ${targetStatus.replace('_', ' ')}!`);
        showToast('success', 'Status Updated', `Donation marked as ${targetStatus.replace('_', ' ')}.`);
      }
      setShowOtpModal(false);
      setEnteredOtp('');
      await loadData();
    } catch (err: any) {
      const serverMsg = err.response?.data?.message;
      let displayMsg = serverMsg || 'Verification failed. Please check the code and try again.';
      if (serverMsg?.includes('Invalid pickup OTP')) {
        displayMsg = 'Incorrect pickup OTP. Please ask the food provider for the 4-digit code displayed on their dashboard.';
      } else if (serverMsg?.includes('expired') || serverMsg?.includes('Expired')) {
        displayMsg = 'This pickup OTP has expired. Please ask the provider to regenerate a new code.';
      } else if (serverMsg?.includes('exceeded') || serverMsg?.includes('Rate Limited') || err.response?.status === 429) {
        displayMsg = 'Maximum verification attempts exceeded. Please ask the provider to regenerate a new code.';
      } else if (serverMsg?.includes('consumed') || serverMsg?.includes('Already Used')) {
        displayMsg = 'This pickup OTP has already been verified and consumed.';
      }
      setErrorMsg(displayMsg);
      showToast('error', 'Verification Failed', displayMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRequestModal = (donation: DonationItem) => {
    setSelectedDonationForRequest(donation);
    setErrorMsg(null);

    // Intelligently compute default pickup time: 1 hour from now or halfway before collection deadline
    const now = Date.now();
    const deadline = new Date(donation.collectionDeadline).getTime();
    let initialPickupMs = now + 60 * 60 * 1000;
    if (deadline > now && initialPickupMs >= deadline) {
      initialPickupMs = now + Math.max(10 * 60 * 1000, Math.floor((deadline - now) / 2));
    }
    // Format to local YYYY-MM-DDTHH:mm for input[type="datetime-local"]
    const localDate = new Date(initialPickupMs - new Date().getTimezoneOffset() * 60000);
    setEstimatedPickupTime(localDate.toISOString().slice(0, 16));
    setShowRequestModal(true);
  };

  const handleSubmitCollectionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonationForRequest) return;

    setActionLoading(true);
    setErrorMsg(null);
    try {
      await requestDonationPickup(selectedDonationForRequest._id, {
        requestNotes,
        estimatedPickupTime: new Date(estimatedPickupTime).toISOString(),
      });
      showToast('success', 'Collection Requested', `Your collection request for "${selectedDonationForRequest.title}" has been submitted.`);
      setShowRequestModal(false);
      await loadData();
    } catch (err: any) {
      const serverErr = err.response?.data?.error;
      const serverMsg = err.response?.data?.message;

      let displayMsg = serverMsg || 'Failed to submit collection request.';

      // Requirement 4: If NGO approval is required, display "NGO verification pending" instead of a misleading role error
      if (serverErr === 'Verification Required' || serverMsg?.includes('NGO verification pending') || serverMsg?.includes('verified by an administrator')) {
        displayMsg = 'NGO verification pending. Administrator approval is required before requesting food collections.';
      } else if (err.response?.status === 409) {
        displayMsg = 'You have already submitted an active collection request for this donation.';
      } else if (err.response?.status === 403 && serverMsg?.includes('Requires one of the following roles')) {
        displayMsg = 'Access denied. Please ensure you are signed in with your registered NGO account.';
      }

      setErrorMsg(displayMsg);
      showToast('error', serverErr === 'Verification Required' ? 'Verification Pending' : 'Request Failed', displayMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const isVerified = user?.organization?.verificationStatus === 'verified';
  const availableMeals = user?.organization?.capacity?.currentAvailableCapacity || 140;
  const maxCapacity = user?.organization?.capacity?.maxMealsPerDay || 200;
  const capacityPct = Math.round((availableMeals / maxCapacity) * 100);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Welcome & Verification Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-sage/80 shadow-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-gradient-to-r from-white via-cream/50 to-emerald-50/30">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-bold border border-forest/15">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
              <span>NGO Recipient Portal</span>
            </span>

            {isVerified ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Partner</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-apricot-100 text-apricot-900 text-xs font-bold border border-apricot-300">
                <Clock className="w-3.5 h-3.5 text-apricot-700" />
                <span>Verification Pending</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900 tracking-tight">
            <span className="text-forest">{user?.organization?.name || 'Hope Community Shelter'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500">
            {user?.name} • Service Radius: 25 km • Cold Storage Equipped
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <DashboardRefreshBar
            isRefreshing={isRefreshing}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={setAutoRefresh}
            lastUpdated={lastUpdated}
            onRefreshNow={refreshNow}
          />

          {/* Capacity Quick Meter */}
          <div className="p-4 rounded-2xl bg-white border border-sage/90 text-xs space-y-2 min-w-[240px] shadow-glass">
            <div className="flex justify-between items-center font-bold text-charcoal-900">
              <span className="text-forest font-semibold">Intake Capacity</span>
              <button 
                onClick={() => setShowCapacityModal(true)}
                className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold text-[11px] transition-colors"
              >
                <Sliders className="w-3 h-3" /> Adjust
              </button>
            </div>
            <div className="w-full bg-cream-300 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-forest via-emerald-500 to-lime h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${capacityPct}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-charcoal-500 font-medium">
              <span>Available: <strong className="text-forest">{availableMeals} meals</strong></span>
              <span>Max: {maxCapacity}</span>
            </div>
          </div>
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

      {/* Submitted Collection Requests Section */}
      <div className="glass-card rounded-3xl p-6 border border-sage/80 shadow-glass space-y-4 bg-white/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-charcoal-900">My Collection Requests</h2>
          </div>
          <span className="text-xs font-bold text-charcoal-500">
            {myRequests.length} Total ({myRequests.filter(r => r.status === 'pending').length} Pending Approval)
          </span>
        </div>

        {myRequests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-cream-50 border border-sage/40 text-center text-xs text-charcoal-500">
            You have not submitted any collection requests yet. Claim surplus food listings below to schedule pickups.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myRequests.map((req) => {
              const donation = req.donationId;
              const isApproved = req.status === 'approved';
              const isPending = req.status === 'pending';

              return (
                <div key={req._id} className="p-4 rounded-2xl bg-white border border-charcoal-200 shadow-xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-charcoal-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : isPending
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}>
                        {isApproved ? 'Approved — Ready for Pickup' : isPending ? 'Pending Provider Review' : 'Declined'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-charcoal-900 line-clamp-1">
                      {donation?.title || 'Food Donation'}
                    </h4>

                    <div className="text-xs text-charcoal-500">
                      <span>{donation?.quantityMeals || 0} meals</span>
                      {donation?.organizationId?.name && (
                        <span> • Provider: {donation.organizationId.name}</span>
                      )}
                    </div>

                    {req.estimatedPickupTime && (
                      <div className="text-[11px] text-charcoal-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        <span>Pickup: {new Date(req.estimatedPickupTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    )}
                  </div>

                  {isApproved && donation && ['accepted', 'pickup_scheduled'].includes(donation.status) && (
                    <button
                      onClick={() => {
                        setActiveDonationForOtp(donation);
                        setTargetStatus('picked_up');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setShowOtpModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-lime-300" />
                      <span>Driver Arrived: Enter Pickup OTP</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Active Pickups & Nearby Match Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMN 1: Active Pickups Assigned to this NGO */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-charcoal-900">Active Collections & Pickups</h2>
            </div>
            <span className="text-xs font-bold text-charcoal-500">{assignedDonations.length} Active</span>
          </div>

          {assignedDonations.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center space-y-3 border border-charcoal-200 text-xs text-charcoal-500">
              <Truck className="w-8 h-8 text-charcoal-400 mx-auto" />
              <p>No active collections currently in progress.</p>
              <Link to="/donations" className="text-emerald-700 font-bold hover:underline inline-block">
                Browse available surplus batches ➔
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedDonations.map(donation => (
                <div 
                  key={donation._id}
                  className="glass-card rounded-2xl p-5 border border-charcoal-200 space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded-md">
                      {donation.foodCategory.replace('_', ' ')}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-forest text-white">
                      {donation.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-charcoal-900">
                    {donation.title}
                  </h3>

                  <div className="text-xs text-charcoal-600 flex items-center gap-3">
                    <span>{donation.quantityMeals} meals ({donation.quantityKg} kg)</span>
                    <span>•</span>
                    <span className="capitalize">{donation.storageRequirement.replace('_', ' ')}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-offwhite border border-charcoal-200/80 text-xs text-charcoal-600 space-y-1">
                    <div className="font-semibold text-charcoal-900 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{donation.location.address}, {donation.location.city}</span>
                    </div>
                    <div>Contact: {donation.pickupContact.name} ({donation.pickupContact.phone})</div>
                  </div>

                  {/* Actions depending on status */}
                  <div className="pt-2 flex items-center gap-2">
                    {['accepted', 'pickup_scheduled'].includes(donation.status) && (
                      <button
                        onClick={() => {
                          setActiveDonationForOtp(donation);
                          setTargetStatus('picked_up');
                          setErrorMsg(null);
                          setSuccessMsg(null);
                          setShowOtpModal(true);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-lime-300" />
                        <span>Driver Arrived: Enter Pickup OTP</span>
                      </button>
                    )}

                    {donation.status === 'picked_up' && (
                      <button
                        onClick={() => {
                          setActiveDonationForOtp(donation);
                          setTargetStatus('delivered');
                          setShowOtpModal(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Meals Arrived: Confirm Drop-off</span>
                      </button>
                    )}

                    <Link
                      to={`/donations/${donation._id}`}
                      className="px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-50"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUMN 2: Available Surplus Feed & Eligibility Intelligence */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-charcoal-900">Available Surplus Feed</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {nearbyAvailable.length} available
              </span>
            </div>
            
            {/* Filter Toggle: All vs Eligible */}
            <div className="flex items-center bg-charcoal-100 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSurplusFilterTab('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  surplusFilterTab === 'all'
                    ? 'bg-white text-forest-900 shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                All Listings ({nearbyAvailable.length})
              </button>
              <button
                type="button"
                onClick={() => setSurplusFilterTab('eligible')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  surplusFilterTab === 'eligible'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-charcoal-600 hover:text-charcoal-900'
                }`}
              >
                Eligible Only ({
                  nearbyAvailable.filter(d => checkNgoDonationEligibility(d, user).eligible).length
                })
              </button>
            </div>
          </div>

          {nearbyAvailable.length === 0 ? (
            <div className="glass-card rounded-3xl p-8 text-center space-y-2 border border-charcoal-200 text-xs text-charcoal-500">
              <p>No surplus food donations currently available in the system.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[750px] overflow-y-auto pr-1">
              {nearbyAvailable
                .filter(d => surplusFilterTab === 'all' || checkNgoDonationEligibility(d, user).eligible)
                .map((donation) => {
                  const eligibility = checkNgoDonationEligibility(donation, user);
                  const myReq = myRequests.find((r) => {
                    const dId = (r.donationId as any)?._id || r.donationId;
                    return dId?.toString() === donation._id.toString();
                  });

                  return (
                    <div 
                      key={donation._id}
                      className={`glass-card rounded-2xl p-5 border transition-all shadow-xs space-y-3 ${
                        eligibility.eligible 
                          ? 'border-emerald-300 hover:border-emerald-500 bg-white' 
                          : 'border-amber-200 hover:border-amber-300 bg-amber-50/10'
                      }`}
                    >
                      {/* Top Header: Category & Meals */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded-md">
                          {donation.foodCategory.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700">
                            {donation.quantityMeals} meals
                          </span>
                          <span className="text-[11px] text-charcoal-400">
                            ({donation.quantityKg} kg)
                          </span>
                        </div>
                      </div>

                      {/* Title & Provider */}
                      <div>
                        <h3 className="text-base font-bold text-charcoal-900">
                          {donation.title}
                        </h3>
                        <p className="text-xs text-charcoal-500 mt-0.5">
                          Offered by {(donation.organizationId as any)?.name || 'Verified Kitchen'} • {donation.location.city}
                        </p>
                      </div>

                      {/* Storage & Deadlines */}
                      <div className="text-xs text-charcoal-600 flex flex-wrap items-center justify-between gap-1 pt-1 border-t border-charcoal-100">
                        <span className="capitalize font-medium text-[11px] text-charcoal-600 bg-charcoal-100 px-2 py-0.5 rounded">
                          Storage: {donation.storageRequirement.replace('_', ' ')}
                        </span>
                        <span className="font-semibold text-rose-600 flex items-center gap-1 text-[11px]">
                          <Clock className="w-3.5 h-3.5" />
                          Collection deadline active
                        </span>
                      </div>

                      {/* Real-time Eligibility Status Box */}
                      {eligibility.eligible ? (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>100% Eligible for Intake</span>
                          </div>
                          <p className="text-[11px] text-emerald-700 leading-tight">
                            {eligibility.reason}
                          </p>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Not Eligible for Intake</span>
                          </div>
                          <p className="text-[11px] text-amber-700 leading-tight">
                            {eligibility.reason}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        {myReq ? (
                          <div className="flex-1 py-2 px-3 rounded-xl bg-charcoal-100 text-charcoal-700 text-xs font-bold text-center border border-charcoal-200">
                            Request Pending ({myReq.status.toUpperCase()})
                          </div>
                        ) : eligibility.eligible ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRequestModal(donation)}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Request Collection</span>
                          </button>
                        ) : null}

                        <Link
                          to={`/donations/${donation._id}`}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                            eligibility.eligible && !myReq
                              ? 'border-charcoal-200 text-charcoal-700 hover:bg-charcoal-50'
                              : 'flex-1 bg-forest-900 hover:bg-forest-800 text-white'
                          }`}
                        >
                          <span>5-Factor Match & Details</span>
                        </Link>
                      </div>

                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>

      {/* Update Capacity Modal */}
      {showCapacityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-sm w-full bg-white space-y-4 border border-emerald-300 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-charcoal-900">Update Intake Capacity</h3>
            <p className="text-xs text-charcoal-500">
              The matching algorithm uses your available daily meals capacity to prevent over-allocation.
            </p>

            <form onSubmit={handleUpdateCapacity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Current Available Meals Today
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={capacityMeals}
                  onChange={(e) => setCapacityMeals(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Maximum Daily Facility Capacity
                </label>
                <input
                  type="number"
                  min="10"
                  value={maxMeals}
                  onChange={(e) => setMaxMeals(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCapacityModal(false)}
                  className="flex-1 py-2 rounded-xl border border-charcoal-200 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800"
                >
                  Save Capacity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK 4: OTP Input Modal for NGO Driver */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-sm w-full bg-white space-y-4 border border-emerald-300 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center mx-auto shadow-xs">
              <Key className="w-6 h-6 text-white" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-charcoal-900">
                {targetStatus === 'picked_up' ? 'Enter Pickup OTP' : 'Enter Handover OTP'}
              </h3>
              <p className="text-xs text-charcoal-500 mt-1">
                {targetStatus === 'picked_up'
                  ? 'Ask the food provider for the 4-digit code displayed on their dashboard upon meal inspection.'
                  : 'Enter the 4-digit code provided by the kitchen manager to confirm physical transfer.'}
              </p>
              {activeDonationForOtp && (
                <div className="mt-2 text-xs font-semibold text-charcoal-700 bg-offwhite py-1 px-3 rounded-lg border border-charcoal-200">
                  {activeDonationForOtp.title} ({activeDonationForOtp.quantityMeals} meals)
                </div>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
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
                    if (errorMsg) setErrorMsg(null);
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
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold hover:bg-charcoal-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || enteredOtp.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {actionLoading ? 'Verifying...' : 'Validate Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Collection Modal */}
      {showRequestModal && selectedDonationForRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-md w-full bg-white space-y-4 border border-emerald-300 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-charcoal-900">Request Food Collection</h3>
                <p className="text-xs text-charcoal-500">
                  Notify the food provider that your organization is ready to receive and distribute this surplus.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-offwhite border border-charcoal-200 space-y-1 text-xs">
              <div className="font-bold text-charcoal-900">{selectedDonationForRequest.title}</div>
              <div className="text-emerald-700 font-semibold">{selectedDonationForRequest.quantityMeals} meals • {selectedDonationForRequest.location.city}</div>
              <div className="text-charcoal-500 text-[11px]">Storage: {selectedDonationForRequest.storageRequirement.replace('_', ' ')}</div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCollectionRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Estimated Pickup Arrival Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={estimatedPickupTime}
                  onChange={(e) => setEstimatedPickupTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Collection Notes & Transport Vehicle
                </label>
                <textarea
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Volunteer van arriving with insulated food crates for rapid transit."
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    setErrorMsg(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold hover:bg-charcoal-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
