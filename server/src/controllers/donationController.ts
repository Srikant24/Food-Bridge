import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Donation, IDonation, DonationStatus } from '../models/Donation';
import { DonationRequest } from '../models/DonationRequest';
import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { CreateDonationSchema } from '../validators/authValidator';
import { findMatchingNgosForDonation, calculateHaversineDistanceKm, calculateDistanceScore } from '../services/matchingService';
import { NotificationService } from '../services/notificationService';
import {
  generateSecureOtp,
  hashOtp,
  verifyOtpHash,
  encryptOtp,
  decryptOtp,
} from '../utils/otpCrypto';
import { normalizeRole } from '../utils/roleUtils';

/**
 * Helper to compute OTP expiration based on configurable OTP_EXPIRY_MINUTES (default: 15 minutes)
 */
export const getOtpExpiryDate = (): Date => {
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '15', 10);
  return new Date(Date.now() + expiryMinutes * 60 * 1000);
};

/**
 * Robustly extracts an ObjectId string from a populated doc, ObjectId, string, or undefined/null.
 * Guaranteed never to throw TypeError: Cannot read properties of null (reading 'toString').
 */
export const getSafeIdString = (val: any): string | null => {
  if (!val) return null;
  if (typeof val === 'string') return val.trim();
  if (val._id) {
    if (typeof val._id === 'string') return val._id.trim();
    if (typeof val._id.toString === 'function') return val._id.toString();
  }
  if (typeof val.toString === 'function') {
    const str = val.toString();
    if (str && str !== '[object Object]') return str;
  }
  return null;
};

