import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, HeartHandshake, ArrowRight, ShieldCheck } from 'lucide-react';

export const JoinNetworkSection: React.FC = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="rounded-3xl p-8 sm:p-14 bg-forest text-white relative overflow-hidden shadow-editorial border border-forest/30">
        
        {/* Subtle Warm Accent Backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sage/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-apricot/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-700/80 text-sage text-xs font-bold border border-forest-600 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-apricot" />
            <span>Join the FoodBridge Movement</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
            Ready to Turn Surplus Food Into Hope?
          </h2>

          <p className="text-base sm:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed font-sans font-normal">
            Whether you operate a commercial kitchen with surplus batches or manage a community shelter nourishing families every day, FoodBridge provides the technology to share seamlessly.
          </p>

          {/* Two-Column Role Card Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left my-8">
            <div className="bg-forest-700/80 rounded-2xl p-6 border border-forest-600 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-forest-600/90 flex items-center justify-center text-apricot shadow-2xs">
                <Building2 className="w-5 h-5 text-apricot" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">For Food Providers</h3>
              <p className="text-xs text-white/85 font-sans leading-relaxed">
                Restaurants, canteens, hotels, and caterers can list surplus batches in under two minutes with automated safety and dietary flags.
              </p>
            </div>

            <div className="bg-forest-700/80 rounded-2xl p-6 border border-forest-600 space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-forest-600/90 flex items-center justify-center text-sage shadow-2xs">
                <HeartHandshake className="w-5 h-5 text-sage" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">For Verified Non-Profits</h3>
              <p className="text-xs text-white/85 font-sans leading-relaxed">
                Shelters, food banks, and community kitchens receive prioritized matching within their service radius based on daily intake capacity.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-apricot hover:bg-[#d58a38] text-darkink font-bold text-sm shadow-warm transition-all flex items-center justify-center gap-2 group hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-forest"
            >
              <span>Register Your Organization</span>
              <ArrowRight className="w-4 h-4 text-darkink transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-white font-bold text-sm border border-forest-500 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white"
            >
              <span>Try Demo Account Logins</span>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};
