import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';
import { DonationRequest } from '../models/DonationRequest';
import { hashOtp, encryptOtp } from '../utils/otpCrypto';

export const seedDatabase = async (): Promise<{ message: string; counts: any }> => {
  try {
    // Clear existing demo collections while strictly preserving permanently registered user accounts
    await User.deleteMany({
      $or: [
        { isDemo: true },
        { email: { $in: ['provider@foodbridge.org', 'ngo@hopekitchen.org', 'admin@foodbridge.org', 'canteen@campus.edu'] } }
      ]
    });
    await Organization.deleteMany({ isDemo: true });
    await Donation.deleteMany({ isDemo: true });
    await DonationRequest.deleteMany({ isDemo: true });

    console.log('🌱 Seeding fresh demo database for FoodBridge Hackathon...');

    const salt = await bcrypt.genSalt(10);
    const demoPasswordHash = await bcrypt.hash('password123', salt);

    // ==========================================
    // 1. ORGANIZATIONS
    // ==========================================

    // Provider 1: Grand Spice Banquet & Kitchen
    const providerOrg1 = await Organization.create({
      name: 'Grand Spice Banquet & Kitchen',
      type: 'restaurant',
      description: 'Fine dining and event banquet with regular evening surplus food batches.',
      registrationNumber: 'REG-DEL-2023-9821',
      contactPerson: 'Chef Rajesh Sharma',
      phone: '+91 98112 34567',
      email: 'rajesh@grandspice.com',
      location: {
        type: 'Point',
        coordinates: [77.2195, 28.6328], // Connaught Place, New Delhi
        address: 'B-Block, Connaught Place',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      verificationStatus: 'verified',
      capacity: {
        maxMealsPerDay: 300,
        currentAvailableCapacity: 0,
        hasRefrigeration: true,
        hasWarmStorage: true,
        hasTransportFleet: true,
        activeVolunteers: 0,
      },
      isDemo: true,
    });

    // Provider 2: Campus Green Canteen
    const providerOrg2 = await Organization.create({
      name: 'Campus Green Canteen (Engineering Block)',
      type: 'canteen',
      description: 'College university student cafeteria serving 2,000+ meals daily.',
      registrationNumber: 'CANTEEN-UNIV-441',
      contactPerson: 'Arun Verma',
      phone: '+91 98765 43210',
      email: 'canteen@campus.edu',
      location: {
        type: 'Point',
        coordinates: [77.4988, 28.4744], // Greater Noida
        address: 'Knowledge Park II',
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
        pincode: '201306',
      },
      verificationStatus: 'verified',
      capacity: {
        maxMealsPerDay: 500,
        currentAvailableCapacity: 0,
        hasRefrigeration: true,
        hasWarmStorage: true,
        hasTransportFleet: false,
        activeVolunteers: 0,
      },
      isDemo: true,
    });

    // Provider 3: Hotel Royal Palace & Suites
    const providerOrg3 = await Organization.create({
      name: 'Hotel Royal Palace & Suites',
      type: 'hotel',
      description: 'Luxury hotel buffet and international cafe.',
      registrationNumber: 'HOTEL-DEL-8871',
      contactPerson: 'Vikram Seth',
      phone: '+91 99554 43322',
      email: 'food@royalpalace.in',
      location: {
        type: 'Point',
        coordinates: [77.1215, 28.5528], // Aerocity, New Delhi
        address: 'Hospitality District, Aerocity',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110037',
      },
      verificationStatus: 'verified',
      capacity: {
        maxMealsPerDay: 250,
        currentAvailableCapacity: 0,
        hasRefrigeration: true,
        hasWarmStorage: true,
        hasTransportFleet: true,
        activeVolunteers: 0,
      },
      isDemo: true,
    });

    // NGO 1: Hope Community Shelter (Main Demo NGO)
    const ngoOrg1 = await Organization.create({
      name: 'Hope Community Shelter & Food Bank',
      type: 'ngo_shelter',
      description: 'Non-profit 120-bed homeless shelter and evening soup kitchen.',
      registrationNumber: 'NGO-80G-DEL-2018-091',
      contactPerson: 'Priya Mehra',
      phone: '+91 98101 23456',
      email: 'ngo@hopekitchen.org',
      location: {
        type: 'Point',
        coordinates: [77.2404, 28.6432], // Daryaganj, New Delhi (~2.2 km from Connaught Place)
        address: '14/2 Netaji Subhash Marg, Daryaganj',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110002',
      },
      serviceRadiusKm: 25,
      verificationStatus: 'verified',
      verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      capacity: {
        maxMealsPerDay: 800,
        currentAvailableCapacity: 800,
        hasRefrigeration: true,
        hasWarmStorage: true,
        hasTransportFleet: true,
        activeVolunteers: 12,
      },
      compatibleCategories: ['cooked_meals', 'bakery', 'packaged_produce', 'fruits_vegetables', 'dairy'],
      isDemo: true,
    });

    // NGO 2: Annapurna Seva Trust
    const ngoOrg2 = await Organization.create({
      name: 'Annapurna Seva Trust',
      type: 'community_kitchen',
      description: 'Community kitchen providing free nutritious lunches for migrant workers.',
      registrationNumber: 'TRUST-DEL-1092',
      contactPerson: 'Sunil Rao',
      phone: '+91 97110 98765',
      email: 'annapurna@trust.org',
      location: {
        type: 'Point',
        coordinates: [77.1906, 28.6517], // Karol Bagh (~3.5 km from CP)
        address: 'Arya Samaj Road, Karol Bagh',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110005',
      },
      serviceRadiusKm: 15,
      verificationStatus: 'verified',
      verifiedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      capacity: {
        maxMealsPerDay: 150,
        currentAvailableCapacity: 90,
        hasRefrigeration: true,
        hasWarmStorage: true,
        hasTransportFleet: false,
        activeVolunteers: 6,
      },
      compatibleCategories: ['cooked_meals', 'fruits_vegetables', 'raw_ingredients'],
      isDemo: true,
    });

    // NGO 3: Robin Hood Relief Foundation
    const ngoOrg3 = await Organization.create({
      name: 'Robin Hood Relief Foundation',
      type: 'food_bank',
      description: 'Volunteer network with 3 refrigerated vans collecting large event surplus.',
      registrationNumber: 'NGO-NOIDA-7734',
      contactPerson: 'Meenakshi Iyer',
      phone: '+91 98990 11223',
      email: 'contact@robinhoodrelief.org',
      location: {
        type: 'Point',
        coordinates: [77.3638, 28.6258], // Noida Sector 62
        address: 'Institutional Area, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201309',
      },
      serviceRadiusKm: 35,
      verificationStatus: 'verified',
      verifiedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      capacity: {
        maxMealsPerDay: 300,
        currentAvailableCapacity: 250,
        hasRefrigeration: true,
        hasWarmStorage: true,
        hasTransportFleet: true,
        activeVolunteers: 25,
      },
      compatibleCategories: ['cooked_meals', 'bakery', 'packaged_produce', 'dairy', 'fruits_vegetables'],
      isDemo: true,
    });

    // NGO 4: Aanchal Child Shelter (Pending Verification)
    const ngoOrg4 = await Organization.create({
      name: 'Aanchal Child Welfare Shelter',
      type: 'ngo_shelter',
      description: 'Shelter home for 40 orphaned and underprivileged children.',
      registrationNumber: 'PENDING-REG-2024-001',
      contactPerson: 'Anjali Nair',
      phone: '+91 98450 12349',
      email: 'anjali@aanchalshelter.org',
      location: {
        type: 'Point',
        coordinates: [77.2433, 28.5677], // Lajpat Nagar
        address: 'Block E, Lajpat Nagar II',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110024',
      },
      serviceRadiusKm: 12,
      verificationStatus: 'pending',
      capacity: {
        maxMealsPerDay: 50,
        currentAvailableCapacity: 45,
        hasRefrigeration: true,
        hasWarmStorage: false,
        hasTransportFleet: false,
        activeVolunteers: 3,
      },
      compatibleCategories: ['cooked_meals', 'dairy', 'fruits_vegetables', 'bakery'],
      isDemo: true,
    });

    // ==========================================
    // 2. USERS (Demo Accounts)
    // ==========================================

    const providerUser = await User.create({
      name: 'Chef Rajesh Sharma',
      email: 'provider@foodbridge.org',
      passwordHash: demoPasswordHash,
      role: 'provider',
      phone: '+91 98112 34567',
      organizationId: providerOrg1._id,
      isActive: true,
      isDemo: true,
    });

    const ngoUser = await User.create({
      name: 'Priya Mehra',
      email: 'ngo@hopekitchen.org',
      passwordHash: demoPasswordHash,
      role: 'ngo',
      phone: '+91 98101 23456',
      organizationId: ngoOrg1._id,
      isActive: true,
      isDemo: true,
    });

    const adminUser = await User.create({
      name: 'FoodBridge Operations Admin',
      email: 'admin@foodbridge.org',
      passwordHash: demoPasswordHash,
      role: 'admin',
      phone: '+91 98000 00000',
      isActive: true,
      isDemo: true,
    });

    // Additional User for Canteen
    await User.create({
      name: 'Arun Verma',
      email: 'canteen@campus.edu',
      passwordHash: demoPasswordHash,
      role: 'provider',
      phone: '+91 98765 43210',
      organizationId: providerOrg2._id,
      isActive: true,
      isDemo: true,
    });

    // Dedicated Taj Kitchens Provider Demo
    await User.create({
      name: 'Chef Rajesh Kumar (Taj)',
      email: 'taj.kitchens@foodbridge.org',
      passwordHash: demoPasswordHash,
      role: 'provider',
      phone: '+91 98112 23344',
      organizationId: providerOrg1._id,
      isActive: true,
      isDemo: true,
    });

    // Dedicated Delhi Shelters NGO Demo
    await User.create({
      name: 'Priya Sharma (Delhi Shelters)',
      email: 'delhi.shelters@foodbridge.org',
      passwordHash: demoPasswordHash,
      role: 'ngo',
      phone: '+91 98776 65544',
      organizationId: ngoOrg1._id,
      isActive: true,
      isDemo: true,
    });

    // ==========================================
    // 3. DONATIONS (Realistic Hackathon Scenarios)
    // ==========================================

    const now = new Date();

    // 1. URGENT AVAILABLE DONATION (2.5 hours remaining)
    const urgentDonation = await Donation.create({
      title: '60 North Indian Meals (Banquet Luncheon Surplus)',
      description: 'Freshly prepared vegetarian feast: Shahi Paneer, Dal Makhani, Jeera Basmati Rice, and Butter Naan. Insulated food warmers maintained at 65°C.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 60,
      quantityKg: 28.5,
      preparationTime: new Date(now.getTime() - 2 * 60 * 60 * 1000), // prepared 2h ago
      collectionDeadline: new Date(now.getTime() + 2.5 * 60 * 60 * 1000), // deadline in 2.5h (CRITICAL URGENCY)
      storageRequirement: 'hot_insulated',
      allergens: ['Dairy', 'Gluten'],
      location: {
        type: 'Point',
        coordinates: [77.2195, 28.6328],
        address: 'B-Block Banquet Hall, Connaught Place',
        city: 'New Delhi',
        pincode: '110001',
      },
      providerId: providerUser._id,
      organizationId: providerOrg1._id,
      status: 'available',
      pickupContact: {
        name: 'Chef Rajesh Sharma',
        phone: '+91 98112 34567',
        pickupInstructions: 'Enter through rear kitchen loading dock #2. Containers packed in thermal warmers.',
      },
      pickupOtp: '4821',
      deliveryOtp: '7190',
      images: ['/images/rice_dal_surplus.jpg'],
      timeline: [
        {
          status: 'available',
          timestamp: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
          note: 'Surplus buffet meals packed and listed for urgent redistribution.',
          actorId: providerUser._id,
          actorName: providerUser.name,
          actorRole: 'provider',
        }
      ],
      isDemo: true,
    });

    // 2. FRESH BAKERY DONATION (Available, 7 hours remaining)
    await Donation.create({
      title: '45 Artisan Multigrain Breads & Croissants',
      description: 'Morning bake surplus: French baguettes, multigrain sandwich loaves, and butter croissants in clean food-grade crates.',
      foodCategory: 'bakery',
      dietaryType: 'contains_eggs',
      quantityMeals: 45,
      quantityKg: 14.0,
      preparationTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      collectionDeadline: new Date(now.getTime() + 7 * 60 * 60 * 1000),
      storageRequirement: 'room_temperature',
      allergens: ['Gluten', 'Eggs'],
      location: {
        type: 'Point',
        coordinates: [77.1215, 28.5528],
        address: 'Royal Palace Pastry Kitchen, Aerocity',
        city: 'New Delhi',
        pincode: '110037',
      },
      providerId: providerUser._id,
      organizationId: providerOrg3._id,
      status: 'available',
      pickupContact: {
        name: 'Vikram Seth',
        phone: '+91 99554 43322',
        pickupInstructions: 'Collect from main hotel service bay.',
      },
      pickupOtp: '1934',
      deliveryOtp: '6250',
      images: ['/images/artisanal_bakery_surplus.jpg'],
      timeline: [
        {
          status: 'available',
          timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000),
          note: 'Bakery surplus catalogued and available.',
          actorName: 'Vikram Seth',
          actorRole: 'provider',
        }
      ],
      isDemo: true,
    });

    // 3. FRESH PREPARED RICE & DAL SURPLUS (Available, 5 hours remaining)
    await Donation.create({
      title: '70 Portions Steamed Basmati Rice & Dal Makhani',
      description: 'Slow-simmered black lentils with rich butter gravy and fluffy cumin basmati rice. Kept in temperature-insulated food warmers.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 70,
      quantityKg: 32.0,
      preparationTime: new Date(now.getTime() - 1.5 * 60 * 60 * 1000),
      collectionDeadline: new Date(now.getTime() + 5 * 60 * 60 * 1000),
      storageRequirement: 'hot_insulated',
      allergens: ['Dairy'],
      location: {
        type: 'Point',
        coordinates: [77.2195, 28.6328],
        address: 'Barakhamba Road, Connaught Place',
        city: 'New Delhi',
        pincode: '110001',
      },
      providerId: providerUser._id,
      organizationId: providerOrg1._id,
      status: 'available',
      pickupContact: {
        name: 'Chef Rajesh Sharma',
        phone: '+91 98112 34567',
        pickupInstructions: 'Kitchen loading dock 1. Containers ready.',
      },
      pickupOtp: '3341',
      deliveryOtp: '9812',
      images: ['/images/rice_dal_surplus.jpg'],
      timeline: [
        {
          status: 'available',
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
          note: 'Fresh cooked meals listed for afternoon redistribution.',
          actorName: providerUser.name,
          actorRole: 'provider',
        }
      ],
      isDemo: true,
    });

    // 4. IN-TRANSIT / PICKUP SCHEDULED DONATION
    const scheduledDonation = await Donation.create({
      title: '110 Cooked Meals (Corporate Conference Catering)',
      description: 'Rice bowls with mixed lentils, seasonal vegetable poriyal, and chapatis. Sealed in individual hygienic foil boxes.',
      foodCategory: 'cooked_meals',
      dietaryType: 'vegan',
      quantityMeals: 110,
      quantityKg: 52.0,
      preparationTime: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      collectionDeadline: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      storageRequirement: 'hot_insulated',
      allergens: [],
      location: {
        type: 'Point',
        coordinates: [77.2195, 28.6328],
        address: 'B-Block Banquet Hall, Connaught Place',
        city: 'New Delhi',
        pincode: '110001',
      },
      providerId: providerUser._id,
      organizationId: providerOrg1._id,
      assignedNgoId: ngoOrg1._id,
      status: 'pickup_scheduled',
      pickupContact: {
        name: 'Chef Rajesh Sharma',
        phone: '+91 98112 34567',
        pickupInstructions: 'Dock #2. OTP required on collection.',
      },
      pickupOtp: '5520',
      pickupOtpHashed: hashOtp('5520'),
      pickupOtpEncrypted: encryptOtp('5520'),
      pickupOtpExpiresAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour validity
      pickupOtpAttempts: 0,
      pickupOtpMaxAttempts: 5,
      pickupOtpAuthorizedNgoId: ngoOrg1._id,
      deliveryOtp: '8831',
      images: ['/images/corporate_catering_meals.jpg'],
      timeline: [
        {
          status: 'available',
          timestamp: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
          note: 'Donation created.',
          actorName: providerUser.name,
          actorRole: 'provider',
        },
        {
          status: 'requested',
          timestamp: new Date(now.getTime() - 1.8 * 60 * 60 * 1000),
          note: 'Hope Community Shelter submitted collection request.',
          actorName: ngoUser.name,
          actorRole: 'ngo',
        },
        {
          status: 'accepted',
          timestamp: new Date(now.getTime() - 1.2 * 60 * 60 * 1000),
          note: 'Provider approved Hope Community Shelter.',
          actorName: providerUser.name,
          actorRole: 'provider',
        },
        {
          status: 'pickup_scheduled',
          timestamp: new Date(now.getTime() - 40 * 60 * 1000),
          note: 'Volunteer van dispatched for collection. Scheduled arrival in 20 mins.',
          actorName: ngoUser.name,
          actorRole: 'ngo',
        }
      ],
      isDemo: true,
    });

    // Create approved request record for the scheduled donation
    await DonationRequest.create({
      donationId: scheduledDonation._id,
      ngoId: ngoUser._id,
      ngoOrganizationId: ngoOrg1._id,
      status: 'approved',
      requestNotes: 'Dispatched electric insulated delivery van. Driver: Amit.',
      estimatedPickupTime: new Date(now.getTime() + 20 * 60 * 1000),
      matchScore: 94.8,
      matchDetails: {
        urgencyScore: 95,
        distanceKm: 2.2,
        distanceScore: 96,
        capacityScore: 92,
        availabilityScore: 100,
        storageScore: 90,
      },
      pickupOtpHash: hashOtp('5520'),
      pickupOtpExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
      pickupOtpAttempts: 0,
      isDemo: true,
    });

    // 5. COMPLETED DONATION (Delivered & Verified)
    await Donation.create({
      title: '85 Dinner Meals from Hostel Mess',
      description: 'Nutritious dinner meals: Rajma masala, steamed rice, roti, and cucumber salad.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 85,
      quantityKg: 38.0,
      preparationTime: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      collectionDeadline: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      storageRequirement: 'room_temperature',
      allergens: [],
      location: {
        type: 'Point',
        coordinates: [77.4988, 28.4744],
        address: 'Knowledge Park II',
        city: 'Greater Noida',
        pincode: '201306',
      },
      providerId: providerUser._id,
      organizationId: providerOrg2._id,
      assignedNgoId: ngoOrg1._id,
      status: 'completed',
      pickupContact: {
        name: 'Arun Verma',
        phone: '+91 98765 43210',
      },
      images: ['/images/hostel_mess_meals.jpg'],
      timeline: [
        {
          status: 'available',
          timestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000),
          note: 'Donation created.',
          actorName: 'Arun Verma',
          actorRole: 'provider',
        },
        {
          status: 'picked_up',
          timestamp: new Date(now.getTime() - 23 * 60 * 60 * 1000),
          note: 'Collected successfully by Hope Community Shelter. OTP validated.',
          actorName: 'Priya Mehra',
          actorRole: 'ngo',
        },
        {
          status: 'delivered',
          timestamp: new Date(now.getTime() - 21 * 60 * 60 * 1000),
          note: 'Delivered to Daryaganj Night Shelter.',
          actorName: 'Priya Mehra',
          actorRole: 'ngo',
        },
        {
          status: 'completed',
          timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000),
          note: '85 beneficiaries served hot meals. Zero waste recorded.',
          actorName: 'Priya Mehra',
          actorRole: 'ngo',
        }
      ],
      isDemo: true,
    });

    // 6. EXPIRED DONATION (Historical Record for Audits)
    await Donation.create({
      title: '35 Lunch Bento Packs (Morning Workshop Surplus)',
      description: 'Vegetable pulao, mixed pickle, and roasted papad from a concluded corporate workshop.',
      foodCategory: 'cooked_meals',
      dietaryType: 'veg',
      quantityMeals: 35,
      quantityKg: 15.0,
      preparationTime: new Date(now.getTime() - 10 * 60 * 60 * 1000),
      collectionDeadline: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      storageRequirement: 'room_temperature',
      allergens: [],
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
        address: 'KG Marg, Connaught Place',
        city: 'New Delhi',
        pincode: '110001',
      },
      providerId: providerUser._id,
      organizationId: providerOrg1._id,
      status: 'expired',
      pickupContact: {
        name: 'Chef Rajesh Sharma',
        phone: '+91 98112 34567',
      },
      images: ['/images/food_prep_detail.jpg'],
      timeline: [
        {
          status: 'available',
          timestamp: new Date(now.getTime() - 10 * 60 * 60 * 1000),
          note: 'Surplus meals listed.',
          actorName: providerUser.name,
          actorRole: 'provider',
        },
        {
          status: 'expired',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          note: 'Automatically marked expired by food safety monitoring system.',
          actorName: 'Automated Safety Monitor',
          actorRole: 'system',
        }
      ],
      isDemo: true,
    });

    console.log('✓ Demo database seeded successfully!');

    return {
      message: 'Demo database seeded successfully with realistic test records',
      counts: {
        organizations: 7,
        users: 4,
        donations: 4,
        requests: 1,
      }
    };
  } catch (error: any) {
    console.error('Seed error:', error);
    throw error;
  }
};
