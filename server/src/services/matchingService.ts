import { IDonation } from '../models/Donation';
import { IOrganization, Organization } from '../models/Organization';

export interface IMatchFactorBreakdown {
  urgency: number;         // 0 - 100 (Weight: 30%)
  distanceKm: number | null; // raw distance in km (or null if missing/unknown)
  distanceScore: number;   // 0 - 100 (Weight: 25%)
  capacityScore: number;   // 0 - 100 (Weight: 20%)
  availabilityScore: number; // 0 - 100 (Weight: 15%)
  compatibilityScore: number; // 0 - 100 (Weight: 10%)
}

export interface INgoMatchResult {
  ngoId: string;
  ngoName: string;
  organizationType: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  distanceKm: number | null;
  availableCapacity: number;
  maxMealsPerDay: number;
  matchScore: number; // Weighted total (0 - 100)
  hasTransportFleet: boolean;
  hasRefrigeration: boolean;
  factors: IMatchFactorBreakdown;
  explanation: string;
}

export const isValidCoordinate = (coord: any): coord is [number, number] => {
  if (!Array.isArray(coord) || coord.length < 2) return false;
  const lon = Number(coord[0]);
  const lat = Number(coord[1]);
  if (isNaN(lon) || isNaN(lat)) return false;
  // [0, 0] is Null Island / default placeholder for missing coordinates
  if (Math.abs(lon) < 0.0001 && Math.abs(lat) < 0.0001) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  return true;
};

/**
 * Calculate Great-Circle Distance using Haversine formula
 * @param coord1 [longitude, latitude]
 * @param coord2 [longitude, latitude]
 * @returns distance in kilometers, or null if coordinates are missing/invalid
 */
export const calculateHaversineDistanceKm = (
  coord1: any,
  coord2: any
): number | null => {
  if (!isValidCoordinate(coord1) || !isValidCoordinate(coord2)) {
    return null; // Missing coordinates are NEVER interpreted as 0 km
  }

  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's mean radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
};

/**
 * Compute Urgency Factor (0 - 100)
 * 30% Weight in Final Score
 */
export const calculateUrgencyScore = (deadline: Date): number => {
  const now = new Date().getTime();
  const target = new Date(deadline).getTime();
  const hoursRemaining = (target - now) / (1000 * 60 * 60);

  if (hoursRemaining <= 0) return 0; // Expired
  if (hoursRemaining <= 2) return 100; // Critical urgency
  if (hoursRemaining <= 4) return 92;
  if (hoursRemaining <= 8) return 80;
  if (hoursRemaining <= 16) return 65;
  if (hoursRemaining <= 24) return 50;
  if (hoursRemaining <= 48) return 35;
  return 20;
};

export const calculateDistanceScore = (distanceKm: number | null): number => {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return 30; // Missing coordinates get baseline score, never 100 (which is reserved for <= 2 km)
  }
  if (distanceKm <= 2) return 100;
  if (distanceKm <= 5) return 90;
  if (distanceKm <= 10) return 78;
  if (distanceKm <= 15) return 65;
  if (distanceKm <= 25) return 45;
  if (distanceKm <= 40) return 25;
  return Math.max(5, Math.round(100 - distanceKm * 2.2));
};

/**
 * Compute Recipient Capacity Factor (0 - 100)
 * 20% Weight in Final Score
 */
export const calculateCapacityScore = (
  requestedMeals: number,
  availableCapacity: number,
  maxMealsPerDay: number
): number => {
  if (availableCapacity <= 0) return 0;
  if (availableCapacity < requestedMeals) return 30; // Under capacity

  // Perfect fit or ample capacity
  const surplusRatio = availableCapacity / requestedMeals;
  if (surplusRatio >= 1 && surplusRatio <= 3) return 100; // Optimum match without hoarding
  return Math.max(70, Math.min(95, 80 + (availableCapacity / maxMealsPerDay) * 15));
};

/**
 * Compute Pickup Fleet & Volunteer Availability Factor (0 - 100)
 * 15% Weight in Final Score
 */
export const calculateAvailabilityScore = (
  hasTransportFleet: boolean,
  activeVolunteers: number
): number => {
  if (hasTransportFleet && activeVolunteers >= 5) return 100;
  if (hasTransportFleet) return 88;
  if (activeVolunteers >= 10) return 80;
  if (activeVolunteers >= 4) return 65;
  return 45;
};

/**
 * Compute Food Handling & Storage Compatibility (0 - 100)
 * 10% Weight in Final Score
 */
export const calculateCompatibilityScore = (
  storageReq: string,
  foodCategory: string,
  ngo: IOrganization
): number => {
  let score = 100;

  // Cold storage checks
  if (storageReq === 'refrigerated' || storageReq === 'frozen') {
    if (!ngo.capacity.hasRefrigeration) {
      return 0; // Critical mismatch
    }
  }

  // Hot food storage checks
  if (storageReq === 'hot_insulated') {
    if (!ngo.capacity.hasWarmStorage) {
      score -= 25;
    }
  }

  // Category whitelist
  if (ngo.compatibleCategories && !ngo.compatibleCategories.includes(foodCategory)) {
    score -= 40;
  }

  return Math.max(0, score);
};

/**
 * Formulates human-readable explanation based on actual computation factors
 */
