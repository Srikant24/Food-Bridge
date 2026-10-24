import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Clock, 
  ArrowRight, 
  Search, 
  Sparkles, 
  Globe2,
  FileText
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { 
  KAGGLE_RESEARCH_ARTICLES, 
  type FoodWasteArticle 
} from '../data/kaggleFoodWasteData';
import { ArticleModal } from '../components/ArticleModal';

export const ArticlesPage: React.FC = () => {
  const location = useLocation();
  const [selectedArticle, setSelectedArticle] = useState<FoodWasteArticle | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // If URL has hash matching article slug, open modal automatically
  useEffect(() => {
    if (location.hash) {
      const slug = location.hash.replace('#', '');
      const matched = KAGGLE_RESEARCH_ARTICLES.find(a => a.slug === slug);
      if (matched) {
        setSelectedArticle(matched);
      }
    }
  }, [location.hash]);

  const categories = ['all', 'Global Dataset', 'Climate & Carbon', 'Logistics & Safety', 'Regional Focus'];

  const filteredArticles = KAGGLE_RESEARCH_ARTICLES.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term || 
      article.title.toLowerCase().includes(term) ||
      article.subtitle.toLowerCase().includes(term) ||
      article.summary.toLowerCase().includes(term) ||
      article.category.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      
      {/* Top Hero Banner */}
      <div className="rounded-3xl p-8 sm:p-12 bg-forest text-white shadow-editorial border border-forest/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sage/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-700 text-sage text-xs font-bold border border-forest-600 shadow-xs select-none">
            <Database className="w-3.5 h-3.5 text-apricot" />
            <span>Kaggle Global Food Waste Research & Open Datasets</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white tracking-tight leading-tight">
            Food Wastage Intelligence & <span className="text-apricot italic">Climate Research</span>
          </h1>

          <p className="text-sm sm:text-base text-white/85 leading-relaxed font-sans font-normal">
            Peer-reviewed analytics and exploratory data analysis (EDA) derived from Kaggle's UNEP Food Waste Index and FAO supply chain loss records.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-white/80 font-sans">
            <span className="flex items-center gap-1.5 font-bold text-sage">
              <Globe2 className="w-4 h-4 text-apricot" /> 214 Countries Surveyed
            </span>
            <span>•</span>
            <span>1.05B Tonnes Annual Baseline</span>
            <span>•</span>
            <span>FSSAI / FDA Safety Standards</span>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-sage/80 shadow-glass bg-white/95 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search research topics, keywords, carbon, safety..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-sage text-xs bg-cream/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-xl transition-all capitalize cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-forest text-white shadow-xs font-bold'
                  : 'bg-cream text-charcoal-600 border border-sage hover:bg-emerald-50'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

      </div>

      {/* Articles Grid */}
      {filteredArticles.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-sage/80">
          <FileText className="w-10 h-10 text-charcoal-400 mx-auto" />
          <h3 className="text-base font-bold text-navy">No articles match your search criteria</h3>
          <p className="text-xs text-charcoal-500">Try adjusting your search terms or selecting All Categories.</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
            className="px-4 py-2 bg-forest text-white text-xs font-bold rounded-xl"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredArticles.map((article, idx) => (
            <motion.div
              key={article.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="glass-card rounded-3xl p-6 sm:p-8 border border-sage/80 shadow-glass hover:shadow-glass-hover hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between space-y-6 bg-white group"
            >
              <div className="space-y-4">
                
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${article.badgeColor}`}>
                    {article.category}
                  </span>
                  <span className="text-xs text-charcoal-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    {article.readTime}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-navy group-hover:text-forest transition-colors leading-tight">
                    {article.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-charcoal-600 line-clamp-3 mt-2 leading-relaxed">
                    {article.subtitle}
                  </p>
                </div>

                {/* Hero Stat Box */}
                <div className="p-4 rounded-2xl bg-cream/70 border border-sage/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-charcoal-500 font-bold block">
                      Dataset Metric
                    </span>
                    <span className="text-2xl font-display font-extrabold text-forest">
                      {article.heroStat}
                    </span>
                  </div>
                  <span className="text-[11px] text-charcoal-600 max-w-[200px] text-right font-medium">
                    {article.heroStatLabel}
                  </span>
                </div>

                {/* Summary snippet */}
                <p className="text-xs text-charcoal-500 line-clamp-3 leading-relaxed">
                  {article.summary}
                </p>

              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-sage/60 flex items-center justify-between">
                <span className="text-xs text-charcoal-500 font-medium">
                  {article.datasetSource.split(':')[0]}
                </span>

                <button
                  onClick={() => setSelectedArticle(article)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-900 text-white font-bold text-xs shadow-sm group-hover:shadow-md transition-all active:scale-95 border border-lime/20 cursor-pointer"
                >
                  <span>Read Full Article</span>
                  <ArrowRight className="w-3.5 h-3.5 text-lime group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

            </motion.div>
          ))}
        </div>
      )}

      {/* Dataset Citation & Hackathon Note */}
      <div className="rounded-3xl p-6 sm:p-8 bg-white border border-sage/80 shadow-glass flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="font-display font-bold text-base text-navy flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Kaggle Open Dataset Citation & Integration</span>
          </div>
          <p className="text-xs text-charcoal-600 max-w-2xl leading-relaxed">
            Data sourced from Kaggle: <em>Food Waste data and research - by country</em> (UNEP / FAO 2024). FoodBridge utilizes these parameters to calibrate its 5-factor matching weights (urgency, distance, capacity, availability, and storage compliance).
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/donations/create"
            className="px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-900 text-white font-bold text-xs shadow-md transition-all active:scale-95 border border-lime/30"
          >
            Donate Surplus Food
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 rounded-xl border border-sage hover:bg-cream text-charcoal-700 font-semibold text-xs transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>

      {/* Reader Modal */}
      <ArticleModal
        article={selectedArticle}
        onClose={() => setSelectedArticle(null)}
      />

    </div>
  );
};
