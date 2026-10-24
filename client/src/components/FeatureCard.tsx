import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  badge?: string;
  title: string;
  description: string;
  tags?: string[];
  delay?: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon: Icon,
  iconBgColor = 'bg-emerald-500/10 text-emerald-700',
  iconColor = 'text-emerald-700',
  badge,
  title,
  description,
  tags,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
      className="group relative p-7 rounded-2xl bg-white border border-sage/80 shadow-glass hover:shadow-glass-hover hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between overflow-hidden"
    >
      {/* Subtle top accent gradient line that reveals on hover */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-lime to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Subtle corner glow on hover */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-lime/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          {/* Tinted icon container with micro-motion */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${iconBgColor}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>

          {badge && (
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-xl font-heading font-bold text-charcoal-900 group-hover:text-emerald-900 transition-colors">
          {title}
        </h3>

        <p className="text-sm text-charcoal-600 leading-relaxed">
          {description}
        </p>
      </div>

      {tags && tags.length > 0 && (
        <div className="relative z-10 mt-6 pt-4 border-t border-sage/70 flex flex-wrap gap-1.5">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[10px] font-semibold text-charcoal-600 bg-ivory px-2 py-0.5 rounded-md border border-sage"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
};
