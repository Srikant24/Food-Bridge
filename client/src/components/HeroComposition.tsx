import React from 'react';
import { motion } from 'framer-motion';
import { HeartHandshake } from 'lucide-react';

export const HeroComposition: React.FC = () => {
  return (
    <div className="relative w-full max-w-lg lg:max-w-xl mx-auto flex flex-col items-center justify-center pt-2 pb-8 sm:pb-10">
      
      {/* Background Soft Sage & Honey Shapes for Depth */}
      <div className="absolute top-2 -left-6 w-72 h-72 bg-sage/30 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute -bottom-6 -right-6 w-64 h-64 bg-honey/25 rounded-full blur-2xl pointer-events-none -z-10" />

      {/* Main Photographic Composition Container */}
      <div className="relative w-full">
        
        {/* 1. Main Community Kitchen Documentary Photograph */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl overflow-hidden shadow-editorial border-4 border-white bg-white"
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream">
            <img
              src="/images/community_food_rescue.jpg"
              alt="Volunteers in a community kitchen packaging wholesome prepared food for local redistribution"
              className="w-full h-full object-cover transition-transform duration-700 hover:scale-103"
              loading="eager"
            />
            {/* Subtle Warm Film Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-darkink/40 via-transparent to-transparent pointer-events-none" />

            {/* High-Contrast Location Badge on Bottom-Right (Clear of the Inset Image on Left) */}
            <div className="absolute bottom-3.5 right-3.5 sm:bottom-4 sm:right-4 z-10 bg-[#19242B]/90 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/25 shadow-md flex items-center gap-1.5 select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
              <span>Community Kitchen Distribution</span>
            </div>
          </div>
        </motion.div>

        {/* 2. Smaller Overlapping Food-Preparation Image */}
        <motion.div
          initial={{ opacity: 0, y: 20, x: -15 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -bottom-7 -left-4 sm:-bottom-9 sm:-left-7 z-20 w-36 sm:w-44 h-36 sm:h-44 rounded-2xl overflow-hidden shadow-warm-hover border-4 border-white bg-white group"
        >
          <img
            src="/images/food_prep_detail.jpg"
            alt="Close-up of hands packaging wholesome warm meals into recyclable containers"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="eager"
          />
          {/* High-Contrast Dark Overlay Label with White Text */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-[#19242B]/92 backdrop-blur-sm text-white text-[11px] font-bold py-1 px-2 rounded-lg text-center shadow-md border border-white/20 tracking-wide select-none">
            Freshly Cooked
          </div>
        </motion.div>

        {/* 3. Solid Opaque Verified Badge in Top Right */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="absolute -top-3 right-2 sm:-top-4 sm:right-4 z-30 bg-[#FFFCF7] border-2 border-forest/25 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 select-none"
        >
          <span className="w-5 h-5 rounded-full bg-sage flex items-center justify-center text-forest">
            <HeartHandshake className="w-3.5 h-3.5 text-forest" />
          </span>
          <span className="text-xs font-bold text-forest tracking-tight">
            100% Verified Non-Profits
          </span>
        </motion.div>

      </div>

      {/* High-Contrast Thoughtful Caption Beneath Image */}
      <p className="mt-8 text-center text-xs text-darkink/85 font-medium font-sans leading-relaxed max-w-sm">
        Local cooks and community volunteers packing wholesome surplus food for same-day redistribution.
      </p>

    </div>
  );
};
