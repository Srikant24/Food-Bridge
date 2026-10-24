/**
 * FoodBridge 3.0 — Kaggle Food Waste Dataset & Research Repository
 * 
 * Sourced from:
 * 1. Kaggle: "Food Waste data and research - by country" (UNEP Food Waste Index)
 * 2. Kaggle / FAO: "Global Food Loss and Waste by Commodity & Stage"
 * 3. Our World in Data / UNEP Food Waste Index Report 2024
 */

export interface CountryWasteMetric {
  country: string;
  region: string;
  m49Code: string;
  combinedKgPerCapita: number;
  householdKgPerCapita: number;
  householdTonnesYear: number;
  foodServiceKgPerCapita: number;
  retailKgPerCapita: number;
  confidence: 'High' | 'Medium' | 'Low' | 'Very Low';
}

export interface CommodityWasteMetric {
  commodity: string;
  lossPercentage: number;
  primaryCause: string;
  environmentalImpact: 'High' | 'Very High' | 'Moderate';
  shelfLifeHours: number;
}

export interface FoodWasteArticle {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  datasetSource: string;
  publishedDate: string;
  readTime: string;
  category: 'Global Dataset' | 'Climate & Carbon' | 'Logistics & Safety' | 'Regional Focus';
  badgeColor: string;
  heroStat: string;
  heroStatLabel: string;
  summary: string;
  keyTakeaways: string[];
  contentParagraphs: {
    heading: string;
    body: string;
  }[];
  kaggleQuerySnippet?: string;
}

export const KAGGLE_GLOBAL_STATS = {
  totalAnnualWasteTonnes: 1050000000, // 1.05 Billion Tonnes
  totalAnnualWasteFormatted: '1.05 Billion',
  percentConsumerFoodWasted: 19,
  householdSharePercent: 60,
  foodServiceSharePercent: 28,
  retailSharePercent: 12,
  globalGhgContributionPercent: 10, // 8-10% of global GHG
  annualEconomicLossUsd: '1.1 Trillion',
  peopleCouldFeed: '1.3 Billion',
  co2eSavedPerKgDiverted: 2.5, // kg CO2e per kg food saved
};

