import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  Package, 
  HeartHandshake, 
  Key, 
  Truck, 
  ShieldCheck 
} from 'lucide-react';

interface TimelineEvent {
  status: string;
  timestamp: string;
  note: string;
  actorName: string;
  actorRole: string;
}

interface DonationLifecycleTimelineProps {
  currentStatus: string;
  timeline: TimelineEvent[];
}

const LIFECYCLE_STEPS = [
  { key: 'available', label: 'Available', icon: Package, desc: 'Batch Listed' },
  { key: 'requested', label: 'Requested', icon: HeartHandshake, desc: 'NGO Claim' },
  { key: 'accepted', label: 'Accepted', icon: ShieldCheck, desc: 'Locked' },
  { key: 'pickup_scheduled', label: 'Scheduled', icon: Clock, desc: 'Driver En Route' },
  { key: 'picked_up', label: 'Picked Up', icon: Key, desc: 'OTP Verified' },
  { key: 'delivered', label: 'Delivered', icon: Truck, desc: 'At Shelter' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, desc: 'Impact Logged' },
];

export const DonationLifecycleTimeline: React.FC<DonationLifecycleTimelineProps> = ({
  currentStatus,
  timeline,
}) => {
  // Determine index of current status
  const currentIndex = LIFECYCLE_STEPS.findIndex(s => s.key === currentStatus);
  const activeIdx = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="space-y-8">
      {/* Horizontal Lifecycle Stepper */}
      <div className="p-6 rounded-2xl bg-forest text-white border border-lime/20 shadow-xl overflow-x-auto">
        <div className="min-w-[620px] relative">
          
          {/* Base connector line */}
          <div className="absolute top-5 left-6 right-6 h-1 bg-forest-800 rounded-full" />
          
          {/* Active progress connector line */}
          <motion.div
            className="absolute top-5 left-6 h-1 bg-gradient-to-r from-emerald-400 via-lime to-emerald-300 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${(activeIdx / (LIFECYCLE_STEPS.length - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Stepper Nodes */}
          <div className="relative z-10 flex justify-between">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isPast = idx < activeIdx;
              const isCurrent = idx === activeIdx;

              return (
                <div key={step.key} className="flex flex-col items-center text-center w-20">
                  <div className="relative mb-2">
                    <motion.div
                      animate={{
                        scale: isCurrent ? 1.2 : 1,
                      }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        isPast
                          ? 'bg-emerald-600 text-white'
                          : isCurrent
                          ? 'bg-lime text-forest font-bold ring-4 ring-lime/30 shadow-emerald-400/40'
                          : 'bg-forest-900 text-charcoal-400 border border-forest-800'
                      }`}
                    >
                      {isPast ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </motion.div>

                    {/* Active pulse */}
                    {isCurrent && (
                      <span className="absolute -inset-1 rounded-full bg-lime/20 animate-ping pointer-events-none" />
                    )}
                  </div>

                  <span className={`text-[11px] font-bold tracking-tight ${
                    isCurrent ? 'text-lime' : isPast ? 'text-white' : 'text-charcoal-400'
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-[9px] text-charcoal-300 mt-0.5">
                    {step.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Audit Trail List */}
      <div className="glass-card rounded-2xl p-6 border border-sage/80 shadow-glass space-y-4">
        <div className="flex items-center justify-between border-b border-sage/60 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-charcoal-900">Cryptographic Audit Trail ({timeline.length} Events)</h3>
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-charcoal-400 bg-ivory px-2 py-0.5 rounded border border-sage">
            Immutable Log
          </span>
        </div>

        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-sage">
          {timeline.map((evt, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="relative space-y-1"
            >
              <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-white shadow-xs" />
              
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-forest font-mono">
                  {evt.status.replace('_', ' ')}
                </span>
                <span className="text-[11px] font-mono text-charcoal-400">
                  {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </span>
              </div>

              <p className="text-xs text-charcoal-700 leading-relaxed font-medium bg-ivory/60 p-2.5 rounded-xl border border-sage/60">
                {evt.note}
              </p>

              <p className="text-[10px] text-charcoal-400">
                Authorized by <strong className="text-charcoal-600">{evt.actorName}</strong> ({evt.actorRole})
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
