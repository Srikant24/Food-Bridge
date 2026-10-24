import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  Search, 
  BarChart3, 
  CheckCircle2, 
  Globe2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  KAGGLE_GLOBAL_STATS, 
  KAGGLE_COUNTRY_DATASET, 
  KAGGLE_COMMODITY_LOSS, 
  KAGGLE_RESEARCH_ARTICLES, 
  type FoodWasteArticle 
} from '../data/kaggleFoodWasteData';
import { ArticleModal } from './ArticleModal';
import { RevealOnScroll } from './motion/RevealOnScroll';
import { AnimatedCounter } from './motion/AnimatedCounter';

export const FoodWasteResearchSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'dataset' | 'commodities'>('articles');
  const [selectedArticle, setSelectedArticle] = useState<FoodWasteArticle | null>(null);
  const [countrySearch, setCountrySearch] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const filteredCountries = KAGGLE_COUNTRY_DATASET.filter((c) => {
    const matchesSearch = c.country.toLowerCase().includes(countrySearch.toLowerCase()) ||
                          c.region.toLowerCase().includes(countrySearch.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || c.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  const uniqueRegions = Array.from(new Set(KAGGLE_COUNTRY_DATASET.map(c => c.region)));

  return (
    <section id="food-waste-research" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative">
      
      {/* Background ambient mesh */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[550px] bg-emerald-500/5 blur-3xl rounded-full pointer-events-none -z-10" />

      {/* Header Container */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-14">
        <RevealOnScroll>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest/10 text-forest text-xs font-bold border border-forest/15 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kaggle Dataset & Open Research</span>
            <span className="text-charcoal-400">•</span>
            <span className="text-emerald-700 font-extrabold uppercase text-[10px]">UNEP / FAO 2024</span>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delay={0.1}>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-navy tracking-tight">
            The Science & Scale of <span className="text-gradient-emerald-lime">Food Wastage</span>
          </h2>
        </RevealOnScroll>

        <RevealOnScroll delay={0.2}>
          <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed font-normal">
            Real data from the UNEP Food Waste Index and Kaggle global repositories explaining why 
            <strong> 1.05 billion tonnes</strong> are discarded annually—and how FoodBridge’s algorithmic dispatch bridges the last mile.
          </p>
        </RevealOnScroll>
      </div>

      {/* Kaggle Macro Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="glass-card p-5 rounded-2xl border border-sage/80 shadow-glass bg-white/95 hover:-translate-y-1 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Global Annual Waste</div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-forest mt-1.5">
            1.05B <span className="text-xs font-sans text-charcoal-500">tonnes</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">19% of all food for consumers</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-sage/80 shadow-glass bg-white/95 hover:-translate-y-1 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Food Service Share</div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-forest mt-1.5">
            <AnimatedCounter to={KAGGLE_GLOBAL_STATS.foodServiceSharePercent} suffix="%" duration={1.2} />
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">~294M tonnes in hospitality</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-sage/80 shadow-glass bg-white/95 hover:-translate-y-1 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Global GHG Impact</div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-forest mt-1.5">
            8–10%
          </div>
          <p className="text-[11px] text-charcoal-500 font-medium mt-1">Total human climate footprint</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-sage/80 shadow-glass bg-white/95 hover:-translate-y-1 transition-all">
          <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">CO2e Saved Per Kg</div>
          <div className="text-2xl sm:text-3xl font-display font-extrabold text-forest mt-1.5">
            <AnimatedCounter to={KAGGLE_GLOBAL_STATS.co2eSavedPerKgDiverted} suffix=" kg" duration={1.4} />
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">Diverted from anaerobic rot</p>
        </div>
      </div>

      {/* Interactive Tabs Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-8 p-1.5 rounded-full bg-cream-300/80 border border-sage/80 max-w-fit mx-auto shadow-inner">
        {[
          { id: 'articles', label: 'Research Articles (4)', icon: BookOpen },
          { id: 'dataset', label: 'Kaggle Country Explorer', icon: Globe2 },
          { id: 'commodities', label: 'Commodity Loss Matrix', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-forest text-white shadow-md shadow-forest/20'
                  : 'text-charcoal-700 hover:text-navy hover:bg-white/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-lime' : 'text-charcoal-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: RESEARCH ARTICLES */}
      {activeTab === 'articles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {KAGGLE_RESEARCH_ARTICLES.map((article, idx) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="glass-card rounded-3xl p-6 sm:p-7 border border-sage/80 shadow-glass hover:shadow-glass-hover hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between space-y-5 bg-white/95 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${article.badgeColor}`}>
                    {article.category}
                  </span>
                  <span className="text-xs text-charcoal-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {article.readTime}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-display font-bold text-navy group-hover:text-forest transition-colors line-clamp-2">
                  {article.title}
                </h3>

                <p className="text-xs sm:text-sm text-charcoal-600 line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>

                {/* Key Stat Preview */}
                <div className="p-3.5 rounded-2xl bg-cream/70 border border-sage/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-charcoal-500 font-bold block">
                      Dataset Benchmark
                    </span>
                    <span className="text-xl font-display font-extrabold text-forest">
                      {article.heroStat}
                    </span>
                  </div>
                  <span className="text-[11px] text-charcoal-600 max-w-[180px] text-right font-medium">
                    {article.heroStatLabel}
                  </span>
                </div>
              </div>

              {/* Action */}
              <div className="pt-2 flex items-center justify-between border-t border-sage/60">
                <span className="text-xs text-charcoal-500 font-medium">
                  {article.publishedDate}
                </span>

                <button
                  onClick={() => setSelectedArticle(article)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest hover:bg-forest-900 text-white font-bold text-xs shadow-sm group-hover:shadow-md transition-all active:scale-95 border border-lime/20 cursor-pointer"
                >
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5 text-lime group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* TAB CONTENT 2: KAGGLE COUNTRY DATASET EXPLORER */}
      {activeTab === 'dataset' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-6 sm:p-8 border border-sage/80 shadow-glass bg-white/95 space-y-6"
        >
          {/* Search & Region Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-sage/70 pb-5">
            <div>
              <h3 className="text-lg font-display font-bold text-navy">
                Kaggle UNEP Food Waste Index: Country Level Analysis
              </h3>
              <p className="text-xs text-charcoal-500 mt-0.5">
                Baseline figures extracted from Kaggle's UNEP Food Waste data and research report.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country or region..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-sage text-xs bg-cream/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-3 py-2 rounded-xl border border-sage text-xs bg-white font-medium focus:outline-none"
              >
                <option value="all">All UN Regions</option>
                {uniqueRegions.map(reg => (
                  <option key={reg} value={reg}>{reg}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream/80 text-charcoal-700 font-mono text-[11px] uppercase tracking-wider border-b border-sage/80">
                <tr>
                  <th className="py-3 px-4 font-bold">Country & Region</th>
                  <th className="py-3 px-4 font-bold">Household (kg/capita)</th>
                  <th className="py-3 px-4 font-bold">Food Service (kg/capita)</th>
                  <th className="py-3 px-4 font-bold">Combined (kg/capita)</th>
                  <th className="py-3 px-4 font-bold">Total Annual Tonnes</th>
                  <th className="py-3 px-4 font-bold text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/60">
                {filteredCountries.map((row) => (
                  <tr key={row.country} className="hover:bg-cream/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-navy">{row.country}</div>
                      <div className="text-[10px] text-charcoal-500">{row.region} • {row.m49Code}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-charcoal-800">
                      {row.householdKgPerCapita} kg
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                      {row.foodServiceKgPerCapita} kg
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-forest">
                      <div className="flex items-center gap-2">
                        <span>{row.combinedKgPerCapita} kg</span>
                        <div className="w-16 bg-cream-300 rounded-full h-1.5 overflow-hidden hidden sm:block">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${Math.min(100, (row.combinedKgPerCapita / 215) * 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-charcoal-700">
                      {(row.householdTonnesYear / 1000000).toFixed(1)}M tonnes
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.confidence === 'High' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.confidence}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-charcoal-500 pt-3 border-t border-sage/60 gap-2">
            <span>Showing {filteredCountries.length} countries from Kaggle global dataset</span>
            <span className="italic">Data source: UNEP Food Waste Index Report 2024 / Kaggle Open Datasets</span>
          </div>
        </motion.div>
      )}

      {/* TAB CONTENT 3: COMMODITY LOSS MATRIX */}
      {activeTab === 'commodities' && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-6 sm:p-8 border border-sage/80 shadow-glass bg-white/95 space-y-6"
        >
          <div className="border-b border-sage/70 pb-4">
            <h3 className="text-lg font-display font-bold text-navy">
              Global Commodity Food Loss Matrix (FAO / Kaggle Data)
            </h3>
            <p className="text-xs text-charcoal-500 mt-0.5">
              Percentage of total harvested or prepared volume lost before or at consumer level, with typical ambient shelf-life limits.
            </p>
          </div>

          <div className="space-y-4">
            {KAGGLE_COMMODITY_LOSS.map((item) => (
              <div key={item.commodity} className="p-4 rounded-2xl bg-cream/40 border border-sage/70 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-navy">{item.commodity}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      item.environmentalImpact === 'Very High' 
                        ? 'bg-rose-100 text-rose-800' 
                        : item.environmentalImpact === 'High' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.environmentalImpact} Impact
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-charcoal-500">Critical Shelf Window:</span>
                    <span className="font-mono font-bold text-xs text-forest">
                      {item.shelfLifeHours} hours
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      {item.lossPercentage}% Lost
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-cream-300 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-forest via-emerald-500 to-rose-500 h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: `${item.lossPercentage}%` }}
                  />
                </div>

                <p className="text-[11px] text-charcoal-600">
                  <strong className="text-charcoal-800">Primary Spoilage Trigger:</strong> {item.primaryCause}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>FoodBridge algorithm specifically prioritizes <strong>Cooked Meals</strong> and <strong>Bakery</strong> due to the urgent 4-to-6 hour consumption window.</span>
            </div>
            <Link to="/donations" className="text-forest font-bold hover:underline shrink-0 text-xs">
              View Active Surplus Listings &rarr;
            </Link>
          </div>
        </motion.div>
      )}

      {/* Deep-Dive Article Reader Modal */}
      <ArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />

    </section>
  );
};
