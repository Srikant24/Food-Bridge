import { Request, Response } from 'express';
import { Organization } from '../models/Organization';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { normalizeRole } from '../utils/roleUtils';

export const getNgos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, verifiedOnly, search } = req.query;
    const query: any = {
      type: { $in: ['ngo_shelter', 'community_kitchen', 'food_bank', 'charity'] }
    };

    if (verifiedOnly === 'true') {
      query.verificationStatus = 'verified';
    }

    if (city && city !== 'all') {
      query['location.city'] = new RegExp(city as string, 'i');
    }

    if (search) {
      query.name = new RegExp(search as string, 'i');
    }

    const ngos = await Organization.find(query).sort({ 'capacity.maxMealsPerDay': -1 }).exec();

    res.json({
      count: ngos.length,
      ngos,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const getNgoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const ngo = await Organization.findById(id).exec();
    if (!ngo) {
      res.status(404).json({ error: 'Not Found', message: 'NGO organization not found' });
      return;
    }

    res.json({ ngo });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};

export const updateNgoCapacity = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || normalizeRole(req.user.role) !== 'ngo') {
      res.status(403).json({ error: 'Forbidden', message: 'Only NGO users can update organization capacity' });
      return;
    }

    const { maxMealsPerDay, currentAvailableCapacity, hasRefrigeration, hasWarmStorage, hasTransportFleet, activeVolunteers } = req.body;

    const orgId = (req.user.organizationId as any)?._id || req.user.organizationId;
    const ngo = await Organization.findById(orgId).exec();
    if (!ngo) {
      res.status(404).json({ error: 'Not Found', message: 'Organization record not found' });
      return;
    }

    if (maxMealsPerDay !== undefined) ngo.capacity.maxMealsPerDay = maxMealsPerDay;
    if (currentAvailableCapacity !== undefined) ngo.capacity.currentAvailableCapacity = currentAvailableCapacity;
    if (hasRefrigeration !== undefined) ngo.capacity.hasRefrigeration = hasRefrigeration;
    if (hasWarmStorage !== undefined) ngo.capacity.hasWarmStorage = hasWarmStorage;
    if (hasTransportFleet !== undefined) ngo.capacity.hasTransportFleet = hasTransportFleet;
    if (activeVolunteers !== undefined) ngo.capacity.activeVolunteers = activeVolunteers;

    await ngo.save();

    res.json({
      message: 'NGO capacity and handling attributes updated successfully',
      capacity: ngo.capacity,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
};
