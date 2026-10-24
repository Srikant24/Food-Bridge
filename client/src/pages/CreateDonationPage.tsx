import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createDonationListing } from '../services/api';
import { 
  Utensils, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  Bot,
  Info
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

// Helper to format Date into YYYY-MM-DDTHH:mm in local time for datetime-local input
const toLocalDatetimeInput = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const CreateDonationPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    foodCategory: 'cooked_meals',
    dietaryType: 'veg',
    quantityMeals: 50,
    quantityKg: 20,
    preparationTime: toLocalDatetimeInput(new Date(Date.now() - 60 * 60 * 1000)), // 1h ago in local time
    collectionDeadline: toLocalDatetimeInput(new Date(Date.now() + 3.5 * 60 * 60 * 1000)), // 3.5h from now in local time
    storageRequirement: 'hot_insulated',
    allergens: ['Dairy', 'Gluten'],
    address: user?.organization?.name ? `${user.organization.name}, Central Hub` : 'B-Block, Connaught Place',
    city: user?.organization?.city || 'New Delhi',
    contactName: user?.name || 'Chef In Charge',
    contactPhone: user?.phone || '+91 98112 34567',
    pickupInstructions: 'Enter through back kitchen loading bay.',
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState('');
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);

  // Quick deadline helpers using local datetime
  const setDeadlinePreset = (hours: number) => {
    const target = new Date(Date.now() + hours * 60 * 60 * 1000);
    setFormData(prev => ({ ...prev, collectionDeadline: toLocalDatetimeInput(target) }));
  };

  const handleAllergenToggle = (allergen: string) => {
    setFormData(prev => {
      const exists = prev.allergens.includes(allergen);
      return {
        ...prev,
        allergens: exists ? prev.allergens.filter(a => a !== allergen) : [...prev.allergens, allergen]
      };
    });
  };

  // AI Rapid Draft Parser (Mock / Local rule-based extractor)
  const applyAiDraft = () => {
    if (!aiDraftPrompt.trim()) return;

    const lower = aiDraftPrompt.toLowerCase();
    let meals = 50;
    const numberMatch = aiDraftPrompt.match(/\b(\d+)\b/);
    if (numberMatch) meals = parseInt(numberMatch[1]);

    const isVeg = !lower.includes('chicken') && !lower.includes('meat') && !lower.includes('fish') && !lower.includes('mutton');
    const isBakery = lower.includes('bread') || lower.includes('cake') || lower.includes('croissant') || lower.includes('pastry');
    const category = isBakery ? 'bakery' : 'cooked_meals';

    setFormData(prev => ({
      ...prev,
      title: `${meals} ${isVeg ? 'Vegetarian' : 'Assorted'} Surplus Meals`,
      description: aiDraftPrompt,
      foodCategory: category,
      dietaryType: isVeg ? 'veg' : 'non_veg',
      quantityMeals: meals,
      quantityKg: Math.round(meals * 0.45 * 10) / 10,
    }));

    showToast('info', 'AI Draft Applied', `Drafted ${meals} meal batch details from your description.`);
    setShowAiDraftModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate form submission
    setError(null);

    // Instant client validation for required fields
    if (!formData.title.trim()) {
      const msg = 'Listing title is required (minimum 3 characters).';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    if (formData.quantityMeals < 1) {
      const msg = 'Quantity must be at least 1 meal / portion.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    if (formData.quantityKg < 0.1) {
      const msg = 'Estimated weight must be at least 0.1 kg.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    const prepDate = new Date(formData.preparationTime);
    const deadlineDate = new Date(formData.collectionDeadline);
    const now = new Date();

    if (isNaN(prepDate.getTime())) {
      const msg = 'Please specify a valid food preparation time.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    if (isNaN(deadlineDate.getTime())) {
      const msg = 'Please specify a valid collection deadline.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    if (deadlineDate.getTime() <= now.getTime()) {
      const msg = 'Collection deadline must be in the future. Expired food cannot be listed.';
      setError(msg);
      showToast('error', 'Food Safety Error', msg);
      return;
    }

    if (deadlineDate.getTime() <= prepDate.getTime()) {
      const msg = 'Collection deadline cannot be earlier than food preparation time.';
      setError(msg);
      showToast('error', 'Food Safety Error', msg);
      return;
    }

    if (!formData.address.trim()) {
      const msg = 'Pickup facility address is required.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    if (!formData.city.trim()) {
      const msg = 'Pickup city is required.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    if (!formData.contactName.trim()) {
      const msg = 'Contact person name is required.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    if (!formData.contactPhone.trim() || formData.contactPhone.trim().length < 7) {
      const msg = 'Contact phone number must have at least 7 digits.';
      setError(msg);
      showToast('error', 'Validation Error', msg);
      return;
    }

    setSubmitting(true);

    try {
      // Convert local datetime input values to UTC ISO-8601 strings to guarantee timezone consistency
      const payload = {
        ...formData,
        title: formData.title.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        contactName: formData.contactName.trim(),
        contactPhone: formData.contactPhone.trim(),
        quantityMeals: Number(formData.quantityMeals),
        quantityKg: Number(formData.quantityKg),
        preparationTime: prepDate.toISOString(),
        collectionDeadline: deadlineDate.toISOString(),
      };

      const response = await createDonationListing(payload);
      showToast('success', 'Listing Published!', 'Your surplus food has been posted and matched against verified NGOs.');

      // Dispatch event to trigger live refresh across open provider and NGO dashboards
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('foodbridge:donations:updated', { detail: response.donation }));
      }

      navigate(`/donations/${response.donation._id}`);
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.response?.data?.details && typeof err.response.data.details === 'object'
          ? Object.entries(err.response.data.details)
              .map(([key, val]: [string, any]) => (val?._errors?.join(', ') ? `${key}: ${val._errors.join(', ')}` : null))
              .filter(Boolean)
              .join('. ')
          : null) ||
        err.message ||
        'Failed to create surplus listing. Please check safety requirements.';

      setError(serverMsg);
      showToast('error', 'Listing Error', serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const orgStatus = user?.organization?.verificationStatus;
  const isApproved = orgStatus === 'approved' || orgStatus === 'verified';
  const isRejected = orgStatus === 'rejected';

  if (user?.role === 'provider' && !isApproved) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto space-y-6">
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-charcoal-200 shadow-xl text-center space-y-6 bg-white">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-inner transition-transform hover:scale-105 duration-300 bg-amber-100 text-amber-800 border border-amber-200">
            {isRejected ? (
              <AlertCircle className="w-8 h-8 text-rose-600" />
            ) : (
              <Clock className="w-8 h-8 text-amber-600" />
            )}
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <span>{isRejected ? 'Application Not Approved' : 'Verification Under Review'}</span>
            </div>
            <h1 className="text-2xl font-display font-extrabold text-charcoal-900 tracking-tight">
              {isRejected ? 'Account Verification Unsuccessful' : 'Account Pending Verification'}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-600 max-w-md mx-auto leading-relaxed">
              {isRejected
                ? 'Your Food Provider application was reviewed by platform administrators and could not be approved at this time. Surplus food listings cannot be published.'
                : 'Your Food Provider registration is currently awaiting compliance verification by platform administrators. Once approved, you will be able to publish surplus food listings, manage donations, and coordinate NGO pickups.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-offwhite border border-charcoal-200 text-left text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-charcoal-100">
              <span className="text-charcoal-500 font-medium">Organization:</span>
              <span className="font-bold text-charcoal-900">{user?.organization?.name || 'Partner Kitchen'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-charcoal-100">
              <span className="text-charcoal-500 font-medium">Registered Email:</span>
              <span className="font-bold text-charcoal-900 font-mono">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-charcoal-500 font-medium">Verification Status:</span>
              <span className={`font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-[11px] ${
                isRejected ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {orgStatus || 'Pending'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/provider/dashboard"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-forest hover:bg-forest-900 text-white font-semibold text-xs shadow-glow transition-all"
            >
              Return to Provider Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-900/10 text-forest-900 text-xs font-bold mb-2">
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            <span>Food Provider Flow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900">
            List Surplus Food for Rescue
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Provide food preparation and storage specifications. Our 5-factor algorithm will rank verified NGOs instantly.
          </p>
        </div>

        {/* AI Quick Fill Button */}
        <button
          type="button"
          onClick={() => setShowAiDraftModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-forest-800 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all self-start sm:self-auto"
        >
          <Bot className="w-4 h-4 text-lime-300" />
          <span>AI Rapid Draft Fill</span>
        </button>
      </div>

      {/* Main Form */}
      <div className="glass-card rounded-3xl p-6 sm:p-10 border border-charcoal-200 shadow-md">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Food Description & Quantities */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-500 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-emerald-600" />
              <span>1. Food Classification & Quantity</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Listing Title / Headline *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. 60 North Indian Meals (Banquet Luncheon Surplus)"
                className="w-full px-4 py-2.5 rounded-xl border border-charcoal-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Food Category
                </label>
                <select
                  value={formData.foodCategory}
                  onChange={(e) => setFormData(prev => ({ ...prev, foodCategory: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-charcoal-200 text-sm bg-white font-medium"
                >
                  <option value="cooked_meals">Cooked Prepared Meals (Buffet / Thali)</option>
                  <option value="bakery">Fresh Bakery & Pastries</option>
                  <option value="packaged_produce">Packaged Food / Canned Goods</option>
                  <option value="fruits_vegetables">Fresh Fruits & Vegetables</option>
                  <option value="dairy">Dairy & Milk Products</option>
                  <option value="raw_ingredients">Uncooked Raw Ingredients (Grains / Pulses)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Dietary Classification
                </label>
                <select
                  value={formData.dietaryType}
                  onChange={(e) => setFormData(prev => ({ ...prev, dietaryType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-charcoal-200 text-sm bg-white font-medium"
                >
                  <option value="veg">Vegetarian (Pure Veg)</option>
                  <option value="vegan">Vegan (100% Plant-Based)</option>
                  <option value="contains_eggs">Egg Vegetarian (Contains Eggs)</option>
                  <option value="non_veg">Non-Vegetarian</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Estimated Portions / Meals Count *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantityMeals}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantityMeals: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-charcoal-200 text-sm font-bold"
                  />
                  <span className="text-xs text-charcoal-400 absolute right-4 top-1/2 -translate-y-1/2">
                    servings
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Estimated Total Weight (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.5"
                    value={formData.quantityKg}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantityKg: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-charcoal-200 text-sm font-bold"
                  />
                  <span className="text-xs text-charcoal-400 absolute right-4 top-1/2 -translate-y-1/2">
                    kg
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Detailed Menu Description
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Include dish names, packaging details (e.g. sealed foil boxes, insulated thermal containers)."
                className="w-full px-4 py-2 rounded-xl border border-charcoal-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Section 2: Food Safety Timestamps & Storage */}
          <div className="pt-6 border-t border-charcoal-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-500 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>2. Food Safety Timestamps & Expiry Gating</span>
            </h3>

            <div className="p-3.5 rounded-2xl bg-forest-900/5 border border-forest-900/10 text-xs text-forest-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Food Safety Requirement:</strong> Listings strictly close upon reaching collection deadline. The matching engine allocates maximum score to urgent donations to prevent decay.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Preparation Timestamp *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.preparationTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs sm:text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Collection Deadline (Safe Consumption Limit) *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.collectionDeadline}
                  onChange={(e) => setFormData(prev => ({ ...prev, collectionDeadline: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs sm:text-sm bg-white font-bold text-rose-700"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-semibold text-charcoal-500">Quick Deadline Presets:</span>
              <button
                type="button"
                onClick={() => setDeadlinePreset(2)}
                className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold hover:bg-rose-100"
              >
                +2 Hours (Critical)
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(4)}
                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold hover:bg-amber-100"
              >
                +4 Hours (Standard Evening)
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(8)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100"
              >
                +8 Hours
              </button>
              <button
                type="button"
                onClick={() => setDeadlinePreset(24)}
                className="px-2.5 py-1 rounded-lg bg-charcoal-100 text-charcoal-700 text-[11px] font-bold hover:bg-charcoal-200"
              >
                +24 Hours (Bakery / Raw)
              </button>
            </div>

            {/* Storage Condition */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Current Storage Condition & Temperature Control *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'hot_insulated', label: 'Hot Insulated', desc: 'Maintained > 65°C' },
                  { id: 'room_temperature', label: 'Room Temp', desc: 'Covered Dry' },
                  { id: 'refrigerated', label: 'Refrigerated', desc: 'Chilled < 4°C' },
                  { id: 'frozen', label: 'Frozen', desc: 'Deep Freeze < 0°C' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, storageRequirement: item.id }))}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      formData.storageRequirement === item.id
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-xs'
                        : 'border-charcoal-200 bg-white hover:bg-charcoal-50'
                    }`}
                  >
                    <div className="font-bold text-xs text-charcoal-900">{item.label}</div>
                    <div className="text-[10px] text-charcoal-500 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Allergen Flags */}
            <div className="pt-2">
              <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">
                Allergen Information (Select all present)
              </label>
              <div className="flex flex-wrap gap-2">
                {['Dairy', 'Gluten', 'Nuts', 'Soy', 'Eggs', 'Mustard', 'None'].map(allergen => {
                  const active = formData.allergens.includes(allergen);
                  return (
                    <button
                      key={allergen}
                      type="button"
                      onClick={() => handleAllergenToggle(allergen)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? 'bg-forest-900 text-white shadow-xs'
                          : 'bg-charcoal-100 text-charcoal-600 hover:bg-charcoal-200'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}{allergen}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Section 3: Pickup Location & Point of Contact */}
          <div className="pt-6 border-t border-charcoal-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-500 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>3. Pickup Coordination</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Facility Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Contact Person *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Pickup Instructions for NGO Drivers
              </label>
              <input
                type="text"
                value={formData.pickupInstructions}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupInstructions: e.target.value }))}
                placeholder="e.g. Loading dock #2, call on arrival, vehicle parking available."
                className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-sm text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-6 border-t border-charcoal-100 flex flex-col sm:flex-row items-center justify-end gap-3">
            <Link
              to="/provider"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-50 text-center"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-bold text-sm shadow-md shadow-forest-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing & Calculating NGO Matches...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-lime-400" />
                  <span>Publish & Find Matching NGOs</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* AI Rapid Draft Modal */}
      {showAiDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="glass-card rounded-3xl p-6 sm:p-8 max-w-lg w-full bg-white space-y-4 border border-emerald-300 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-900 text-lime-300 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-charcoal-900">FoodBridge AI Natural Parser</h3>
                <p className="text-xs text-charcoal-500">Paste your surplus kitchen description in plain language</p>
              </div>
            </div>

            <textarea
              rows={4}
              value={aiDraftPrompt}
              onChange={(e) => setAiDraftPrompt(e.target.value)}
              placeholder="e.g. We have around 75 boxed vegetarian meals from our conference lunch at Connaught Place. Prepared an hour ago, needs collection in 3 hours."
              className="w-full p-3 rounded-xl border border-charcoal-200 text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500/20"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAiDraftModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-600 hover:bg-charcoal-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyAiDraft}
                className="px-5 py-2 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800 shadow-sm"
              >
                Extract & Populate Fields
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
