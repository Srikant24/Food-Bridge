import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { fetchHealthCheck, type HealthCheckResponse } from '../services/api';
import { HeroComposition } from '../components/HeroComposition';
import { ImpactStrip } from '../components/ImpactStrip';
import { MissionTicker } from '../components/MissionTicker';
import { AvailableFoodPreview } from '../components/AvailableFoodPreview';
import { LiveActivityPanel } from '../components/LiveActivityPanel';
import { SurplusToSmilesSection } from '../components/SurplusToSmilesSection';
import { TechnologySafetySection } from '../components/TechnologySafetySection';
import { JoinNetworkSection } from '../components/JoinNetworkSection';

export const LandingPage: React.FC = () => {
  const [, setHealthData] = useState<HealthCheckResponse | null>(null);

  useEffect(() => {
    fetchHealthCheck()
      .then(data => setHealthData(data))
      .catch(err => console.warn('Health check notice:', err));
  }, []);

  return (
    <div className="min-h-screen bg-cream text-darkink font-sans selection:bg-sage selection:text-forest overflow-x-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="pt-10 pb-12 sm:pt-14 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Editorial Headline & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            
            {/* Eyebrow */}
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest bg-white px-3.5 py-1 rounded-full border border-forest/20 shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-apricot inline-block" />
              <span>FoodBridge — A Better Way to Share</span>
            </motion.div>

            {/* Editorial Headline with Masked Reveal */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl text-darkink font-serif tracking-tight leading-[1.08]">
              <span className="block overflow-hidden pb-1">
                <motion.span
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className="block"
                >
                  Less waste.
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-1">
                <motion.span
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="block text-apricot italic"
                >
                  More plates filled.
                </motion.span>
              </span>
            </h1>

            {/* Supporting Human-Centered Copy */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-darkink/85 max-w-xl leading-relaxed font-normal font-sans"
            >
              Every day, perfectly good food goes unused. FoodBridge connects surplus meals from local restaurants, canteens, and catering events with verified community organizations that can put it to good use.
            </motion.p>

            {/* Action Buttons: Solid Forest Green Primary CTA */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 pt-1"
            >
              <Link
                to="/donations/create"
                className="group inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-sm shadow-warm hover:shadow-editorial transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
              >
                <span className="text-white">Share food</span>
                <ArrowRight className="w-4 h-4 text-white transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              
              <Link
                to="/donations"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-forest/5 text-forest font-bold text-sm border-2 border-forest/30 hover:border-forest shadow-2xs transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-forest/30"
              >
                <span>Explore donations</span>
              </Link>
            </motion.div>

          </div>

          {/* Right Column: Documentary Photography */}
          <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
            <HeroComposition />
          </div>

        </div>

        {/* 2. VERIFIED PLATFORM IMPACT STRIP */}
        <ImpactStrip />
      </section>

      {/* MISSION TICKER RIBBON */}
      <MissionTicker />

      {/* 3. AVAILABLE FOOD LISTINGS */}
      <AvailableFoodPreview />

      {/* 4. INTERACTIVE RESCUE NETWORK MAP & DISPATCH CENTER */}
      <LiveActivityPanel />

      {/* 5. HOW FOODBRIDGE WORKS */}
      <SurplusToSmilesSection />

      {/* 6. TECHNOLOGY AND SAFETY */}
      <TechnologySafetySection />

      {/* 7. JOIN THE NETWORK */}
      <JoinNetworkSection />

    </div>
  );
};
