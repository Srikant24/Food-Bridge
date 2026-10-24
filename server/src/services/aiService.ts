import { GoogleGenerativeAI } from '@google/generative-ai';
import { Organization } from '../models/Organization';
import { Donation } from '../models/Donation';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiDraftResponse {
  isDraft: boolean;
  draftData?: {
    title: string;
    quantityMeals: number;
    quantityKg: number;
    foodCategory: string;
    dietaryType: string;
    storageRequirement: string;
    city: string;
    description: string;
  };
}

export interface AiChatResult {
  reply: string;
  source: 'gemini' | 'rule-based-fallback';
  draft?: AiDraftResponse['draftData'];
  recommendations?: any[];
}

/**
 * Fallback rule-based assistant for reliable offline/hackathon operation
 */
const generateRuleBasedReply = async (userPrompt: string): Promise<AiChatResult> => {
  const lower = userPrompt.toLowerCase();

  // 1. Food Listing Intent
  const mealMatch = lower.match(/(\d+)\s*(meals?|plates?|servings?|boxes?|packets?)/i) || lower.match(/\b(\d+)\b/);
  const containsFoodKeyword = lower.includes('have') || lower.includes('leftover') || lower.includes('surplus') || lower.includes('prepared') || lower.includes('curry') || lower.includes('rice') || lower.includes('bread') || lower.includes('food');

  if (mealMatch && containsFoodKeyword) {
    const mealCount = parseInt(mealMatch[1]);
    const isVeg = !lower.includes('chicken') && !lower.includes('meat') && !lower.includes('fish') && !lower.includes('mutton') && !lower.includes('egg');
    const isBakery = lower.includes('bread') || lower.includes('pastry') || lower.includes('cake') || lower.includes('croissant');
    
    const category = isBakery ? 'bakery' : 'cooked_meals';
    const storage = isBakery ? 'room_temperature' : 'hot_insulated';

    const draft = {
      title: `${mealCount} ${isVeg ? 'Vegetarian' : 'Assorted'} Surplus Meals`,
      quantityMeals: mealCount,
      quantityKg: Math.round(mealCount * 0.45 * 10) / 10,
      foodCategory: category,
      dietaryType: isVeg ? 'veg' : 'non_veg',
      storageRequirement: storage,
      city: lower.includes('noida') ? 'Greater Noida' : 'New Delhi',
      description: userPrompt,
    };

    return {
      reply: `I can help list your ${mealCount} surplus meals right away! I've pre-filled a donation draft with recommended thermal storage requirements and dietary tags. When were they prepared, and what is the latest safe collection time for your kitchen?`,
      source: 'rule-based-fallback',
      draft,
    };
  }

  // 2. Matching Algorithm Query
  if (lower.includes('algorithm') || lower.includes('formula') || lower.includes('matching') || lower.includes('score')) {
    return {
      reply: `The FoodBridge Intelligent Recommendation Engine uses a 5-factor normalized formula:\n\n` +
        `• 30% Urgency: The closer to the collection deadline, the higher the response priority.\n` +
        `• 25% Distance: Geodesic Haversine proximity between kitchen and NGO shelter coordinates.\n` +
        `• 20% Recipient Intake Capacity: Verified daily meal intake capacity to ensure immediate distribution without waste.\n` +
        `• 15% Availability: NGO pickup fleet readiness and active volunteer response.\n` +
        `• 10% Food Handling Compatibility: Verified refrigeration, insulated warm storage, and category alignment.\n\n` +
        `*Safety Note:* Any facility lacking required refrigeration for cold-stored food is automatically excluded before scoring.`,
      source: 'rule-based-fallback',
    };
  }

  // 3. Food Safety & Temperature Guidance
  if (lower.includes('safety') || lower.includes('temperature') || lower.includes('safe') || lower.includes('hot') || lower.includes('cold') || lower.includes('shelf')) {
    return {
      reply: `Here are FoodBridge's Food Safety and Temperature Standards:\n\n` +
        `• Hot Prepared Meals: Must be stored at or above 65°C (149°F) in thermal food-grade containers. Maximum collection window: 4 hours from prep time.\n` +
        `• Refrigerated Food: Chilled at 0°C to 4°C with intact cold-chain transport.\n` +
        `• Bakery & Dry Items: Ambient room temperature storage in clean crates with allergen disclosure.\n\n` +
        `*Disclaimer:* Automated platform eligibility is distinct from certified food safety inspections. Donors must certify preparation hygiene upon listing.`,
      source: 'rule-based-fallback',
    };
  }

  // 4. Pickup & OTP Procedure
  if (lower.includes('otp') || lower.includes('pickup') || lower.includes('handover') || lower.includes('driver')) {
    return {
      reply: `Here is the verified FoodBridge Handover Procedure:\n\n` +
        `1. The Provider lists surplus food $\\rightarrow$ matched NGOs are notified.\n` +
        `2. An eligible NGO requests pickup $\\rightarrow$ the Provider approves the request.\n` +
        `3. A unique 4-digit Pickup PIN is generated on the Provider's dashboard.\n` +
        `4. When the NGO driver arrives, they enter the Provider's PIN into their portal to confirm physical handover.\n` +
        `5. On delivery to the community shelter, the drop-off confirmation closes the lifecycle.`,
      source: 'rule-based-fallback',
    };
  }

  // 5. NGO Recommendations Query
  if (lower.includes('ngo') || lower.includes('shelter') || lower.includes('recipient') || lower.includes('recommend')) {
    const verifiedNgos = await Organization.find({
      type: { $in: ['ngo_shelter', 'community_kitchen', 'food_bank', 'charity'] },
      verificationStatus: 'verified',
    }).limit(3).exec();

    const ngoList = verifiedNgos.map(n => `• **${n.name}** (${n.location.city}): ${n.capacity.currentAvailableCapacity} meals capacity, ${n.capacity.hasTransportFleet ? 'Owns transport fleet' : 'Walk-in/volunteer pickup'}`).join('\n');

    return {
      reply: `Here are some of the active verified NGOs currently registered in FoodBridge:\n\n${ngoList}\n\nWhen you create a listing, our algorithm will automatically rank all recipients according to your exact location and preparation timestamp.`,
      source: 'rule-based-fallback',
      recommendations: verifiedNgos.map(n => ({ name: n.name, city: n.location.city, capacity: n.capacity.currentAvailableCapacity })),
    };
  }

  // General default fallback
  return {
    reply: `Hello! I am FoodBridge AI, your food waste reduction mentor. I can help you list surplus food batches, explain the 5-factor matching algorithm, provide food temperature guidelines, or find verified NGO shelters near you. How can I assist you today?`,
    source: 'rule-based-fallback',
  };
};

