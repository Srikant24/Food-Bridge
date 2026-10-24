import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cpu, Key, ArrowRight, CheckCircle2 } from 'lucide-react';

export const TechnologySafetySection: React.FC = () => {
  return (
    <section className="py-20 lg:py-24 bg-warmwhite border-t border-forest/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-forest bg-sage/30 px-3.5 py-1 rounded-full border border-forest/15">
            <ShieldCheck className="w-3.5 h-3.5 text-forest" />
            <span>Built on Trust & Verification</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-darkink tracking-tight font-bold">
            Engineered for Safety, Speed, and Trust
          </h2>

          <p className="text-sm sm:text-base text-darkink/75 font-sans leading-relaxed max-w-2xl mx-auto">
            Food rescue must be safe and accountable. FoodBridge combines strict food safety timestamps, automated capacity matching, and cryptographic chain-of-custody verification.
          </p>
        </div>

        {/* 3 Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Pillar 1: Food Safety & Dynamic Expiry */}
          <div className="bg-cream rounded-3xl p-7 border border-forest/15 shadow-warm flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>

              <h3 className="font-serif text-2xl font-bold text-darkink">
                Food Safety Gating
              </h3>

              <p className="text-sm text-darkink/85 font-sans leading-relaxed">
                Every listing enforces mandatory preparation timestamps, temperature requirements (hot insulated vs chilled), and dynamic expiry windows. Expired batches are automatically blocked from matching.
              </p>

              <ul className="space-y-2 pt-2 border-t border-forest/10 text-xs text-darkink/90 font-sans">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Automated expiry timer isolation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Mandatory allergen & storage flags</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Zero compromised food distribution</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pillar 2: Intelligent Multi-Factor Matching */}
          <div className="bg-cream rounded-3xl p-7 border border-forest/15 shadow-warm flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center font-bold shadow-xs">
                <Cpu className="w-6 h-6 text-white" />
              </div>

              <h3 className="font-serif text-2xl font-bold text-darkink">
                Intelligent Matching
              </h3>

              <p className="text-sm text-darkink/85 font-sans leading-relaxed">
                Calculates travel distance via Haversine geodesic coordinates, recipient daily meal capacity, and vehicle fleet availability to rank verified non-profits with zero mismatch.
              </p>

              <ul className="space-y-2 pt-2 border-t border-forest/10 text-xs text-darkink/90 font-sans">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Haversine distance & route optimization</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Intake capacity matching (no food waste)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Only 100% verified non-profits</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Pillar 3: Cryptographic Custody OTPs */}
          <div className="bg-cream rounded-3xl p-7 border border-forest/15 shadow-warm flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center font-bold shadow-xs">
                <Key className="w-6 h-6 text-white" />
              </div>

              <h3 className="font-serif text-2xl font-bold text-darkink">
                Dual OTP Custody
              </h3>

              <p className="text-sm text-darkink/85 font-sans leading-relaxed">
                End-to-end auditability protected by two unique 4-digit verification OTPs: one validated at kitchen pickup, and one validated upon final handover at the beneficiary shelter.
              </p>

              <ul className="space-y-2 pt-2 border-t border-forest/10 text-xs text-darkink/90 font-sans">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Pickup OTP validated by kitchen staff</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Drop-off OTP validated by shelter manager</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                  <span>Immutable 7-stage lifecycle audit trail</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Supporting Link to Analytics & Non-Profit Directory */}
        <div className="mt-12 text-center flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/ngos"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          >
            <span>Explore Verified NGO Directory</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </Link>
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-forest/5 text-darkink font-bold text-xs border border-forest/20 shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-forest/30"
          >
            <span>View Full Impact Analytics & ESG Reports</span>
          </Link>
        </div>

      </div>
    </section>
  );
};