const generateMatchExplanation = (
  ngoName: string,
  totalScore: number,
  distanceKm: number | null,
  hoursRemaining: number,
  capacity: number,
  reqMeals: number,
  hasTransport: boolean,
  hasFridge: boolean,
  storageReq: string
): string => {
  const parts: string[] = [];

  if (distanceKm === null || distanceKm === undefined) {
    parts.push('Distance not calculated (coordinates unavailable)');
  } else if (distanceKm <= 5) {
    parts.push(`Situated only ${distanceKm} km away for rapid arrival`);
  } else {
    parts.push(`Located ${distanceKm} km away`);
  }

  if (hoursRemaining <= 3) {
    parts.push(`Urgent pickup required (${Math.round(hoursRemaining * 10) / 10}h left)`);
  }

  if (capacity >= reqMeals) {
    parts.push(`Has capacity to distribute all ${reqMeals} meals immediately (${capacity} available)`);
  }

  if (hasTransport) {
    parts.push(`Owns active transport fleet ready for collection`);
  }

  if ((storageReq === 'refrigerated' || storageReq === 'frozen') && hasFridge) {
    parts.push(`Verified cold-storage chain equipped`);
  }

  if (totalScore >= 85) {
    return `Highly Recommended: ${parts.join('. ')}.`;
  } else if (totalScore >= 70) {
    return `Strong Match: ${parts.join('. ')}.`;
  } else {
    return `Eligible Match: ${parts.join('. ')}.`;
  }
};

/**
 * Execute 5-Factor Matching Algorithm against all verified NGOs in Database
 */
export const findMatchingNgosForDonation = async (
  donation: IDonation,
  weights = {
    urgency: 0.30,
    distance: 0.25,
    capacity: 0.20,
    availability: 0.15,
    compatibility: 0.10,
  }
): Promise<INgoMatchResult[]> => {
  const now = new Date();
  const hoursRemaining = (new Date(donation.collectionDeadline).getTime() - now.getTime()) / (1000 * 60 * 60);

  // If expired, no matches can be recommended
  if (hoursRemaining <= 0) {
    return [];
  }

  // 1. Fetch verified NGO organizations
  const ngos = await Organization.find({
    type: { $in: ['ngo_shelter', 'community_kitchen', 'food_bank', 'charity'] },
    verificationStatus: 'verified',
  }).exec();

  const results: INgoMatchResult[] = [];

  for (const ngo of ngos) {
    // Exclusion criteria 1: Capacity unable to take requested meals
    if (ngo.capacity.currentAvailableCapacity < donation.quantityMeals) {
      continue;
    }

    // Exclusion criteria 2: Refrigeration required but missing
    if ((donation.storageRequirement === 'refrigerated' || donation.storageRequirement === 'frozen') && !ngo.capacity.hasRefrigeration) {
      continue;
    }

    // Exclusion criteria 3: Incompatible category
    if (ngo.compatibleCategories && !ngo.compatibleCategories.includes(donation.foodCategory)) {
      continue;
    }

    // Coordinates check
    const donorCoord = donation.location?.coordinates;
    const ngoCoord = ngo.location?.coordinates;

    const distanceKm = calculateHaversineDistanceKm(donorCoord, ngoCoord);

    // Exclusion criteria 4: Outside NGO service radius
    if (distanceKm !== null && ngo.serviceRadiusKm && distanceKm > ngo.serviceRadiusKm) {
      continue;
    }

    // Compute 5 normalized factors (0 - 100)
    const urgencyScore = calculateUrgencyScore(donation.collectionDeadline);
    const distanceScore = calculateDistanceScore(distanceKm);
    const capacityScore = calculateCapacityScore(
      donation.quantityMeals,
      ngo.capacity.currentAvailableCapacity,
      ngo.capacity.maxMealsPerDay
    );
    const availabilityScore = calculateAvailabilityScore(
      ngo.capacity.hasTransportFleet,
      ngo.capacity.activeVolunteers
    );
    const compatibilityScore = calculateCompatibilityScore(
      donation.storageRequirement,
      donation.foodCategory,
      ngo
    );

    // Compute Weighted Match Score
    const weightedScore = 
      (urgencyScore * weights.urgency) +
      (distanceScore * weights.distance) +
      (capacityScore * weights.capacity) +
      (availabilityScore * weights.availability) +
      (compatibilityScore * weights.compatibility);

    const matchScore = Math.round(weightedScore * 10) / 10;

    const explanation = generateMatchExplanation(
      ngo.name,
      matchScore,
      distanceKm,
      hoursRemaining,
      ngo.capacity.currentAvailableCapacity,
      donation.quantityMeals,
      ngo.capacity.hasTransportFleet,
      ngo.capacity.hasRefrigeration,
      donation.storageRequirement
    );

    results.push({
      ngoId: (ngo._id as any).toString(),
      ngoName: ngo.name,
      organizationType: ngo.type,
      contactPerson: ngo.contactPerson,
      phone: ngo.phone,
      email: ngo.email,
      address: ngo.location.address,
      city: ngo.location.city,
      distanceKm,
      availableCapacity: ngo.capacity.currentAvailableCapacity,
      maxMealsPerDay: ngo.capacity.maxMealsPerDay,
      matchScore,
      hasTransportFleet: ngo.capacity.hasTransportFleet,
      hasRefrigeration: ngo.capacity.hasRefrigeration,
      factors: {
        urgency: urgencyScore,
        distanceKm,
        distanceScore,
        capacityScore,
        availabilityScore,
        compatibilityScore,
      },
      explanation,
    });
  }

  // Sort descending by matchScore
  return results.sort((a, b) => b.matchScore - a.matchScore);
};