/**
 * Main FoodBridge AI Chat Handler
 */
export const processAiChat = async (
  message: string,
  history: ChatMessage[] = []
): Promise<AiChatResult> => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '') {
    return await generateRuleBasedReply(message);
  }

  try {
    // Gather localized real-time database context
    const [activeDonationsCount, verifiedNgoCount, sampleNgos] = await Promise.all([
      Donation.countDocuments({ status: 'available' }),
      Organization.countDocuments({ verificationStatus: 'verified', type: { $in: ['ngo_shelter', 'community_kitchen', 'food_bank'] } }),
      Organization.find({ verificationStatus: 'verified' }).select('name location capacity').limit(3).exec(),
    ]);

    const ngoContext = sampleNgos.map(n => `${n.name} (${n.location.city}, ${n.capacity.currentAvailableCapacity} capacity)`).join('; ');

    const systemPrompt = 
      `You are FoodBridge AI, the intelligent virtual assistant for FoodBridge (Tagline: "Rescue Food. Restore Hope."). ` +
      `Your purpose is to connect food providers (restaurants, canteens, hotels) with verified NGOs and shelters. ` +
      `Current Platform Status: ${activeDonationsCount} active donations, ${verifiedNgoCount} verified NGOs. Sample active verified partners: ${ngoContext}. ` +
      `Core Guidelines: ` +
      `1. Explain the 5-factor matching formula: 30% Urgency, 25% Distance, 20% Capacity, 15% Availability, 10% Storage Compatibility. ` +
      `2. Food safety rules: Hot food >= 65°C (max 4h window); cold food 0-4°C with cold storage. ` +
      `3. If the user mentions having meals, food, or surplus, proactively offer to draft a listing and ask clarifying questions on prep time, storage, and deadline. ` +
      `4. Never invent fictional verified partner names that are not in the database. ` +
      `5. Never certify raw food as safe solely on AI discretion. ` +
      `Be concise, encouraging, professional, and sustainability-focused.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt,
    });

    // Format chat history
    const contents: any[] = [];
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();

    // Check if natural language implies a draft
    let draftData: any = undefined;
    const lower = message.toLowerCase();
    const mealMatch = lower.match(/(\d+)\s*(meals?|plates?|servings?|boxes?)/i);
    if (mealMatch) {
      const mealCount = parseInt(mealMatch[1]);
      draftData = {
        title: `${mealCount} Surplus Meals`,
        quantityMeals: mealCount,
        quantityKg: Math.round(mealCount * 0.45 * 10) / 10,
        foodCategory: lower.includes('bread') ? 'bakery' : 'cooked_meals',
        dietaryType: lower.includes('chicken') || lower.includes('meat') ? 'non_veg' : 'veg',
        storageRequirement: 'hot_insulated',
        city: 'New Delhi',
        description: message,
      };
    }

    return {
      reply: responseText,
      source: 'gemini',
      draft: draftData,
    };
  } catch (apiErr: any) {
    console.warn('Gemini API call failed or key was invalid. Falling back gracefully to rule-based FoodBridge AI:', apiErr.message);
    return await generateRuleBasedReply(message);
  }
};
