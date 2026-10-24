import React from 'react';
import { motion } from 'framer-motion';
import { 
  ClipboardList, 
  Sparkles, 
  HeartHandshake, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  {
    number: '01',
    title: 'List Surplus Food',
    subtitle: 'Under 2 Minutes with Safety Gating',
    description: 'Hotels, college canteens, and restaurants describe surplus meals in plain English. Automated temperature gating and expiry countdowns guarantee food safety.',
    icon: ClipboardList,
    accent: 'bg-sage/40 text-forest border-forest/20',
    tag: 'Safe Intake'
  },
  {
    number: '02',
    title: 'Smart NGO Matching',
    subtitle: 'Capacity & Distance Optimization',
    description: 'Our engine instantly ranks verified local charities based on Haversine travel distance, shelter intake capacity, dietary compatibility, and real-time fleet availability.',
    icon: Sparkles,
    accent: 'bg-apricot/20 text-darkink border-apricot/40',
    tag: 'Zero Mismatch'
  },
  {
    number: '03',
    title: 'Verified Handover',
    subtitle: 'Dual-PIN Cryptographic Custody',
    description: 'A 4-digit pickup OTP and delivery drop-off PIN verify custody handoff at every step. Meals nourish families while waste diversion logs in real-time.',
    icon: HeartHandshake,
    accent: 'bg-forest/15 text-forest border-forest/30',
    tag: 'Verified Handover'
  }
];

export const SurplusToSmilesSection: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-24 bg-cream border-t border-forest/10 relative overflow-hidden">
      
      {/* Subtle Depth Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sage/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block text-xs font-semibold uppercase tracking-wider text-forest bg-warmwhite px-3.5 py-1 rounded-full border border-forest/15 shadow-2xs"
          >
            The FoodBridge Process
          </motion.span>

          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-darkink tracking-tight"
          >
            From Surplus to Smiles
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="text-sm sm:text-base text-darkink/75 max-w-2xl mx-auto leading-relaxed font-sans"
          >
            A simple, verified, and transparent journey that safely moves wholesome food from commercial kitchens to communities in need.
          </motion.p>
        </div>

        {/* 3 Step Editorial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: idx * 0.12 }}
                className="bg-warmwhite rounded-3xl p-7 sm:p-8 border border-forest/15 shadow-warm hover:shadow-editorial hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  {/* Top Row: Number & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-forest text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
                      {step.number}
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${step.accent}`}>
                      {step.tag}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-serif font-bold text-darkink">
                      {step.title}
                    </h3>
                    <p className="text-xs font-bold text-forest mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-darkink/85 leading-relaxed font-sans font-medium">
                    {step.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-forest/10 flex items-center justify-between text-xs font-semibold text-darkink/85">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-forest" />
                    <span>Zero Waste Target</span>
                  </span>
                  <Icon className="w-5 h-5 text-forest" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA to Action */}
        <div className="mt-14 text-center">
          <Link
            to="/donations"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all group hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          >
            <span>Browse Live Surplus Batches</span>
            <ArrowRight className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

      </div>
    </section>
  );
};
