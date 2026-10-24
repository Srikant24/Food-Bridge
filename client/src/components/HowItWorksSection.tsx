import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, 
  Sparkles, 
  Truck, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  KeyRound, 
  ArrowRight,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface StepData {
  step: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  badge: string;
  lifecycleStatus: string;
  color: string;
  highlights: string[];
  mockDetail: {
    label: string;
    value: string;
    subtext: string;
  };
}

const steps: StepData[] = [
  {
    step: '01',
    number: 'Step 1',
    title: 'List Surplus Food',
    subtitle: 'Express Food Safety Intake',
    description: 'Food providers (kitchens, canteens, hotels) post surplus batches in under 2 minutes. Enter meal count, storage conditions (ambient/hot/refrigerated), dietary tags, and automatic safety expiry windows.',
    icon: ClipboardList,
    badge: 'State: Available',
    lifecycleStatus: 'available',
    color: 'from-emerald-500 to-emerald-700',
    highlights: [
      'Gemini AI natural language parsing',
      'Automated expiry timestamp gating',
      'Allergen & temperature requirement tagging'
    ],
    mockDetail: {
      label: 'Intake Payload',
      value: '75 Packaged Meals • Hot Insulated',
      subtext: 'Expiry Gating: 3h 30m • Connaught Place, New Delhi'
    }
  },
  {
    step: '02',
    number: 'Step 2',
    title: 'Match With Verified NGOs',
    subtitle: '5-Factor Algorithmic Ranking',
    description: 'The platform immediately calculates proximity (Haversine geodesic), NGO intake capacity, urgency index, volunteer fleet availability, and storage compliance to pair with the ideal local charity.',
    icon: Sparkles,
    badge: 'State: Requested → Accepted',
    lifecycleStatus: 'accepted',
    color: 'from-forest to-emerald-600',
    highlights: [
      '30% Urgency + 25% Distance + 20% Capacity',
      'Only 80G/12A verified NGOs are eligible',
      'Transparent natural-language match explanation'
    ],
    mockDetail: {
      label: 'Ranked Recipient',
      value: 'Hope Community Shelter (94% Match)',
      subtext: 'Distance: 3.2 km • Intake: 150 meals • Van Dispatched'
    }
  },
  {
    step: '03',
    number: 'Step 3',
    title: 'Coordinate Pickup & Delivery',
    subtitle: 'Dual-PIN Cryptographic Handoff',
    description: 'A 4-digit pickup OTP verifies the driver upon collection, and a 4-digit delivery PIN confirms final drop-off at the shelter. Zero food waste is lost and carbon offset metrics update immediately.',
    icon: Truck,
    badge: 'State: Picked Up → Delivered → Completed',
    lifecycleStatus: 'completed',
    color: 'from-lime-600 to-forest',
    highlights: [
      'Cryptographic 4-digit pickup OTP verification',
      'Beneficiary drop-off confirmation PIN',
      'Real-time carbon offset & social impact log'
    ],
    mockDetail: {
      label: 'Handoff Status',
      value: 'Pickup OTP: Verified • Drop-off Confirmed',
      subtext: 'Impact: 75 Meals Served • 31.5 kg CO2e Avoided'
    }
  }
];

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-ivory/60 border-y border-sage/60 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100/70 px-3.5 py-1 rounded-full border border-emerald-200">
            Intelligent Operational Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-charcoal-900 tracking-tight">
            From Surplus Kitchen to Beneficiary
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-emerald-500 to-lime rounded-full mx-auto" />
          <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed max-w-2xl mx-auto">
            A frictionless, transparent 3-step redistribution cycle ensuring zero spoilage, verified custody handoffs, and instant impact reporting.
          </p>
        </div>

        {/* Desktop Connected Progress Bar */}
        <div className="hidden lg:block relative mb-12">
          {/* Base connecting line */}
          <div className="absolute top-1/2 left-[12%] right-[12%] -translate-y-1/2 h-1 bg-sage rounded-full -z-0" />
          
          {/* Active animated line progress */}
          <motion.div
            className="absolute top-1/2 left-[12%] -translate-y-1/2 h-1 bg-gradient-to-r from-forest via-emerald-500 to-lime rounded-full -z-0"
            initial={{ width: '0%' }}
            animate={{ width: activeStep === 0 ? '0%' : activeStep === 1 ? '38%' : '76%' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />

          <div className="grid grid-cols-3 relative z-10">
            {steps.map((s, idx) => {
              const Icon = s.icon;
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;

              return (
                <button
                  key={s.step}
                  onClick={() => setActiveStep(idx)}
                  className="flex flex-col items-center text-center group cursor-pointer focus:outline-none"
                >
                  {/* Step Circle Indicator */}
                  <div className="relative mb-3">
                    <motion.div
                      animate={{
                        scale: isActive ? 1.15 : 1,
                        borderColor: isActive ? '#087F5B' : isPast ? '#092F26' : '#DCECE2',
                      }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center font-display font-black text-sm transition-all duration-300 shadow-md ${
                        isActive
                          ? 'bg-forest text-lime border-2 border-lime shadow-emerald-500/20'
                          : isPast
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-charcoal-500 border border-sage hover:border-emerald-300'
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="w-6 h-6 text-lime" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </motion.div>
                    
                    {/* Pulsing ring on active */}
                    {isActive && (
                      <span className="absolute -inset-1.5 rounded-2xl bg-emerald-500/20 animate-pulse pointer-events-none" />
                    )}
                  </div>

                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-charcoal-400">
                    {s.number}
                  </span>
                  <span className={`text-base font-bold mt-0.5 transition-colors ${
                    isActive ? 'text-forest font-extrabold' : 'text-charcoal-700'
                  }`}>
                    {s.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Interactive Step Content Box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="glass-card rounded-3xl p-6 sm:p-10 border border-emerald-200/80 shadow-glass-hover bg-white/95 max-w-5xl mx-auto"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Left Column: Details & Highlights */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-forest text-lime text-xs font-mono font-bold">
                    {steps[activeStep].number} of 03
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
                    {steps[activeStep].badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900 leading-tight">
                    {steps[activeStep].title}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-emerald-700 mt-1">
                    {steps[activeStep].subtitle}
                  </p>
                </div>

                <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed">
                  {steps[activeStep].description}
                </p>

                {/* Key Architectural Highlights */}
                <div className="space-y-2.5 pt-2">
                  {steps[activeStep].highlights.map((highlight, hIdx) => (
                    <div key={hIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-charcoal-800 font-medium">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>

                {/* Step Navigation Controls */}
                <div className="pt-4 flex items-center gap-3">
                  {activeStep > 0 && (
                    <button
                      onClick={() => setActiveStep(prev => prev - 1)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-charcoal-600 bg-ivory border border-sage hover:bg-white transition-colors"
                    >
                      ← Previous Step
                    </button>
                  )}
                  {activeStep < steps.length - 1 ? (
                    <button
                      onClick={() => setActiveStep(prev => prev + 1)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-forest hover:bg-forest-800 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <span>Next: {steps[activeStep + 1].title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-lime" />
                    </button>
                  ) : (
                    <Link
                      to="/donations"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-forest bg-lime hover:bg-lime-400 transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <span>Explore Live Donations</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Column: Visual Real-time Mock Card */}
              <div className="lg:col-span-5">
                <div className="p-6 rounded-2xl bg-forest text-white border border-lime/30 shadow-xl space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-lime/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-forest-800 pb-3">
                    <span className="text-[11px] font-mono text-lime uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Platform Lifecycle Data
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300 bg-forest-900 px-2 py-0.5 rounded border border-forest-700">
                      LIVE ENGINE
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-emerald-200/80 font-medium">
                      {steps[activeStep].mockDetail.label}
                    </span>
                    <div className="text-base sm:text-lg font-bold text-lime font-display">
                      {steps[activeStep].mockDetail.value}
                    </div>
                    <p className="text-xs text-charcoal-300">
                      {steps[activeStep].mockDetail.subtext}
                    </p>
                  </div>

                  {/* Micro Visual for each step */}
                  {activeStep === 0 && (
                    <div className="pt-2 border-t border-forest-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-charcoal-300">
                        <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-400" /> Expiry Countdown:</span>
                        <span className="text-amber-300 font-mono font-bold">03:29:45 Active</span>
                      </div>
                      <div className="flex items-center justify-between text-charcoal-300">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-lime" /> Radius Gating:</span>
                        <span className="text-lime font-mono">15 km max</span>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="pt-2 border-t border-forest-800/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-charcoal-300">
                        <span>Intelligent Ranking:</span>
                        <span className="text-lime font-mono font-bold">#1 of 8 NGOs</span>
                      </div>
                      <div className="w-full bg-forest-900 rounded-full h-2 overflow-hidden border border-forest-800">
                        <div className="bg-gradient-to-r from-emerald-500 to-lime h-full w-[94%]" />
                      </div>
                      <div className="flex justify-between text-[11px] text-charcoal-400">
                        <span>Match Confidence</span>
                        <span className="text-lime font-bold">94.2%</span>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="pt-2 border-t border-forest-800/80 space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-forest-950/80 border border-forest-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-lime" />
                          <span className="text-xs text-charcoal-200">Pickup OTP Token</span>
                        </div>
                        <span className="font-mono font-extrabold text-lime text-sm tracking-wider">
                          4 8 1 9
                        </span>
                      </div>
                      <p className="text-[10px] text-charcoal-400 text-center">
                        Verified at collection • 100% custody audit trail logged
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>

        {/* Mobile Step Switcher */}
        <div className="flex lg:hidden justify-center gap-2 mt-8">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                activeStep === idx ? 'w-8 bg-forest' : 'w-2.5 bg-sage'
              }`}
              aria-label={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
};
