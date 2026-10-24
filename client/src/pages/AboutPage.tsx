import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  AlertTriangle
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest-900/10 text-forest-900 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>About FoodBridge • Problem Statement BONUS01</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-charcoal-900 leading-tight">
          Rescue Food. <span className="text-gradient-emerald">Restore Hope.</span>
        </h1>
        <p className="text-base text-charcoal-600 leading-relaxed font-normal">
          FoodBridge is an intelligent food waste reduction and redistribution platform engineered for our college hackathon. We bridge the gap between commercial kitchens with surplus food and verified shelters striving to feed communities in need.
        </p>
      </div>

      {/* 4-Step Interactive Process */}
      <div className="space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">Step-by-Step Flow</h2>
          <p className="text-2xl font-display font-extrabold text-charcoal-900">How FoodBridge Works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-3xl border border-charcoal-200/80 space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-forest text-white font-extrabold text-base flex items-center justify-center font-display shadow-xs">
              1
            </div>
            <h3 className="font-bold text-base text-charcoal-900">Kitchen Surplus Listing</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Restaurants, hotels, or college canteens list surplus meals in under 2 minutes, specifying preparation times, storage conditions, and expiry limits.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-charcoal-200/80 space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-forest-700 text-white font-extrabold text-base flex items-center justify-center font-display shadow-xs">
              2
            </div>
            <h3 className="font-bold text-base text-charcoal-900">5-Factor AI Recommendation</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Our backend calculates normalized weights: 30% Urgency, 25% Distance, 20% Capacity, 15% Fleet Availability, and 10% Storage Compatibility.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-charcoal-200/80 space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-apricot text-darkink font-extrabold text-base flex items-center justify-center font-display shadow-xs">
              3
            </div>
            <h3 className="font-bold text-base text-charcoal-900">OTP Handover Protocol</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              When the verified NGO volunteer or van driver arrives, the provider provides a 4-digit security PIN to confirm physical custody and prevent misplacement.
            </p>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-charcoal-200/80 space-y-3 relative">
            <div className="w-10 h-10 rounded-2xl bg-darkink text-white font-extrabold text-base flex items-center justify-center font-display shadow-xs">
              4
            </div>
            <h3 className="font-bold text-base text-charcoal-900">Delivery & Impact Log</h3>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Meals reach shelter beneficiaries, and carbon offsets are immediately calculated and recorded in public impact analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Safety & Standards */}
      <div className="glass-card rounded-3xl p-8 sm:p-12 border border-charcoal-200 bg-gradient-to-br from-white via-white to-emerald-50/30 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-charcoal-900">Food Safety & Compliance Disclaimer</h3>
            <p className="text-xs text-charcoal-500">Adhering to Good Samaritan and Food Safety Guidelines</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-charcoal-700 leading-relaxed">
          <p>
            FoodBridge enforces automated timestamp tracking, mandatory temperature classifications, and automated listing expiry. Expired listings are quarantined and excluded from matching.
          </p>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Important Distinction:</strong> Automated platform eligibility does not replace food safety inspection. Donors must certify that all items were prepared hygienically according to local health standards.
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap gap-4">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-forest-900 text-white text-xs font-semibold hover:bg-forest-800"
          >
            <span>Register as Provider or NGO</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/donations"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:bg-charcoal-50"
          >
            <span>Browse Active Listings</span>
          </Link>
        </div>
      </div>

    </div>
  );
};
