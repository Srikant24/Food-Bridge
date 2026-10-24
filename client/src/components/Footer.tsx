import React from 'react';
import { Link } from 'react-router-dom';
import { Utensils, Heart, Shield, Sparkles, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer 
      id="foodbridge-footer"
      className="w-full bg-[#103D2B] text-[#D4E5D9] pt-16 pb-20 sm:pb-16 md:pb-12 border-t border-[#426C56] relative z-10"
      style={{ backgroundColor: '#103D2B', color: '#D4E5D9' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Responsive Grid: Desktop (4 cols), Tablet (2 cols), Mobile (1 col) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 mb-12">
          
          {/* Column 1: FoodBridge Branding & Mission */}
          <div className="space-y-4">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded-xl"
              aria-label="FoodBridge Home"
            >
              <div className="w-10 h-10 rounded-xl bg-[#174C35] flex items-center justify-center text-[#FFFFFF] shadow-sm border border-[#426C56] group-hover:border-[#A9E6B8] transition-colors">
                <Utensils className="w-5 h-5 text-[#A9E6B8]" />
              </div>
              <span className="font-serif font-bold text-2xl text-[#FFFFFF] tracking-tight">
                Food<span className="text-[#A9E6B8] italic">Bridge</span>
              </span>
            </Link>
            <p className="text-xs sm:text-sm text-[#D4E5D9] leading-relaxed font-sans max-w-sm">
              Less waste. More plates filled. Intelligent, verified food waste redistribution bridging surplus meals directly with verified community organizations.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-[#E2EDE5] bg-[#174C35]/70 px-3.5 py-1.5 rounded-lg border border-[#426C56]">
              <Sparkles className="w-3.5 h-3.5 text-[#A9E6B8] shrink-0" />
              <span className="font-medium">National Hackathon Showcase Live</span>
            </div>
          </div>

          {/* Column 2: Platform Navigation */}
          <div>
            <h4 className="text-[#FFFFFF] font-serif font-bold text-base tracking-wide mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-sans text-[#E2EDE5]">
              <li>
                <Link 
                  to="/donations" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  Available Surplus Food
                </Link>
              </li>
              <li>
                <Link 
                  to="/ngos" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  Verified NGO Directory
                </Link>
              </li>
              <li>
                <Link 
                  to="/analytics" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  Live Impact Analytics
                </Link>
              </li>
              <li>
                <Link 
                  to="/articles" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  Food Waste Research & Articles
                </Link>
              </li>
              <li>
                <Link 
                  to="/about" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  About Our Mission
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Access Portals */}
          <div>
            <h4 className="text-[#FFFFFF] font-serif font-bold text-base tracking-wide mb-4">
              Access Portals
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm font-sans text-[#E2EDE5]">
              <li>
                <Link 
                  to="/login" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  Food Provider Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  NGO Recipient Portal
                </Link>
              </li>
              <li>
                <Link 
                  to="/login" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  Administrator Governance
                </Link>
              </li>
              <li>
                <Link 
                  to="/register" 
                  className="inline-block text-[#E2EDE5] hover:text-[#A9E6B8] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded"
                >
                  Register Your Organization
                </Link>
              </li>
              <li>
                <a 
                  href="/api/health" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 text-[#A9E6B8] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A9E6B8] rounded font-medium"
                >
                  <span>System API Diagnostics</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Safety & Ethics */}
          <div className="space-y-3">
            <h4 className="text-[#FFFFFF] font-serif font-bold text-base tracking-wide mb-4">
              Safety & Ethics
            </h4>
            <p className="text-xs sm:text-sm text-[#D4E5D9] leading-relaxed font-sans">
              FoodBridge enforces temperature logging, preparation timestamp auditing, and automated expiry countdowns. Expired or compromised food listings are strictly isolated.
            </p>
            <div className="flex items-start gap-2.5 text-xs text-[#D4E5D9] bg-[#174C35]/60 p-3 rounded-xl border border-[#426C56] font-sans">
              <Shield className="w-4 h-4 text-[#A9E6B8] shrink-0 mt-0.5" />
              <span className="leading-snug">
                Compliant with Good Samaritan Food Rescue Standards
              </span>
            </div>
          </div>

        </div>

        {/* Divider & Copyright Bottom Bar */}
        <div className="pt-8 border-t border-[#426C56] flex flex-col sm:flex-row items-center justify-between text-xs text-[#C1D5C7] font-sans gap-4">
          <p className="text-center sm:text-left text-[#C1D5C7]">
            © {new Date().getFullYear()} FoodBridge Platform. Designed for verified food redistribution.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[#C1D5C7]">
            <span className="flex items-center gap-1.5">
              Engineered with <Heart className="w-3.5 h-3.5 text-[#A9E6B8] fill-[#A9E6B8] inline" /> for Zero Food Waste
            </span>
            <span className="text-[#426C56] hidden sm:inline">•</span>
            <span>Production Grade Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

