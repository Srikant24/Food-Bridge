import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchPlatformAnalytics, type PlatformAnalytics } from '../services/api';
import { AnimatedCounter } from './motion/AnimatedCounter';
import { 
  Leaf, 
  Utensils, 
  Scale, 
  HeartHandshake, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const EveryMealMattersSection: React.FC = () => {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  useEffect(() => {
    fetchPlatformAnalytics()
      .then(data => setAnalytics(data))
      .catch(err => console.warn('Impact stats load notice:', err));
  }, []);

  const metrics = analytics?.metrics;

  const stats = [
    {
      label: 'Meals Rescued',
      value: metrics?.mealsRedistributed || 14850,
      suffix: '+',
      desc: 'Nourishing local community shelters',
      icon: Utensils,
      color: 'text-lime',
    },
    {
      label: 'Food Saved',
      value: metrics?.kgRescued || 6240,
      suffix: ' kg',
      desc: 'Diverted from methane-producing landfills',
      icon: Scale,
      color: 'text-emerald-400',
    },
    {
      label: 'NGOs Connected',
      value: metrics?.verifiedNgos || 52,
      suffix: '+',
      desc: 'Verified charities, shelters & food banks',
      icon: HeartHandshake,
      color: 'text-apricot',
    },
    {
      label: 'Successful Collections',
      value: metrics?.completedDonations || 128,
      suffix: '',
      desc: 'Confirmed via cryptographic dual-PIN',
      icon: CheckCircle2,
      color: 'text-lime',
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-forest text-white relative overflow-hidden">
      
      {/* Background Radial Glow & Leaf Motifs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-lime/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-apricot/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-radial-glow opacity-25 pointer-events-none" />

      {/* Decorative SVG Leaves in Background */}
      <svg className="absolute -right-10 top-1/4 w-64 h-64 text-emerald-500/10 pointer-events-none" viewBox="0 0 200 200" fill="currentColor">
        <path d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C86.9,14.6,81.2,29.1,72.7,41.4C64.2,53.7,52.8,63.7,39.8,70.8C26.8,77.9,13.4,82.1,-0.6,83.1C-14.6,84.1,-29.3,81.9,-41.8,74.5C-54.4,67.1,-64.8,54.5,-72.6,40.7C-80.4,26.8,-85.5,13.4,-84.9,0.3C-84.3,-12.7,-77.9,-25.5,-69.7,-36.8C-61.5,-48.1,-51.4,-58,-39.4,-66C-27.3,-74,-13.7,-80.1,1.1,-82C15.9,-83.9,31.7,-81.6,44.7,-76.4Z" transform="translate(100 100)" />
      </svg>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-900 border border-lime/30 text-lime text-xs font-bold"
          >
            <Leaf className="w-3.5 h-3.5" />
            <span>Environmental & Social Footprint</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-tight"
          >
            Every Meal Matters.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-charcoal-200 max-w-2xl mx-auto leading-relaxed"
          >
            FoodBridge turns surplus volume into measurable environmental deflection and dignified nourishment.
          </motion.p>
        </div>

        {/* Oversized Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="p-8 rounded-3xl bg-forest-900/80 border border-lime/20 shadow-2xl backdrop-blur-md flex flex-col justify-between space-y-4 relative group overflow-hidden"
              >
                {/* Subtle top edge glow on hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-lime to-apricot opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-forest text-lime flex items-center justify-center border border-lime/20 shadow-inner">
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white tracking-tight">
                    <AnimatedCounter
                      to={stat.value}
                      suffix={stat.suffix}
                      duration={2}
                    />
                  </div>

                  <h3 className={`text-base font-bold ${stat.color}`}>
                    {stat.label}
                  </h3>
                </div>

                <p className="text-xs text-charcoal-300 leading-relaxed pt-2 border-t border-forest-800">
                  {stat.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 text-center">
          <Link
            to="/analytics"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-lime text-forest font-bold text-xs hover:bg-lime-300 transition-all shadow-lg active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Explore Complete Impact Analytics</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </section>
  );
};
