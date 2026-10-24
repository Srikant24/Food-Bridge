import React from 'react';

const PHRASES = [
  'GOOD FOOD, SHARED WELL',
  'LESS WASTE, MORE IMPACT',
  'LOCAL FOOD, LOCAL GOOD',
  'EVERY MEAL MATTERS',
];

export const MissionTicker: React.FC = () => {
  return (
    <div
      className="w-full bg-forest text-white py-3 sm:py-3.5 overflow-hidden border-y border-forest/30 relative select-none group"
      role="region"
      aria-label="Mission Statement Ticker"
    >
      {/* Subtle edge fades for smooth transition */}
      <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-r from-forest to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-20 bg-gradient-to-l from-forest to-transparent z-10 pointer-events-none" />

      {/* Infinite Scrolling Track */}
      <div className="ticker-track flex items-center">
        {/* Set 1 */}
        <div className="flex items-center shrink-0">
          {PHRASES.map((phrase, idx) => (
            <div key={`set1-${idx}`} className="flex items-center">
              <span className="text-xs sm:text-sm font-sans font-bold tracking-[0.2em] uppercase text-white px-6 sm:px-10 transition-colors duration-200 group-hover:text-honey">
                {phrase}
              </span>
              <span className="text-apricot text-xs select-none">✦</span>
            </div>
          ))}
        </div>

        {/* Set 2 (Identical for seamless infinite loop) */}
        <div className="flex items-center shrink-0" aria-hidden="true">
          {PHRASES.map((phrase, idx) => (
            <div key={`set2-${idx}`} className="flex items-center">
              <span className="text-xs sm:text-sm font-sans font-bold tracking-[0.2em] uppercase text-white px-6 sm:px-10 transition-colors duration-200 group-hover:text-honey">
                {phrase}
              </span>
              <span className="text-apricot text-xs select-none">✦</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