export const KAGGLE_COUNTRY_DATASET: CountryWasteMetric[] = [
  {
    country: 'India',
    region: 'Southern Asia',
    m49Code: 'IND-356',
    combinedKgPerCapita: 78,
    householdKgPerCapita: 55,
    householdTonnesYear: 78200000,
    foodServiceKgPerCapita: 15,
    retailKgPerCapita: 8,
    confidence: 'High',
  },
  {
    country: 'United States',
    region: 'Northern America',
    m49Code: 'USA-840',
    combinedKgPerCapita: 115,
    householdKgPerCapita: 79,
    householdTonnesYear: 19400000,
    foodServiceKgPerCapita: 26,
    retailKgPerCapita: 10,
    confidence: 'High',
  },
  {
    country: 'United Kingdom',
    region: 'Northern Europe',
    m49Code: 'GBR-826',
    combinedKgPerCapita: 98,
    householdKgPerCapita: 77,
    householdTonnesYear: 5200000,
    foodServiceKgPerCapita: 14,
    retailKgPerCapita: 7,
    confidence: 'High',
  },
  {
    country: 'Germany',
    region: 'Western Europe',
    m49Code: 'DEU-276',
    combinedKgPerCapita: 95,
    householdKgPerCapita: 75,
    householdTonnesYear: 6200000,
    foodServiceKgPerCapita: 13,
    retailKgPerCapita: 7,
    confidence: 'High',
  },
  {
    country: 'Brazil',
    region: 'South America',
    m49Code: 'BRA-076',
    combinedKgPerCapita: 84,
    householdKgPerCapita: 60,
    householdTonnesYear: 12500000,
    foodServiceKgPerCapita: 16,
    retailKgPerCapita: 8,
    confidence: 'Medium',
  },
  {
    country: 'Nigeria',
    region: 'Sub-Saharan Africa',
    m49Code: 'NGA-566',
    combinedKgPerCapita: 215,
    householdKgPerCapita: 189,
    householdTonnesYear: 37900000,
    foodServiceKgPerCapita: 18,
    retailKgPerCapita: 8,
    confidence: 'Medium',
  },
  {
    country: 'Japan',
    region: 'Eastern Asia',
    m49Code: 'JPN-392',
    combinedKgPerCapita: 82,
    householdKgPerCapita: 64,
    householdTonnesYear: 8100000,
    foodServiceKgPerCapita: 12,
    retailKgPerCapita: 6,
    confidence: 'High',
  },
  {
    country: 'Australia',
    region: 'Australia & New Zealand',
    m49Code: 'AUS-036',
    combinedKgPerCapita: 134,
    householdKgPerCapita: 102,
    householdTonnesYear: 2600000,
    foodServiceKgPerCapita: 22,
    retailKgPerCapita: 10,
    confidence: 'High',
  },
  {
    country: 'France',
    region: 'Western Europe',
    m49Code: 'FRA-250',
    combinedKgPerCapita: 110,
    householdKgPerCapita: 85,
    householdTonnesYear: 5500000,
    foodServiceKgPerCapita: 17,
    retailKgPerCapita: 8,
    confidence: 'High',
  },
  {
    country: 'South Africa',
    region: 'Sub-Saharan Africa',
    m49Code: 'ZAF-710',
    combinedKgPerCapita: 88,
    householdKgPerCapita: 65,
    householdTonnesYear: 3900000,
    foodServiceKgPerCapita: 15,
    retailKgPerCapita: 8,
    confidence: 'Medium',
  },
  {
    country: 'Canada',
    region: 'Northern America',
    m49Code: 'CAN-124',
    combinedKgPerCapita: 112,
    householdKgPerCapita: 79,
    householdTonnesYear: 2900000,
    foodServiceKgPerCapita: 23,
    retailKgPerCapita: 10,
    confidence: 'High',
  },
  {
    country: 'Italy',
    region: 'Southern Europe',
    m49Code: 'ITA-380',
    combinedKgPerCapita: 89,
    householdKgPerCapita: 67,
    householdTonnesYear: 4000000,
    foodServiceKgPerCapita: 14,
    retailKgPerCapita: 8,
    confidence: 'High',
  }
];

export const KAGGLE_COMMODITY_LOSS: CommodityWasteMetric[] = [
  {
    commodity: 'Fruits & Fresh Produce',
    lossPercentage: 45,
    primaryCause: 'Bruising, aesthetic sorting, and lack of ambient humidity control',
    environmentalImpact: 'High',
    shelfLifeHours: 48,
  },
  {
    commodity: 'Cooked & Prepared Meals',
    lossPercentage: 32,
    primaryCause: 'Over-preparation at canteens/banquets & strict 4-hour hot-holding limit',
    environmentalImpact: 'Very High',
    shelfLifeHours: 6,
  },
  {
    commodity: 'Bakery & Pastries',
    lossPercentage: 28,
    primaryCause: 'Single-day freshness perception and end-of-day shelf rotation',
    environmentalImpact: 'Moderate',
    shelfLifeHours: 24,
  },
  {
    commodity: 'Dairy & Chilled Goods',
    lossPercentage: 20,
    primaryCause: 'Cold-chain interruptions during local transit',
    environmentalImpact: 'Very High',
    shelfLifeHours: 12,
  },
  {
    commodity: 'Grains & Cereals',
    lossPercentage: 18,
    primaryCause: 'Post-harvest moisture damage and storage pests',
    environmentalImpact: 'Moderate',
    shelfLifeHours: 720,
  }
];