export const createDonation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const userRole = normalizeRole(req.user.role);
    if (userRole !== 'provider' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Only food providers and administrators can list donations' });
      return;
    }

    // Provider Verification Enforcement (Requirement 7 & 8)
    if (userRole === 'provider') {
      const org = req.user.organizationId as any;
      const status = org?.verificationStatus;
      if (status === 'rejected') {
        res.status(403).json({
          error: 'Verification Rejected',
          message: 'Your food provider application was not approved by platform administrators. Surplus food listings cannot be published.',
          verificationStatus: 'rejected',
        });
        return;
      }
      if (status !== 'approved' && status !== 'verified') {
        res.status(403).json({
          error: 'Verification Required',
          message: 'Your food provider account is pending administrator verification. Surplus food listings can only be published once approved.',
          verificationStatus: status || 'pending',
        });
        return;
      }
    }

    const parseResult = CreateDonationSchema.safeParse(req.body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.errors.map(e => e.message).join('. ');
      res.status(400).json({ 
        error: 'Validation Error', 
        message: fieldErrors || 'Validation failed. Please verify required fields.', 
        details: parseResult.error.format() 
      });
      return;
    }

    const data = parseResult.data;
    const now = new Date();
    const deadline = new Date(data.collectionDeadline);
    const prepTime = new Date(data.preparationTime);

    // Date validity checks
    if (isNaN(deadline.getTime())) {
      res.status(400).json({
        error: 'Invalid Date',
        message: 'Collection deadline is not a valid date or timestamp.'
      });
      return;
    }

    if (isNaN(prepTime.getTime())) {
      res.status(400).json({
        error: 'Invalid Date',
        message: 'Food preparation time is not a valid date or timestamp.'
      });
      return;
    }

    // Food Safety & Timestamp Checks
    if (deadline.getTime() <= now.getTime()) {
      res.status(400).json({ 
        error: 'Safety Constraint Violation', 
        message: 'Collection deadline must be in the future. Expired food cannot be listed.' 
      });
      return;
    }

    if (deadline.getTime() <= prepTime.getTime()) {
      res.status(400).json({
        error: 'Safety Constraint Violation',
        message: 'Collection deadline cannot be earlier than food preparation time.'
      });
      return;
    }

    // Preparation time should not be in the future (allowing slight 15 min clock skew)
    if (prepTime.getTime() > now.getTime() + 15 * 60 * 1000) {
      res.status(400).json({
        error: 'Safety Constraint Violation',
        message: 'Food preparation time cannot be set in the future.'
      });
      return;
    }

    // Food Safety: Cooked meals held at ambient room temperature must not exceed 6 hours from preparation
    if (data.foodCategory === 'cooked_meals' && data.storageRequirement === 'room_temperature') {
      const hoursSincePrep = (deadline.getTime() - prepTime.getTime()) / (1000 * 60 * 60);
      if (hoursSincePrep > 6) {
        res.status(400).json({
          error: 'Safety Constraint Violation',
          message: 'Cooked meals stored at room temperature cannot have a collection window exceeding 6 hours from preparation. Please use hot insulated or refrigerated storage for longer durations.'
        });
        return;
      }
    }

    const org = req.user.organizationId as any;
    const coordinates: [number, number] = data.coordinates || (org?.location?.coordinates) || [77.2090, 28.6139];

    const pickupOtp = generateSecureOtp();
    const deliveryOtp = generateSecureOtp();

    const donation = new Donation({
      title: data.title,
      description: data.description || '',
      foodCategory: data.foodCategory,
      dietaryType: data.dietaryType,
      quantityMeals: data.quantityMeals,
      quantityKg: data.quantityKg,
      preparationTime: prepTime,
      collectionDeadline: deadline,
      storageRequirement: data.storageRequirement,
      allergens: data.allergens || [],
      location: {
        type: 'Point',
        coordinates,
        address: data.address,
        city: data.city,
      },
      providerId: req.user._id,
      organizationId: org ? org._id : req.user._id,
      status: 'available',
      pickupContact: {
        name: data.contactName,
        phone: data.contactPhone,
        pickupInstructions: data.pickupInstructions || '',
      },
      pickupOtp,
      pickupOtpHashed: hashOtp(pickupOtp),
      pickupOtpEncrypted: encryptOtp(pickupOtp),
      pickupOtpExpiresAt: getOtpExpiryDate(),
      pickupOtpAttempts: 0,
      pickupOtpMaxAttempts: 5,
      deliveryOtp,
      images: data.images || [],
      timeline: [
        {
          status: 'available',
          timestamp: new Date(),
          note: `Donation listed: ${data.quantityMeals} meals (${data.quantityKg} kg) ready for NGO matching.`,
          actorId: req.user._id as any,
          actorName: req.user.name,
          actorRole: req.user.role,
        }
      ],
      isDemo: false,
    });

    await donation.save();

    // Trigger Automated Food Listing Alerts (Provider confirmation + eligible verified NGOs)
    try {
      const eligibleMatches = await findMatchingNgosForDonation(donation);
      await NotificationService.sendFoodListingAlerts({
        donation,
        providerUser: req.user,
        eligibleNgos: eligibleMatches,
      });
    } catch (notifErr) {
      console.warn('Food listing notification alert dispatch notice:', notifErr);
    }

    res.status(201).json({
      message: 'Surplus food listing created successfully',
      donation,
    });
  } catch (error: any) {
    console.error('Create donation error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const getDonations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, foodCategory, dietaryType, city, urgency, providerOnly, assignedToMe } = req.query;

    const query: any = {};

    // Auto-expire listings that crossed deadline
    const now = new Date();
    await Donation.updateMany(
      { status: 'available', collectionDeadline: { $lte: now } },
      { 
        $set: { status: 'expired' },
        $push: {
          timeline: {
            status: 'expired',
            timestamp: now,
            note: 'Automatically marked expired by food safety monitoring system.',
            actorName: 'Automated Safety Monitor',
            actorRole: 'system',
          }
        }
      }
    );

    const rawStatus = typeof status === 'string' ? status.trim().toLowerCase() : undefined;
    if (rawStatus && rawStatus !== 'all') {
      query.status = rawStatus;
      if (rawStatus === 'available') {
        query.collectionDeadline = { $gt: now };
      }
    }

    if (foodCategory && foodCategory !== 'all') {
      query.foodCategory = foodCategory;
    }

    if (dietaryType && dietaryType !== 'all') {
      query.dietaryType = dietaryType;
    }

    if (city && city !== 'all') {
      query['location.city'] = new RegExp(city as string, 'i');
    }

    // Urgency filter
    if (urgency === 'critical') {
      const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      query.collectionDeadline = { $gt: now, $lte: twoHoursAhead };
    } else if (urgency === 'urgent') {
      const sixHoursAhead = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      query.collectionDeadline = { $gt: now, $lte: sixHoursAhead };
    }

    // Provider filter
    if (providerOnly === 'true' && req.user) {
      query.providerId = req.user._id;
    }

    // Assigned to NGO filter
    if (assignedToMe === 'true' && req.user && req.user.organizationId) {
      query.assignedNgoId = (req.user.organizationId as any)._id || req.user.organizationId;
    }

    const donations = await Donation.find(query)
      .populate('providerId', 'name email phone')
      .populate('organizationId', 'name type phone location')
      .populate('assignedNgoId', 'name type phone location capacity')
      .sort({ createdAt: -1 })
      .exec();

    const currentUserId = getSafeIdString(req.user?._id);
    const currentUserOrgId = getSafeIdString((req.user?.organizationId as any)?._id || req.user?.organizationId);
    const isAdmin = req.user && normalizeRole(req.user.role) === 'admin';

    // Sanitize OTP visibility: Only the authenticated provider owner or admin can see the pickup/delivery OTPs
    const sanitizedDonations = donations.map((d) => {
      const obj = d.toObject();
      const donorProviderId = getSafeIdString(d.providerId);
      const donorOrgId = getSafeIdString(d.organizationId);

      const isOwner = Boolean(
        (currentUserId && donorProviderId && currentUserId === donorProviderId) ||
        (currentUserOrgId && donorOrgId && currentUserOrgId === donorOrgId)
      );

      if (!isOwner && !isAdmin) {
        delete (obj as any).pickupOtp;
        delete (obj as any).deliveryOtp;
      } else if (isOwner && !obj.pickupOtp && obj.pickupOtpEncrypted) {
        obj.pickupOtp = decryptOtp(obj.pickupOtpEncrypted) || undefined;
      }

      delete (obj as any).pickupOtpHashed;
      delete (obj as any).pickupOtpEncrypted;
      return obj;
    });

    res.json({
      count: sanitizedDonations.length,
      donations: sanitizedDonations,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const getDonationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id)
      .populate('providerId', 'name email phone')
      .populate('organizationId', 'name type phone location')
      .populate('assignedNgoId', 'name type phone location capacity')
      .exec();

    if (!donation) {
      res.status(404).json({ error: 'Not Found', message: 'Donation listing not found' });
      return;
    }

    // Check if user is authorized to see OTPs (ONLY owner or admin - NEVER the NGO!)
    const currentUserId = getSafeIdString(req.user?._id);
    const currentUserOrgId = getSafeIdString((req.user?.organizationId as any)?._id || req.user?.organizationId);
    const donorProviderId = getSafeIdString(donation.providerId);
    const donorOrgId = getSafeIdString(donation.organizationId);

    const isOwner = Boolean(
      (currentUserId && donorProviderId && currentUserId === donorProviderId) ||
      (currentUserOrgId && donorOrgId && currentUserOrgId === donorOrgId)
    );
    const isAdmin = req.user && normalizeRole(req.user.role) === 'admin';

    // Fetch existing requests for this donation
    const requests = await DonationRequest.find({ donationId: donation._id })
      .populate('ngoOrganizationId', 'name type phone location capacity')
      .populate('ngoId', 'name email phone')
      .sort({ matchScore: -1 })
      .exec();

    const donationObj = donation.toObject();

    // Hide OTP from NGO and public viewers
    if (!isOwner && !isAdmin) {
      delete (donationObj as any).pickupOtp;
      delete (donationObj as any).deliveryOtp;
    } else if (isOwner && !donationObj.pickupOtp && donationObj.pickupOtpEncrypted) {
      donationObj.pickupOtp = decryptOtp(donationObj.pickupOtpEncrypted) || undefined;
    }

    delete (donationObj as any).pickupOtpHashed;
    delete (donationObj as any).pickupOtpEncrypted;

    res.json({
      donation: donationObj,
      requests,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const getMatchingNgos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id).exec();

    if (!donation) {
      res.status(404).json({ error: 'Not Found', message: 'Donation listing not found' });
      return;
    }

    const matches = await findMatchingNgosForDonation(donation);

    res.json({
      donationId: donation._id,
      quantityMeals: donation.quantityMeals,
      storageRequirement: donation.storageRequirement,
      collectionDeadline: donation.collectionDeadline,
      matchCount: matches.length,
      matches,
    });
  } catch (error: any) {
    console.error('Matching calculation error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const requestDonation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }

    const userRole = normalizeRole(req.user.role);
    if (userRole !== 'ngo' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Access denied. Requires one of the following roles: ngo' });
      return;
    }

    const { id } = req.params;
    const { requestNotes, estimatedPickupTime } = req.body;

    const donation = await Donation.findById(id).exec();
    if (!donation) {
      res.status(404).json({ error: 'Not Found', message: 'Donation not found' });
      return;
    }

    const now = new Date();
    if (new Date(donation.collectionDeadline).getTime() <= now.getTime() || donation.status === 'expired') {
      if (donation.status !== 'expired') {
        donation.status = 'expired';
        donation.timeline.push({
          status: 'expired',
          timestamp: now,
          note: 'Collection request blocked: Food collection deadline passed.',
          actorName: 'Automated Food Safety Gate',
          actorRole: 'system',
        });
        await donation.save();
      }
      res.status(400).json({
        error: 'Donation Expired',
        message: 'This food donation has expired and cannot be requested for food safety compliance.'
      });
      return;
    }

    if (donation.status !== 'available' && donation.status !== 'requested') {
      res.status(400).json({
        error: 'Unavailable',
        message: `This donation is currently ${donation.status} and cannot be requested.`
      });
      return;
    }

    const orgId = (req.user.organizationId as any)?._id || req.user.organizationId;
    if (!orgId) {
      res.status(400).json({ error: 'Invalid NGO', message: 'NGO user is not associated with an organization record.' });
      return;
    }

    const ngoOrg = await Organization.findById(orgId).exec();
    if (!ngoOrg) {
      res.status(400).json({ error: 'Invalid NGO', message: 'NGO organization record not found' });
      return;
    }

    // Keep NGO verification check strictly separate from role authorization (Requirement 4)
    if (userRole === 'ngo' && ngoOrg.verificationStatus !== 'verified') {
      res.status(403).json({
        error: 'Verification Required',
        message: 'NGO verification pending. Administrator approval is required before requesting food collections.',
        verificationStatus: ngoOrg.verificationStatus || 'pending',
      });
      return;
    }

    // Validate estimatedPickupTime
    let parsedPickupTime: Date;
    if (estimatedPickupTime) {
      parsedPickupTime = new Date(estimatedPickupTime);
      if (isNaN(parsedPickupTime.getTime())) {
        res.status(400).json({ error: 'Validation Error', message: 'Invalid estimated pickup time format.' });
        return;
      }
      if (parsedPickupTime.getTime() <= now.getTime()) {
        res.status(400).json({ error: 'Validation Error', message: 'Estimated pickup time must be in the future.' });
        return;
      }
      if (parsedPickupTime.getTime() > new Date(donation.collectionDeadline).getTime()) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Estimated pickup time cannot be after the food collection deadline.'
        });
        return;
      }
    } else {
      parsedPickupTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
    }

    // Validate requestNotes
    const cleanNotes = typeof requestNotes === 'string' ? requestNotes.trim() : '';
    if (cleanNotes.length > 500) {
      res.status(400).json({ error: 'Validation Error', message: 'Request notes cannot exceed 500 characters.' });
      return;
    }

    if (ngoOrg.capacity.currentAvailableCapacity < donation.quantityMeals) {
      res.status(400).json({
        error: 'Capacity Insufficient',
        message: `Your available daily capacity (${ngoOrg.capacity.currentAvailableCapacity}) is less than the requested meals (${donation.quantityMeals}).`
      });
      return;
    }

    if ((donation.storageRequirement === 'refrigerated' || donation.storageRequirement === 'frozen') && !ngoOrg.capacity?.hasRefrigeration) {
      res.status(400).json({
        error: 'Storage Requirement Mismatch',
        message: `This donation requires cold-chain storage (${donation.storageRequirement}), but your facility lacks commercial refrigeration.`
      });
      return;
    }

    if (ngoOrg.compatibleCategories && ngoOrg.compatibleCategories.length > 0 && !ngoOrg.compatibleCategories.includes(donation.foodCategory)) {
      res.status(400).json({
        error: 'Category Incompatible',
        message: `Your organization does not accept ${donation.foodCategory.replace('_', ' ')} donations.`
      });
      return;
    }

    // Compute distance and validate service radius
    const distanceKm = calculateHaversineDistanceKm(donation.location?.coordinates, ngoOrg.location?.coordinates);
    if (distanceKm !== null && ngoOrg.serviceRadiusKm && distanceKm > ngoOrg.serviceRadiusKm) {
      res.status(400).json({
        error: 'Outside Service Radius',
        message: `This donation is located ${distanceKm} km away, which exceeds your organization's service radius of ${ngoOrg.serviceRadiusKm} km.`
      });
      return;
    }

    // Save request
    const existingReq = await DonationRequest.findOne({
      donationId: donation._id,
      ngoOrganizationId: ngoOrg._id,
    }).exec();

    if (existingReq) {
      res.status(409).json({ error: 'Duplicate', message: 'You have already submitted a request for this donation' });
      return;
    }

    const donationRequest = new DonationRequest({
      donationId: donation._id,
      ngoId: req.user._id,
      ngoOrganizationId: ngoOrg._id,
      status: 'pending',
      requestNotes: cleanNotes || 'Requesting pickup for community distribution.',
      estimatedPickupTime: parsedPickupTime,
      matchScore: 85, // base default or computed
      matchDetails: {
        distanceKm: distanceKm ?? 0,
        urgencyScore: 90,
        distanceScore: calculateDistanceScore(distanceKm),
        capacityScore: 90,
        availabilityScore: 85,
        storageScore: 100,
      }
    });

    await donationRequest.save();

    // Update donation status to requested
    if (donation.status === 'available') {
      donation.status = 'requested';
      donation.timeline.push({
        status: 'requested',
        timestamp: new Date(),
        note: `Collection requested by ${ngoOrg.name}. Awaiting provider approval.`,
        actorId: req.user._id as any,
        actorName: req.user.name,
        actorRole: req.user.role,
      });
      await donation.save();
    }

    // Trigger Automated Request Notification to Provider
    try {
      const providerUser = await User.findById(donation.providerId).exec();
      if (providerUser) {
        await NotificationService.sendDonationRequestAlert({
          donation,
          request: donationRequest,
          providerUser,
          ngoOrg,
          ngoUser: req.user,
        });
      }
    } catch (reqNotifErr) {
      console.warn('Donation request notification dispatch notice:', reqNotifErr);
    }

    res.status(201).json({
      message: 'Donation request submitted successfully',
      request: donationRequest,
    });
  } catch (error: any) {
    console.error('Request donation error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const respondToRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const userRole = normalizeRole(req.user.role);
    if (userRole !== 'provider' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Only the listing provider or an administrator can respond to requests' });
      return;
    }

    const { id } = req.params;
    const { requestId, action } = req.body; // action: 'approve' | 'reject'

    const donation = await Donation.findById(id).exec();
    if (!donation) {
      res.status(404).json({ error: 'Not Found', message: 'Donation not found' });
      return;
    }

    const donationRequest = await DonationRequest.findById(requestId).populate('ngoOrganizationId').exec();
    if (!donationRequest) {
      res.status(404).json({ error: 'Not Found', message: 'Request not found' });
      return;
    }

    if (action === 'approve') {
      // TASK 2: Generate fresh cryptographically secure 4-digit pickup OTP upon request approval
      const secureOtp = generateSecureOtp();
      const otpHashed = hashOtp(secureOtp);
      const otpEncrypted = encryptOtp(secureOtp);
      const expiresAt = getOtpExpiryDate();

      donation.status = 'accepted';
      donation.assignedNgoId = donationRequest.ngoOrganizationId._id as any;
      donation.pickupOtp = secureOtp;
      donation.pickupOtpHashed = otpHashed;
      donation.pickupOtpEncrypted = otpEncrypted;
      donation.pickupOtpExpiresAt = expiresAt;
      donation.pickupOtpAttempts = 0;
      donation.pickupOtpMaxAttempts = 5;
      donation.pickupOtpConsumedAt = undefined;
      donation.pickupOtpApprovedRequestId = donationRequest._id as any;
      donation.pickupOtpAuthorizedNgoId = (donationRequest.ngoOrganizationId as any)._id || donationRequest.ngoOrganizationId;

      donation.timeline.push({
        status: 'accepted',
        timestamp: new Date(),
        note: `Provider approved collection request from ${(donationRequest.ngoOrganizationId as any).name}. Pickup scheduled. Cryptographic pickup verification code generated.`,
        actorId: req.user._id as any,
        actorName: req.user.name,
        actorRole: req.user.role,
      });
      await donation.save();

      donationRequest.status = 'approved';
      donationRequest.pickupOtpHash = otpHashed;
      donationRequest.pickupOtpExpiresAt = expiresAt;
      donationRequest.pickupOtpAttempts = 0;
      await donationRequest.save();

      // Deduct capacity from NGO
      await Organization.findByIdAndUpdate(donationRequest.ngoOrganizationId._id, {
        $inc: { 'capacity.currentAvailableCapacity': -donation.quantityMeals }
      });

      // Reject other pending requests
      await DonationRequest.updateMany(
        { donationId: donation._id, _id: { $ne: donationRequest._id }, status: 'pending' },
        { $set: { status: 'rejected' } }
      );

      // Trigger Approval Notification to NGO
      try {
        const ngoUser = await User.findById(donationRequest.ngoId).exec();
        if (ngoUser) {
          await NotificationService.sendRequestApprovalAlert({
            donation,
            request: donationRequest,
            providerUser: req.user,
            ngoOrg: donationRequest.ngoOrganizationId as any,
            ngoUser,
          });
        }
      } catch (apprErr) {
        console.warn('Approval notification dispatch notice:', apprErr);
      }

      res.json({
        message: 'Request approved. Donation is now accepted and locked for pickup.',
        donation,
      });
    } else {
      donationRequest.status = 'rejected';
      await donationRequest.save();

      // Trigger Rejection Notification to NGO
      try {
        const ngoUser = await User.findById(donationRequest.ngoId).exec();
        if (ngoUser) {
          await NotificationService.sendRequestRejectionAlert({
            donation,
            request: donationRequest,
            ngoUser,
          });
        }
      } catch (rejErr) {
        console.warn('Rejection notification dispatch notice:', rejErr);
      }

      // If no other pending requests remain, revert donation to available
      const remainingPending = await DonationRequest.countDocuments({
        donationId: donation._id,
        status: 'pending',
      });

      if (remainingPending === 0 && donation.status === 'requested') {
        donation.status = 'available';
        await donation.save();
      }

      res.json({
        message: 'Request rejected.',
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const updateDonationStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nextStatus, otp, note } = req.body;

    const donation = await Donation.findById(id).populate('assignedNgoId').exec();
    if (!donation) {
      res.status(404).json({ error: 'Not Found', message: 'Donation not found' });
      return;
    }

    // Check if pickup OTP has already been verified / consumed
    if (nextStatus === 'picked_up' && donation.pickupOtpConsumedAt) {
      res.status(400).json({
        error: 'OTP Already Used',
        message: 'Pickup OTP has already been verified and consumed.'
      });
      return;
    }

    // Valid state transitions
    const validTransitions: Record<string, DonationStatus[]> = {
      available: ['requested', 'cancelled'],
      requested: ['accepted', 'cancelled'],
      accepted: ['pickup_scheduled', 'picked_up', 'cancelled'],
      pickup_scheduled: ['picked_up', 'cancelled'],
      picked_up: ['delivered'],
      delivered: ['completed'],
    };

    const allowed = validTransitions[donation.status] || [];
    if (!allowed.includes(nextStatus)) {
      res.status(400).json({
        error: 'Invalid State Transition',
        message: `Cannot transition donation from '${donation.status}' to '${nextStatus}'.`
      });
      return;
    }

    // Role-based state transition authorization
    const currentUserId = getSafeIdString(req.user?._id);
    const currentUserOrgId = getSafeIdString((req.user?.organizationId as any)?._id || req.user?.organizationId);
    const donorProviderId = getSafeIdString(donation.providerId);
    const donorOrgId = getSafeIdString(donation.organizationId);

    const isOwner = Boolean(
      (currentUserId && donorProviderId && currentUserId === donorProviderId) ||
      (currentUserOrgId && donorOrgId && currentUserOrgId === donorOrgId)
    );
    const userOrgId = currentUserOrgId;
    const assignedNgoId = getSafeIdString((donation.assignedNgoId as any)?._id || donation.assignedNgoId);
    const isAssignedNgo = normalizeRole(req.user?.role) === 'ngo' && Boolean(userOrgId && assignedNgoId && userOrgId === assignedNgoId);
    const isAdmin = normalizeRole(req.user?.role) === 'admin';

    const approvedRequest = await DonationRequest.findOne({ donationId: donation._id, status: 'approved' }).exec();
    const isRequesterUser = normalizeRole(req.user?.role) === 'ngo' && Boolean(approvedRequest && approvedRequest.ngoId?.toString() === req.user?._id?.toString());
    const isAuthorizedRequestOrg = normalizeRole(req.user?.role) === 'ngo' && Boolean(approvedRequest && approvedRequest.ngoOrganizationId?.toString() === userOrgId);
    const isAuthorizedFieldOrg = normalizeRole(req.user?.role) === 'ngo' && Boolean(donation.pickupOtpAuthorizedNgoId && donation.pickupOtpAuthorizedNgoId.toString() === userOrgId);

    // OTP validation and pickup verification logic
    if (nextStatus === 'picked_up') {
      // Must be authorized NGO, owner, or admin
      if (!isAssignedNgo && !isRequesterUser && !isAuthorizedRequestOrg && !isAuthorizedFieldOrg && !isOwner && !isAdmin) {
        res.status(403).json({
          error: 'Unauthorized NGO',
          message: 'Only the approved NGO recipient is authorized to verify pickup for this donation.'
        });
        return;
      }

      // Check if already consumed / picked up
      if (donation.pickupOtpConsumedAt) {
        res.status(400).json({
          error: 'OTP Already Used',
          message: 'Pickup OTP has already been verified and consumed.'
        });
        return;
      }

      // Validate OTP format (4 digits, supports string or number)
      const cleanOtp = (otp !== undefined && otp !== null) ? String(otp).trim() : '';
      if (!cleanOtp || !/^\d{4}$/.test(cleanOtp)) {
        res.status(400).json({
          error: 'OTP Verification Failed',
          message: 'Invalid pickup OTP. Provider must share the 4-digit code.'
        });
        return;
      }

      // Check Expiry (configurable OTP_EXPIRY_MINUTES)
      if (donation.pickupOtpExpiresAt && new Date(donation.pickupOtpExpiresAt).getTime() < Date.now()) {
        res.status(400).json({
          error: 'OTP Expired',
          message: 'Pickup OTP has expired. Please ask the food provider to regenerate a new code.'
        });
        return;
      }

      // Check Rate Limit / Retry Limit
      const currentAttempts = donation.pickupOtpAttempts || 0;
      const maxAttempts = donation.pickupOtpMaxAttempts || 5;
      if (currentAttempts >= maxAttempts) {
        res.status(429).json({
          error: 'Rate Limited',
          message: 'Maximum OTP verification attempts exceeded. Please ask the provider to regenerate a new code.'
        });
        return;
      }

      // Cryptographic comparison against stored secure hash
      let isValidOtp = false;
      if (donation.pickupOtpHashed) {
        isValidOtp = verifyOtpHash(cleanOtp, donation.pickupOtpHashed);
      } else if (approvedRequest?.pickupOtpHash) {
        isValidOtp = verifyOtpHash(cleanOtp, approvedRequest.pickupOtpHash);
      } else if (donation.pickupOtpEncrypted) {
        const decrypted = decryptOtp(donation.pickupOtpEncrypted);
        isValidOtp = decrypted === cleanOtp;
      } else if (donation.pickupOtp) {
        isValidOtp = donation.pickupOtp.trim() === cleanOtp;
      }

      if (!isValidOtp) {
        donation.pickupOtpAttempts = currentAttempts + 1;
        donation.timeline.push({
          status: donation.status,
          timestamp: new Date(),
          note: `Failed pickup OTP verification attempt (${donation.pickupOtpAttempts}/${maxAttempts}) by ${req.user?.name || 'NGO Actor'}.`,
          actorId: req.user?._id as any,
          actorName: req.user?.name || 'Unknown',
          actorRole: req.user?.role || 'system',
        });
        await donation.save();

        if (approvedRequest) {
          approvedRequest.pickupOtpAttempts = (approvedRequest.pickupOtpAttempts || 0) + 1;
          await approvedRequest.save();
        }

        const attemptsLeft = maxAttempts - donation.pickupOtpAttempts;
        res.status(400).json({
          error: 'OTP Verification Failed',
          message: attemptsLeft > 0
            ? 'Invalid pickup OTP. Provider must share the 4-digit code.'
            : 'Maximum OTP verification attempts exceeded. Please ask the provider to regenerate a new code.'
        });
        return;
      }

      // Success: Invalidate / consume OTP atomically
      donation.pickupOtpConsumedAt = new Date();
      donation.pickupOtpAttempts = 0;
      donation.pickupOtp = undefined;
      donation.pickupOtpEncrypted = undefined;
      donation.pickupOtpHashed = undefined; // Clear hash so code cannot be reused
      if (!donation.deliveryOtp) {
        donation.deliveryOtp = generateSecureOtp();
      }

      if (approvedRequest) {
        approvedRequest.pickupOtpVerified = true;
        approvedRequest.pickupOtpVerifiedAt = new Date();
        approvedRequest.pickupOtpHash = undefined;
        await approvedRequest.save();
      }
    }

    if (nextStatus === 'delivered') {
      if (!otp || otp !== donation.deliveryOtp) {
        res.status(400).json({ error: 'OTP Verification Failed', message: 'Invalid delivery confirmation OTP.' });
        return;
      }
    }

    donation.status = nextStatus;
    donation.timeline.push({
      status: nextStatus,
      timestamp: new Date(),
      note: note || (nextStatus === 'picked_up' ? `Pickup confirmed via secure 4-digit OTP handover by ${req.user?.name || 'NGO Driver'}. Meals now in transit.` : `Status progressed to ${nextStatus}`),
      actorId: req.user?._id as any,
      actorName: req.user?.name || 'System Actor',
      actorRole: req.user?.role || 'system',
    });

    await donation.save();

    // Trigger Automated Lifecycle Notifications
    try {
      const providerUser = await User.findById(donation.providerId).exec();
      const approvedRequest = await DonationRequest.findOne({ donationId: donation._id, status: 'approved' }).exec();
      const ngoUser = approvedRequest ? await User.findById(approvedRequest.ngoId).exec() : null;

      if (nextStatus === 'picked_up') {
        await NotificationService.sendPickupConfirmation({
          donation,
          providerUser,
          ngoUser,
        });
      } else if (nextStatus === 'delivered' || nextStatus === 'completed') {
        await NotificationService.sendDeliveryConfirmation({
          donation,
          providerUser,
          ngoUser,
        });
      }
    } catch (notifErr) {
      console.warn('Lifecycle notification dispatch notice:', notifErr);
    }

    res.json({
      message: `Donation status successfully updated to ${nextStatus}`,
      donation,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Dedicated endpoint for NGO to verify 4-digit pickup OTP
 * POST /api/donations/:id/verify-pickup
 */
export const verifyPickupOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  req.body = { ...req.body, nextStatus: 'picked_up' };
  return updateDonationStatus(req, res);
};

/**
 * Secure endpoint for Authenticated Provider to view their pickup OTP
 * GET /api/donations/:id/pickup-otp
 */
export const getPickupOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const donation = await Donation.findById(id)
      .populate('assignedNgoId', 'name phone location')
      .populate('providerId', 'name email phone')
      .exec();

    if (!donation) {
      res.status(404).json({ error: 'Not Found', message: 'Donation listing not found' });
      return;
    }

    const currentUserId = getSafeIdString(req.user?._id);
    const currentUserOrgId = getSafeIdString((req.user?.organizationId as any)?._id || req.user?.organizationId);
    const donorProviderId = getSafeIdString(donation.providerId);
    const donorOrgId = getSafeIdString(donation.organizationId);

    const isOwner = Boolean(
      (currentUserId && donorProviderId && currentUserId === donorProviderId) ||
      (currentUserOrgId && donorOrgId && currentUserOrgId === donorOrgId)
    );
    const isAdmin = req.user && normalizeRole(req.user.role) === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the authenticated food provider can view the pickup verification OTP.'
      });
      return;
    }

    // Only applicable for approved / scheduled pickups
    if (!['accepted', 'pickup_scheduled'].includes(donation.status)) {
      res.status(400).json({
        error: 'Invalid State',
        message: `Pickup OTP is only available for accepted or scheduled pickups. Current status is '${donation.status}'.`
      });
      return;
    }

    // Decrypt or obtain secure OTP
    let otp = donation.pickupOtp;
    if (!otp && donation.pickupOtpEncrypted) {
      otp = decryptOtp(donation.pickupOtpEncrypted) || undefined;
    }

    if (!otp) {
      otp = generateSecureOtp();
      const otpHashed = hashOtp(otp);
      const otpEncrypted = encryptOtp(otp);
      const expiresAt = getOtpExpiryDate();
      donation.pickupOtp = otp;
      donation.pickupOtpHashed = otpHashed;
      donation.pickupOtpEncrypted = otpEncrypted;
      donation.pickupOtpExpiresAt = expiresAt;
      donation.pickupOtpAttempts = 0;
      donation.pickupOtpMaxAttempts = 5;
      await donation.save();

      await DonationRequest.findOneAndUpdate(
        { donationId: donation._id, status: 'approved' },
        { $set: { pickupOtpHash: otpHashed, pickupOtpExpiresAt: expiresAt, pickupOtpAttempts: 0 } }
      );
    }

    const attemptsRemaining = Math.max(0, (donation.pickupOtpMaxAttempts || 5) - (donation.pickupOtpAttempts || 0));

    res.json({
      donationId: donation._id,
      title: donation.title,
      pickupOtp: otp,
      expiresAt: donation.pickupOtpExpiresAt,
      attemptsRemaining,
      status: donation.status,
      assignedNgo: donation.assignedNgoId,
      instructions: 'Share this 4-digit code verbally or physically with the NGO collector upon arrival to verify physical transfer.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Secure endpoint for Food Provider to regenerate pickup OTP
 * POST /api/donations/:id/regenerate-otp
 */
export const regeneratePickupOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || normalizeRole(req.user.role) !== 'provider') {
      res.status(403).json({ error: 'Forbidden', message: 'Only food providers can regenerate pickup OTPs.' });
      return;
    }

    const { id } = req.params;
    const donation = await Donation.findById(id).populate('assignedNgoId', 'name phone').exec();
    if (!donation) {
      res.status(404).json({ error: 'Not Found', message: 'Donation listing not found' });
      return;
    }

    const currentUserId = getSafeIdString(req.user._id);
    const currentUserOrgId = getSafeIdString((req.user.organizationId as any)?._id || req.user.organizationId);
    const donorProviderId = getSafeIdString(donation.providerId);
    const donorOrgId = getSafeIdString(donation.organizationId);

    const isOwner = Boolean(
      (currentUserId && donorProviderId && currentUserId === donorProviderId) ||
      (currentUserOrgId && donorOrgId && currentUserOrgId === donorOrgId)
    );

    const userRole = normalizeRole(req.user.role);
    const isAdmin = userRole === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({ error: 'Forbidden', message: 'Only the donation listing owner or an administrator can regenerate the pickup OTP.' });
      return;
    }

    if (!['accepted', 'pickup_scheduled'].includes(donation.status)) {
      res.status(400).json({
        error: 'Invalid State',
        message: `Cannot regenerate OTP for a donation in '${donation.status}' state.`
      });
      return;
    }

    // Invalidate previous OTP and generate fresh cryptographically secure code
    const newOtp = generateSecureOtp();
    const otpHashed = hashOtp(newOtp);
    const otpEncrypted = encryptOtp(newOtp);
    const expiresAt = getOtpExpiryDate();
    donation.pickupOtp = newOtp;
    donation.pickupOtpHashed = otpHashed;
    donation.pickupOtpEncrypted = otpEncrypted;
    donation.pickupOtpExpiresAt = expiresAt;
    donation.pickupOtpAttempts = 0;
    donation.pickupOtpConsumedAt = undefined;
    donation.pickupOtpRegeneratedAt = new Date();

    donation.timeline.push({
      status: donation.status,
      timestamp: new Date(),
      note: 'Provider regenerated pickup OTP. Previous verification code was invalidated.',
      actorId: req.user._id as any,
      actorName: req.user.name,
      actorRole: req.user.role,
    });

    await donation.save();

    await DonationRequest.findOneAndUpdate(
      { donationId: donation._id, status: 'approved' },
      { $set: { pickupOtpHash: otpHashed, pickupOtpExpiresAt: expiresAt, pickupOtpAttempts: 0 } }
    );

    res.json({
      message: 'Pickup OTP regenerated successfully. Previous code has been invalidated.',
      pickupOtp: newOtp,
      expiresAt: donation.pickupOtpExpiresAt,
      attemptsRemaining: 5,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Fetch all incoming collection requests across the authenticated provider's food listings
 * GET /api/donations/requests/incoming
 */
export const getProviderIncomingRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const userRole = normalizeRole(req.user.role);
    if (userRole !== 'provider' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Only food providers and administrators can view incoming collection requests.' });
      return;
    }

    // Find all donation IDs belonging to this provider (or all for platform admin)
    const query = userRole === 'admin' ? {} : { providerId: req.user._id };
    const providerDonations = await Donation.find(query).select('_id').exec();
    const donationIds = providerDonations.map(d => d._id);

    const requests = await DonationRequest.find({ donationId: { $in: donationIds } })
      .populate('donationId', 'title quantityMeals quantityKg status collectionDeadline pickupOtp')
      .populate('ngoOrganizationId', 'name type phone location capacity')
      .populate('ngoId', 'name email phone')
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      count: requests.length,
      requests,
    });
  } catch (error: any) {
    console.error('Error fetching provider requests:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Fetch all collection requests submitted by the authenticated NGO
 * GET /api/donations/requests/my-requests
 */
export const getNgoMyRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
      return;
    }
    const userRole = normalizeRole(req.user.role);
    if (userRole !== 'ngo' && userRole !== 'admin') {
      res.status(403).json({ error: 'Forbidden', message: 'Only NGO users and administrators can view submitted collection requests.' });
      return;
    }

    const orgId = (req.user.organizationId as any)?._id || req.user.organizationId;
    const query: any = {
      $or: [
        { ngoId: req.user._id },
      ],
    };
    if (orgId) {
      query.$or.push({ ngoOrganizationId: orgId });
    }

    const requests = await DonationRequest.find(query)
      .populate({
        path: 'donationId',
        select: 'title quantityMeals quantityKg status collectionDeadline location pickupContact assignedNgoId',
        populate: {
          path: 'organizationId',
          select: 'name phone location type',
        },
      })
      .populate('ngoOrganizationId', 'name type phone location')
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      count: requests.length,
      requests,
    });
  } catch (error: any) {
    console.error('Error fetching NGO requests:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

