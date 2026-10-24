import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';
import { User } from '../models/User';
import { DonationRequest } from '../models/DonationRequest';
import { NotificationService } from '../services/notificationService';

export const getPendingVerifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [pendingNgos, pendingProviders] = await Promise.all([
      Organization.find({
        type: { $in: ['ngo_shelter', 'community_kitchen', 'food_bank', 'charity'] },
        verificationStatus: 'pending',
      }).sort({ createdAt: -1 }).exec(),
      Organization.find({
        type: { $in: ['restaurant', 'canteen', 'hotel', 'hostel', 'caterer', 'event_organizer'] },
        verificationStatus: 'pending',
      }).sort({ createdAt: -1 }).exec(),
    ]);

    res.json({
      count: pendingNgos.length + pendingProviders.length,
      pendingNgos,
      pendingProviders,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const verifyNgo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ error: 'Invalid Action', message: "Action must be 'approve' or 'reject'" });
      return;
    }

    const ngo = await Organization.findById(id).exec();
    if (!ngo) {
      res.status(404).json({ error: 'Not Found', message: 'Organization not found' });
      return;
    }

    ngo.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
    ngo.verificationNotes = notes || (action === 'approve' ? 'Verified by Admin' : 'Rejected due to insufficient documentation');
    ngo.verifiedAt = new Date();
    ngo.verifiedBy = req.user?._id as any;

    await ngo.save();

    // Dispatch Account Status Notifications (Phase 2)
    try {
      await NotificationService.sendAccountStatusUpdate({
        organization: ngo,
        action,
        notes: ngo.verificationNotes,
      });
    } catch (notifErr) {
      console.warn('Account status notification notice:', notifErr);
    }

    res.json({
      message: `NGO verification status successfully updated to ${ngo.verificationStatus}`,
      organization: ngo,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const getPlatformAnalytics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const providerTypes = ['restaurant', 'canteen', 'hotel', 'hostel', 'caterer', 'event_organizer'];
    const [
      totalDonations,
      completedDonations,
      activeDonations,
      expiredDonations,
      totalProviders,
      approvedProviders,
      pendingProviders,
      rejectedProviders,
      verifiedNgos,
      pendingNgos,
      completedAgg
    ] = await Promise.all([
      Donation.countDocuments(),
      Donation.countDocuments({ status: { $in: ['delivered', 'completed'] } }),
      Donation.countDocuments({ status: { $in: ['available', 'requested', 'accepted', 'pickup_scheduled', 'picked_up'] } }),
      Donation.countDocuments({ status: 'expired' }),
      Organization.countDocuments({ type: { $in: providerTypes } }),
      Organization.countDocuments({ verificationStatus: { $in: ['verified', 'approved'] }, type: { $in: providerTypes } }),
      Organization.countDocuments({ verificationStatus: 'pending', type: { $in: providerTypes } }),
      Organization.countDocuments({ verificationStatus: 'rejected', type: { $in: providerTypes } }),
      Organization.countDocuments({ verificationStatus: { $in: ['verified', 'approved'] }, type: { $in: ['ngo_shelter', 'community_kitchen', 'food_bank', 'charity'] } }),
      Organization.countDocuments({ verificationStatus: 'pending', type: { $in: ['ngo_shelter', 'community_kitchen', 'food_bank', 'charity'] } }),
      Donation.aggregate([
        { $match: { status: { $in: ['delivered', 'completed'] } } },
        { 
          $group: {
            _id: null,
            totalMeals: { $sum: '$quantityMeals' },
            totalKg: { $sum: '$quantityKg' }
          }
        }
      ])
    ]);

    const mealsRedistributed = completedAgg[0]?.totalMeals || 0;
    const kgRescued = completedAgg[0]?.totalKg || 0;
    const estimatedCo2AvoidedKg = Math.round(kgRescued * 2.5 * 10) / 10; // ~2.5 kg CO2e per kg food saved

    res.json({
      metrics: {
        totalDonations,
        completedDonations,
        activeDonations,
        expiredDonations,
        mealsRedistributed,
        totalMealsRedistributed: mealsRedistributed,
        kgRescued,
        totalKgFoodDiverted: kgRescued,
        estimatedCo2AvoidedKg,
        totalProviders,
        approvedProviders,
        pendingProviders,
        rejectedProviders,
        verifiedNgos,
        pendingNgos,
      },
      currentAlgorithmWeights: {
        urgency: 0.30,
        distance: 0.25,
        capacity: 0.20,
        availability: 0.15,
        compatibility: 0.10,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Fetch all registered users for Administrator overview
 * GET /api/admin/users
 */
export const getAdminUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .populate('organizationId', 'name type verificationStatus location capacity')
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      count: users.length,
      users,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Fetch all food donations across platform for Administrator oversight
 * GET /api/admin/donations
 */
export const getAdminAllDonations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const donations = await Donation.find()
      .populate('providerId', 'name email phone')
      .populate('organizationId', 'name type phone location')
      .populate('assignedNgoId', 'name type phone location')
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      count: donations.length,
      donations,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Fetch all collection requests across platform for Administrator tracking
 * GET /api/admin/requests
 */
export const getAdminAllRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requests = await DonationRequest.find()
      .populate('donationId', 'title quantityMeals quantityKg status collectionDeadline')
      .populate('ngoOrganizationId', 'name type phone location')
      .populate('ngoId', 'name email phone')
      .sort({ createdAt: -1 })
      .exec();

    res.json({
      count: requests.length,
      requests,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Fetch all registered Food Providers with optional verification status filter
 * GET /api/admin/providers?status=pending|approved|rejected|all
 */
export const getAdminProviders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const providerTypes = ['restaurant', 'canteen', 'hotel', 'hostel', 'caterer', 'event_organizer'];

    const query: any = { type: { $in: providerTypes } };
    if (status && status !== 'all') {
      const cleanStatus = String(status).toLowerCase().trim();
      if (cleanStatus === 'approved' || cleanStatus === 'verified') {
        query.verificationStatus = { $in: ['approved', 'verified'] };
      } else {
        query.verificationStatus = cleanStatus;
      }
    }

    const organizations = await Organization.find(query)
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .exec();

    // Find all users linked to these organizations
    const orgIds = organizations.map(o => o._id);
    const users = await User.find({ organizationId: { $in: orgIds } })
      .select('name email phone role organizationId createdAt')
      .exec();

    const userMap = new Map<string, any>();
    for (const u of users) {
      if (u.organizationId) {
        userMap.set(u.organizationId.toString(), u);
      }
    }

    const providers = organizations.map(org => {
      const linkedUser = userMap.get(org._id.toString());
      return {
        _id: org._id,
        name: org.name,
        organizationName: org.name,
        type: org.type,
        description: org.description,
        contactPerson: org.contactPerson || linkedUser?.name || 'Contact Person',
        email: org.email || linkedUser?.email || '',
        phone: org.phone || linkedUser?.phone || '',
        address: org.location?.address || '',
        city: org.location?.city || '',
        location: org.location,
        verificationStatus: org.verificationStatus,
        verificationNotes: org.verificationNotes || '',
        verifiedAt: org.verifiedAt,
        verifiedBy: org.verifiedBy,
        createdAt: org.createdAt,
        user: linkedUser ? {
          _id: linkedUser._id,
          name: linkedUser.name,
          email: linkedUser.email,
          phone: linkedUser.phone,
          role: linkedUser.role,
        } : null,
        userName: linkedUser?.name || '',
        userEmail: linkedUser?.email || '',
        userPhone: linkedUser?.phone || '',
      };
    });

    res.json({
      count: providers.length,
      providers,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

/**
 * Approve or reject a Food Provider's verification application
 * POST /api/admin/verify-provider/:id
 */
export const verifyProvider = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      res.status(400).json({ error: 'Invalid Action', message: "Action must be 'approve' or 'reject'" });
      return;
    }

    const providerOrg = await Organization.findById(id).exec();
    if (!providerOrg) {
      res.status(404).json({ error: 'Not Found', message: 'Provider organization not found' });
      return;
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    providerOrg.verificationStatus = newStatus;
    providerOrg.verificationNotes = notes || (action === 'approve' ? 'Approved by Platform Administrator' : 'Rejected by Platform Administrator');
    providerOrg.verifiedAt = new Date();
    providerOrg.verifiedBy = req.user?._id as any;

    await providerOrg.save();

    // Trigger Notification Workflow (In-App, Email, SMS)
    try {
      await NotificationService.sendAccountStatusUpdate({
        organization: providerOrg,
        action,
        notes: providerOrg.verificationNotes,
      });
    } catch (notifErr) {
      console.warn('Provider account status notification notice:', notifErr);
    }

    res.json({
      message: `Food Provider verification status successfully updated to ${providerOrg.verificationStatus}`,
      organization: providerOrg,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

