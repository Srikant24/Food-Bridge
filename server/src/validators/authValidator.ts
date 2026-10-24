import { z } from 'zod';
import { normalizeRole } from '../utils/roleUtils';

export const RegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val), z.string().email('Invalid email address')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['provider', 'ngo'], {
    errorMap: () => ({ message: 'Public registration only permits roles: provider or ngo' })
  }).default('provider'),
  phone: z.string().min(7, 'Phone number is required').trim(),
  organizationName: z.string().min(2, 'Organization name is required').trim(),
  organizationType: z.string().transform(val => {
    const clean = String(val || '').trim().toLowerCase();
    if (clean === 'shelter') return 'ngo_shelter';
    if (clean === 'kitchen') return 'community_kitchen';
    return clean;
  }).pipe(
    z.enum([
      'restaurant', 'canteen', 'hotel', 'hostel', 'caterer', 'event_organizer',
      'ngo_shelter', 'community_kitchen', 'food_bank', 'charity'
    ])
  ),
  address: z.string().min(5, 'Address is required').trim(),
  city: z.string().min(2, 'City is required').trim(),
  coordinates: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
  // NGO-specific
  registrationNumber: z.string().optional(),
  maxMealsPerDay: z.number().optional(),
  hasRefrigeration: z.boolean().optional(),
  hasWarmStorage: z.boolean().optional(),
  hasTransportFleet: z.boolean().optional(),
});

export const LoginSchema = z.object({
  email: z.preprocess((val) => (typeof val === 'string' ? val.trim().toLowerCase() : val), z.string().email('Invalid email address')),
  password: z.string().min(1, 'Password is required'),
  portal: z.enum(['provider', 'ngo', 'admin']).optional(),
});

export const CreateDonationSchema = z.object({
  title: z.string().trim().min(3, 'Title is required (minimum 3 characters)'),
  description: z.string().optional().default(''),
  foodCategory: z.enum(
    ['cooked_meals', 'bakery', 'packaged_produce', 'fruits_vegetables', 'dairy', 'raw_ingredients'],
    { errorMap: () => ({ message: 'Please select a valid food category' }) }
  ),
  dietaryType: z.enum(
    ['veg', 'non_veg', 'vegan', 'contains_eggs'],
    { errorMap: () => ({ message: 'Please select a valid dietary classification (veg, non_veg, vegan, contains_eggs)' }) }
  ).default('veg'),
  quantityMeals: z.coerce.number().min(1, 'Quantity must be at least 1 meal / serving'),
  quantityKg: z.coerce.number().min(0.1, 'Estimated weight must be at least 0.1 kg'),
  preparationTime: z.union([z.string().min(1, 'Preparation time is required'), z.date()]),
  collectionDeadline: z.union([z.string().min(1, 'Collection deadline is required'), z.date()]),
  storageRequirement: z.string().transform(val => {
    const clean = String(val || '').trim().toLowerCase();
    if (clean === 'warm_storage' || clean === 'warm' || clean === 'hot') return 'hot_insulated';
    if (clean === 'cold_storage' || clean === 'chilled') return 'refrigerated';
    if (clean === 'ambient') return 'room_temperature';
    return clean;
  }).pipe(z.enum(['room_temperature', 'refrigerated', 'frozen', 'hot_insulated'], {
    errorMap: () => ({ message: 'Invalid storage requirement. Must be one of: room_temperature, refrigerated, frozen, hot_insulated' })
  })),
  allergens: z.array(z.string()).optional().default([]),
  address: z.string().trim().min(3, 'Pickup facility address is required'),
  city: z.string().trim().min(2, 'Pickup city is required'),
  coordinates: z.tuple([z.number(), z.number()]).optional(),
  contactName: z.string().trim().min(2, 'Contact person name is required'),
  contactPhone: z.string().trim().min(7, 'Contact phone number is required (at least 7 digits)'),
  pickupInstructions: z.string().optional().default(''),
  images: z.array(z.string()).optional().default([]),
});