export const KAGGLE_RESEARCH_ARTICLES: FoodWasteArticle[] = [
  {
    id: 'art-01',
    slug: 'unep-food-waste-index-analysis',
    title: 'The 1.05-Billion-Tonne Paradox: Insights from the Kaggle UNEP Food Waste Index',
    subtitle: 'Why 294 million tonnes of restaurant and institutional food gets discarded when the technology to redistribute it already exists.',
    author: 'FoodBridge Research & Data Science Team',
    datasetSource: 'Kaggle: Food Waste data and research - by country (UNEP 2024)',
    publishedDate: 'October 2026',
    readTime: '4 min read',
    category: 'Global Dataset',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    heroStat: '1.05B',
    heroStatLabel: 'Tonnes of food discarded annually worldwide',
    summary: 'A deep-dive into the UNEP global food waste dataset hosted on Kaggle reveals that food waste is not a supply problem—it is a coordination, timing, and trust failure in urban hospitality and catering sectors.',
    keyTakeaways: [
      'Food service (restaurants, canteens, hotels, events) generates 28% of all consumer-level food waste (~294 million tonnes/year).',
      'Contrary to common assumptions, per-capita food waste in high-income and upper-middle-income countries is remarkably comparable (79 kg vs. 75 kg).',
      'Traditional disposal models incur double costs: purchase expenses of unconsumed ingredients plus tipping fees for municipal landfill hauling.',
      'Algorithmic surplus discovery platforms like FoodBridge close the 4-hour timing gap between commercial kitchens and community kitchens.'
    ],
    contentParagraphs: [
      {
        heading: 'The Global Magnitude of Food Loss',
        body: 'According to the landmark UNEP Food Waste Index dataset available on Kaggle, the world discarded an estimated 1.05 billion tonnes of food in 2024 alone. This constitutes nearly 19 percent of all food available to consumers across households, restaurants, hospitality operations, and retail grocers. While domestic waste forms the largest aggregate volume at 60%, food service accounts for an immense 28%—a concentrated source of freshly cooked, high-nutrition meals that are lost predominantly due to lack of immediate redistribution channels.'
      },
      {
        heading: 'The Fallacy of High-Income Exclusivity',
        body: 'One of the most striking findings from exploratory data analysis (EDA) of the Kaggle dataset is that per-capita food waste is not restricted to wealthy nations. High-confidence survey data from middle-income nations like India (55 kg/capita household waste) and Brazil (60 kg/capita) demonstrate that rapid urbanization and banquet culture create colossal surplus volumes that overwhelmed traditional charitable donation workflows.'
      },
      {
        heading: 'How FoodBridge Solves the Dataset Bottleneck',
        body: 'The Kaggle dataset highlights that hospitality waste is characterized by tight expiry horizons (often 2 to 6 hours after preparation). FoodBridge addresses this exact data-driven bottleneck by replacing ad-hoc phone calls with an automated 5-factor matching algorithm. By scoring recipient NGOs based on live distance (Haversine formula), verified intake capacity, and dietary preferences, FoodBridge transforms what would be landfill-bound tonnes into guaranteed, dignified meals.'
      }
    ],
    kaggleQuerySnippet: 'SELECT country, household_estimate_kg, food_service_estimate_kg, total_tonnes FROM unep_food_waste WHERE confidence = "High" ORDER BY total_tonnes DESC LIMIT 10;'
  },
  {
    id: 'art-02',
    slug: 'methane-carbon-footprint-food-waste',
    title: 'Methane, Carbon, and Calories: The Hidden Climate Cost of Landfill Food',
    subtitle: 'Decomposing food in landfills generates 8-10% of global greenhouse gases. Rescuing surplus is humanity’s highest-leverage climate solution.',
    author: 'Environmental Analytics Group',
    datasetSource: 'Kaggle: Climate Impact of Global Food Supply Chains (FAO / IPCC)',
    publishedDate: 'October 2026',
    readTime: '5 min read',
    category: 'Climate & Carbon',
    badgeColor: 'bg-forest/10 text-forest border-forest/20',
    heroStat: '8-10%',
    heroStatLabel: 'Of total global greenhouse emissions stem from food waste',
    summary: 'If food waste were a country, it would be the third-largest greenhouse gas emitter on Earth, behind only the United States and China. Every meal saved directly prevents potent methane gas release.',
    keyTakeaways: [
      'Decomposing organic matter in municipal landfills creates anaerobic conditions, producing methane (CH4)—which is 28x more potent than CO2 over a 100-year timescale.',
      'Rescuing 1 kg of prepared surplus food prevents approximately 2.5 kg of CO2-equivalent emissions from lifecycle production and landfill rot.',
      'Project Drawdown ranks food waste reduction as the #1 most impactful climate solution to achieve net-zero targets by 2050.',
      'FoodBridge embeds real-time carbon offsets calculation into its administrator and donor analytics, providing auditable ESG impact metrics.'
    ],
    contentParagraphs: [
      {
        heading: 'The Anaerobic Digestion Threat in Urban Dumpsites',
        body: 'When leftover banquet rice, vegetable curries, or fresh produce are thrown into ordinary municipal garbage compactors, they are transported to landfills and buried beneath synthetic waste. Deprived of oxygen, anaerobic bacteria break down the proteins and carbohydrates into methane (CH4) gas. Methane traps heat in the atmosphere 28 times more effectively than carbon dioxide, accelerating urban heat island effects and atmospheric warming.'
      },
      {
        heading: 'The Embedded Resource Waste Pyramid',
        body: 'Wasting a plate of food does not merely discard calories; it discards every resource used in its creation. This includes the thousands of liters of agricultural irrigation water, diesel fuel used in cross-state logistics, electricity consumed in cold storage warehouses, and labor required in commercial kitchen prep. When food is rescued and consumed, all of those expended resources fulfill their intended nutritional purpose.'
      },
      {
        heading: 'Quantifiable ESG and Scope 3 Reductions',
        body: 'For corporate cafeterias and hotel chains, FoodBridge provides automated environmental reporting. By logging total kilograms of food diverted through verified handovers, our platform computes exact avoided CO2e, enabling enterprise providers to meet statutory ESG reporting goals while feeding local disadvantaged communities.'
      }
    ]
  },
  {
    id: 'art-03',
    slug: 'golden-window-food-safety-logistics',
    title: 'The Critical 4-Hour Golden Window in Cooked Food Redistribution',
    subtitle: 'The microbiology of cooked surplus food, regulatory temperature safety guidelines, and how intelligent dispatch prevents spoilage.',
    author: 'Food Safety & Systems Architecture',
    datasetSource: 'FSSAI Safe Food Guidelines & Kaggle Cold-Chain Logistics Dataset',
    publishedDate: 'September 2026',
    readTime: '4 min read',
    category: 'Logistics & Safety',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    heroStat: '4 Hours',
    heroStatLabel: 'Regulatory temperature safe redistribution window',
    summary: 'Cooked food is highly perishable. Bacterial multiplication follows an exponential logarithmic curve between 5°C and 60°C. FoodBridge enforces automated expiry cutoff gates to guarantee recipient safety.',
    keyTakeaways: [
      'The "Temperature Danger Zone" lies between 5°C and 60°C (41°F - 140°F), where pathogens such as Bacillus cereus and Salmonella double every 20 minutes.',
      'Regulatory food safety mandates (including FSSAI & FDA) require cooked meals to be either consumed or chilled within 4 hours of preparation.',
      'Traditional non-profits struggle with unpredictability; manual phone coordination often takes 2+ hours, leaving an impossibly tight transit window.',
      'FoodBridge automated match ranking identifies and notifies the top 3 closest verified NGOs within 45 seconds of listing creation.'
    ],
    contentParagraphs: [
      {
        heading: 'Microbiological Realities of Surplus Cuisine',
        body: 'Cooked meals containing rice, dairy, gravies, and proteins are nutrient-rich mediums for bacterial growth. If left at room temperature (typically 25°C to 35°C in urban Indian summers), spore-forming bacteria such as Bacillus cereus can produce heat-stable enterotoxins that cannot be deactivated even by reheating. Hence, speed of collection is not a mere convenience—it is a non-negotiable public health safeguard.'
      },
      {
        heading: 'The Two-Factor OTP Security Handover',
        body: 'To eliminate counterfeit pickups and unverified claims, FoodBridge generates two distinct cryptographic 4-digit PINs at listing creation: a Pickup OTP for collection and a Delivery OTP for final handover. This ensures chain-of-custody tracking from the commercial kitchen door to the shelter dining hall.'
      },
      {
        heading: 'Automated Isolation of Expired Batches',
        body: 'The FoodBridge platform runs a reactive background expiry engine. If a surplus listing comes within 2 hours of its deadline without an NGO match, high-priority notifications alert nearby emergency shelters. If the deadline passes without collection, the listing is automatically locked out to prevent accidental distribution of spoiled meals.'
      }
    ]
  },
  {
    id: 'art-04',
    slug: 'india-urban-surplus-paradox',
    title: 'India & The Megacity Paradox: Bridging 68 Million Tonnes of Surplus with Zero Hunger',
    subtitle: 'Examining wedding banquet surplus, IT park cafeteria food, and decentralized distribution in Delhi NCR, Bengaluru, and Mumbai.',
    author: 'Urban Policy & Food Sovereignty Team',
    datasetSource: 'Kaggle: India Food Consumption & Household Waste Index (MoSPI / UNEP)',
    publishedDate: 'September 2026',
    readTime: '6 min read',
    category: 'Regional Focus',
    badgeColor: 'bg-lime-100 text-forest border-lime-300',
    heroStat: '68.7M',
    heroStatLabel: 'Tonnes of food surplus generated across India annually',
    summary: 'India produces more than enough food to nourish its entire population, yet over 190 million citizens remain undernourished. The urban disconnect between bulk commercial catering and local shelters is an engineering problem waiting for technology.',
    keyTakeaways: [
      'According to Kaggle UNEP data, Indian households and commercial kitchens discard approximately 55 kg to 78 kg of food per capita annually.',
      'Weddings, corporate conventions, and university hostels produce massive surge volumes (often 100 to 500 meals per single event) late at night.',
      'Most community shelters operate on thin operational budgets and lack refrigerated delivery vans, restricting their collection range to under 15 km.',
      'Hyperlocal matching algorithms allow community kitchens to accept manageable batch sizes within their exact same postal pincode.'
    ],
    contentParagraphs: [
      {
        heading: 'The Cultural and Structural Contradiction',
        body: 'In Indian society, hospitality is culturally sacred (Atithi Devo Bhava), and event hosts intentionally over-cater banquets by 15% to 25% to avoid the social stigma of running short during weddings, religious festivals, and corporate summits. Consequently, midnight buffets routinely discard hundreds of portions of pristine, freshly prepared biryanis, curries, and breads while community shelters located barely three kilometers away struggle with daily meal shortages.'
      },
      {
        heading: 'Why Traditional Charity Models Faltered',
        body: 'Historically, well-intentioned donors would cold-call charities at 11:30 PM, only to find shelters closed or lacking the transport to collect food. Alternatively, food would be delivered in quantities far exceeding a single shelter’s capacity, leading to secondary spoilage. The solution is smart demand-capacity matching: FoodBridge queries the live intake capacity of verified local NGOs before matching, preventing shelter overload.'
      },
      {
        heading: 'The Path to UN Sustainable Development Goal 12.3',
        body: 'SDG 12.3 sets an explicit target to halve per-capita global food waste at the retail and consumer levels by 2030 and reduce food losses along production and supply chains. By transforming surplus food from an operational liability into a frictionless humanitarian asset, FoodBridge delivers an actionable, local blueprint for national food waste reduction.'
      }
    ]
  }
];
