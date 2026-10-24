/**
 * donationImageResolver.ts
 * Intelligently resolves food photographs for donations based on uploaded images,
 * title semantics, and food categories. Avoids unmatching or random images.
 */

export const resolveDonationPhoto = (donation: {
  title?: string;
  foodCategory?: string;
  images?: string[];
}): string => {
  // If a valid custom image was uploaded, verify it isn't an unmatching placeholder
  if (donation.images && donation.images.length > 0 && donation.images[0]) {
    const firstImg = donation.images[0];
    
    // Catch legacy placeholder Unsplash salad image previously assigned to corporate conference catering
    if (firstImg.includes('photo-1512621776951')) {
      return '/images/corporate_catering_meals.jpg';
    }

    if (firstImg.startsWith('/images/') || firstImg.startsWith('http')) {
      return firstImg;
    }
  }

  const titleLower = (donation.title || '').toLowerCase();
  const categoryLower = (donation.foodCategory || '').toLowerCase();

  // 1. Corporate conference / catering buffet
  if (
    titleLower.includes('corporate') ||
    titleLower.includes('conference') ||
    titleLower.includes('catering') ||
    titleLower.includes('buffet')
  ) {
    return '/images/corporate_catering_meals.jpg';
  }

  // 2. Hostel mess / college canteen / rajma dinner meals
  if (
    titleLower.includes('hostel') ||
    titleLower.includes('mess') ||
    titleLower.includes('canteen') ||
    titleLower.includes('rajma')
  ) {
    return '/images/hostel_mess_meals.jpg';
  }

  // 3. Rice & Dal / North Indian feast / Curry & Naan
  if (
    titleLower.includes('rice') ||
    titleLower.includes('dal') ||
    titleLower.includes('north indian') ||
    titleLower.includes('paneer') ||
    titleLower.includes('thali') ||
    titleLower.includes('banquet')
  ) {
    return '/images/rice_dal_surplus.jpg';
  }

  // 4. Bakery / Breads / Croissants / Pastries
  if (
    categoryLower.includes('bakery') ||
    titleLower.includes('bread') ||
    titleLower.includes('croissant') ||
    titleLower.includes('baguette') ||
    titleLower.includes('pastry')
  ) {
    return '/images/artisanal_bakery_surplus.jpg';
  }

  // 5. Produce / Farm vegetables & fruits
  if (
    categoryLower.includes('produce') ||
    categoryLower.includes('fruit') ||
    categoryLower.includes('vegetable')
  ) {
    return '/images/hero_food_basket.jpg';
  }

  // 6. Generic Cooked Meals fallback
  if (categoryLower.includes('cook') || categoryLower.includes('meal')) {
    return '/images/rice_dal_surplus.jpg';
  }

  // 7. Wholesome community kitchen default
  return '/images/community_food_rescue.jpg';
};

export const formatFoodCategory = (category: string): string => {
  switch (category) {
    case 'cooked_meals':
      return 'Cooked Meals';
    case 'bakery':
      return 'Artisanal Bakery';
    case 'packaged_groceries':
    case 'packaged_produce':
      return 'Packaged Goods';
    case 'raw_produce':
    case 'fruits_vegetables':
      return 'Fresh Produce';
    case 'dairy':
      return 'Dairy Supplies';
    default:
      return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

export const formatDonationDeadline = (
  deadlineIso?: string,
  nowMs = Date.now()
): { text: string; isExpired: boolean; isUrgent: boolean; hoursLeft: number } => {
  if (!deadlineIso) {
    return { text: 'Flexible Pickup', isExpired: false, isUrgent: false, hoursLeft: 24 };
  }

  try {
    const deadlineTime = new Date(deadlineIso).getTime();
    const diffMs = deadlineTime - nowMs;
    const isExpired = diffMs <= 0;
    const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
    const minsLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const date = new Date(deadlineIso);
    const dateFormatted = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isExpired) {
      return {
        text: `Expired on ${dateFormatted}, ${timeFormatted}`,
        isExpired: true,
        isUrgent: false,
        hoursLeft: 0,
      };
    }

    const isUrgent = hoursLeft < 3;
    if (hoursLeft < 1) {
      return {
        text: `Critical: ${minsLeft}m left (${timeFormatted})`,
        isExpired: false,
        isUrgent: true,
        hoursLeft: 0,
      };
    }

    if (hoursLeft < 6) {
      return {
        text: `${hoursLeft}h ${minsLeft}m left (Today, ${timeFormatted})`,
        isExpired: false,
        isUrgent,
        hoursLeft,
      };
    }

    return {
      text: `${dateFormatted} by ${timeFormatted}`,
      isExpired: false,
      isUrgent: false,
      hoursLeft,
    };
  } catch {
    return { text: 'Same-Day Window', isExpired: false, isUrgent: false, hoursLeft: 6 };
  }
};
