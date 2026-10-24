import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  Package 
} from 'lucide-react';
import type { NgoMatchItem } from '../services/api';

interface NgoMatchCardProps {
  match: NgoMatchItem;
  rank: number;
}

export const NgoMatchCard: React.FC<NgoMatchCardProps> = ({ match, rank }) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  // SVG Circular progress math (radius: 20, circumference: 2 * Math.PI * 20 = 125.66)
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (match.matchScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: rank * 0.08 }}
      className="glass-card rounded-2xl p-4 sm:p-5 border border-sage/90 shadow-glass hover:shadow-glass-hover hover:border-emerald-300 transition-all duration-200 bg-white space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Rank & Profile */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-forest text-lime font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
            #{rank}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-heading font-bold text-sm text-charcoal-900 line-clamp-1">
                {match.ngoName}
              </h4>
              <span title="80G/12A Verified" className="inline-flex">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              </span>
            </div>
            <p className="text-[11px] text-charcoal-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{match.distanceKm} km away • {match.city}</span>
            </p>
          </div>
        </div>

        {/* Right: Circular Score Gauge */}
        <div className="flex items-center gap-2">
          <div className="relative w-12 h-12 flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-sage"
                strokeWidth="3.5"
                fill="transparent"
              />
              <motion.circle
                cx="24"
                cy="24"
                r={radius}
                className="stroke-emerald-600"
                strokeWidth="3.5"
                fill="transparent"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, ease: 'easeOut', delay: rank * 0.1 }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs font-display font-extrabold text-forest leading-none">
                {match.matchScore}
              </span>
              <span className="text-[8px] font-bold text-emerald-700 leading-none mt-0.5">%</span>
            </div>
          </div>
        </div>

      </div>

      {/* Factor Breakdown Bars */}
      <div className="pt-2 border-t border-sage/60 space-y-2 text-[11px] font-mono text-charcoal-600">
        
        {/* Urgency */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="flex items-center gap-1 text-charcoal-700">
              <Clock className="w-3 h-3 text-amber-500" /> Urgency Fit (30%):
            </span>
            <span className="font-bold text-emerald-700">{match.factors.urgency}/100</span>
          </div>
          <div className="w-full bg-charcoal-100 rounded-full h-1.5 overflow-hidden">
            <motion.div 
              className="bg-amber-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${match.factors.urgency}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

        {/* Distance */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="flex items-center gap-1 text-charcoal-700">
              <MapPin className="w-3 h-3 text-emerald-600" /> Distance Score (25%):
            </span>
            <span className="font-bold text-emerald-700">{match.factors.distanceScore}/100 ({match.distanceKm} km)</span>
          </div>
          <div className="w-full bg-charcoal-100 rounded-full h-1.5 overflow-hidden">
            <motion.div 
              className="bg-emerald-600 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${match.factors.distanceScore}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

        {/* Capacity */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px]">
            <span className="flex items-center gap-1 text-charcoal-700">
              <Package className="w-3 h-3 text-sky-600" /> Intake Capacity (20%):
            </span>
            <span className="font-bold text-emerald-700">{match.factors.capacityScore}/100 ({match.availableCapacity} meals)</span>
          </div>
          <div className="w-full bg-charcoal-100 rounded-full h-1.5 overflow-hidden">
            <motion.div 
              className="bg-sky-500 h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${match.factors.capacityScore}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>

      </div>

      {/* Toggle Expandable Explanation Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full pt-1.5 flex items-center justify-between text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
      >
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>{expanded ? 'Hide Algorithm Reason' : 'View Recommendation Breakdown'}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expandable Explanation Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-ivory border border-sage/70 space-y-2 text-xs">
              <p className="text-charcoal-700 leading-relaxed font-sans">
                {match.explanation}
              </p>
              <div className="pt-1.5 border-t border-sage/60 grid grid-cols-2 gap-2 text-[10px] text-charcoal-500 font-mono">
                <div>Fleet Availability: <strong className="text-charcoal-800">{match.factors.availabilityScore}/100</strong></div>
                <div>Storage Match: <strong className="text-charcoal-800">{match.factors.compatibilityScore}/100</strong></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
