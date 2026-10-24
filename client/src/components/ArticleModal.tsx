import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  Database, 
  Share2, 
  Check, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FoodWasteArticle } from '../data/kaggleFoodWasteData';

interface ArticleModalProps {
  article: FoodWasteArticle | null;
  onClose: () => void;
}

export const ArticleModal: React.FC<ArticleModalProps> = ({ article, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!article) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `/articles#${article.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 25 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-cream rounded-3xl border border-sage/80 shadow-2xl flex flex-col overflow-hidden text-navy"
        >
          {/* Top Bar */}
          <div className="p-4 sm:p-6 bg-white border-b border-sage/70 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${article.badgeColor}`}>
                {article.category}
              </span>
              <span className="text-xs text-charcoal-400">•</span>
              <span className="text-xs text-charcoal-500 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {article.readTime}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="p-2 rounded-xl border border-sage hover:bg-cream-300 text-charcoal-600 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                title="Share Article Link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Link Copied' : 'Share'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-700 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 sm:p-10 overflow-y-auto space-y-8 bg-cream selection:bg-lime/50 selection:text-forest">
            
            {/* Header info */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-bold border border-forest/15">
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Dataset: {article.datasetSource}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-navy leading-tight tracking-tight">
                {article.title}
              </h1>

              <p className="text-sm sm:text-base text-charcoal-600 leading-relaxed font-normal">
                {article.subtitle}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-charcoal-500 border-t border-sage/60">
                <span>By <strong className="text-forest font-semibold">{article.author}</strong></span>
                <span>•</span>
                <span>Published {article.publishedDate}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <BookOpen className="w-3.5 h-3.5" /> Peer Reviewed Research
                </span>
              </div>
            </div>

            {/* Hero Stat Highlight Callout Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-forest via-forest to-navy text-white shadow-lg border border-lime/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-lime font-bold">Key Data Indicator</span>
                <div className="text-3xl sm:text-4xl font-display font-extrabold text-white mt-1">
                  {article.heroStat}
                </div>
                <p className="text-xs text-charcoal-200 mt-1 max-w-md">
                  {article.heroStatLabel}
                </p>
              </div>

              <div className="w-full sm:w-auto p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 text-xs text-lime space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kaggle Dataset Verified</span>
                </div>
                <p className="text-[11px] text-charcoal-200">UNEP / FAO Standardized Baseline</p>
              </div>
            </div>

            {/* Key Takeaways Box */}
            <div className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-glass space-y-3">
              <h3 className="text-sm font-display font-bold text-forest uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Executive Research Takeaways</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-charcoal-700">
                {article.keyTakeaways.map((takeaway, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Article Content Paragraphs */}
            <div className="space-y-6 text-charcoal-800">
              {article.contentParagraphs.map((para, idx) => (
                <div key={idx} className="space-y-2.5">
                  <h2 className="text-lg sm:text-xl font-display font-bold text-navy tracking-tight">
                    {para.heading}
                  </h2>
                  <p className="text-xs sm:text-sm leading-relaxed text-charcoal-700 font-normal">
                    {para.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Kaggle SQL / Analysis Query Snippet if provided */}
            {article.kaggleQuerySnippet && (
              <div className="p-4 sm:p-5 rounded-2xl bg-navy text-lime font-mono text-xs space-y-2 border border-forest-700 shadow-inner">
                <div className="flex items-center justify-between text-[11px] text-charcoal-300 border-b border-forest-800 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-lime" /> Kaggle Dataset Query Filter
                  </span>
                  <span className="text-[10px] text-lime/80 font-sans">SQL / Pandas Reference</span>
                </div>
                <div className="p-2 rounded bg-black/40 overflow-x-auto text-[11px] leading-relaxed">
                  <code>{article.kaggleQuerySnippet}</code>
                </div>
              </div>
            )}

            {/* Bottom Call to Action inside Article */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-cream to-lime-50 border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-display font-bold text-base text-forest">
                  Put These Insights Into Action
                </h4>
                <p className="text-xs text-charcoal-600 mt-1 max-w-md">
                  Have surplus food from an event or restaurant? List it now to divert it from landfills and feed verified local NGOs.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Link
                  to="/donations/create"
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-forest hover:bg-forest-900 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <span>Donate Surplus</span>
                  <ArrowRight className="w-3.5 h-3.5 text-lime" />
                </Link>
              </div>
            </div>

          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-white border-t border-sage/70 flex items-center justify-between text-xs text-charcoal-500">
            <span>Source: UNEP Food Waste Index 2024 / Kaggle Open Research</span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-forest text-white font-semibold text-xs hover:bg-forest-800 transition-colors"
            >
              Close Article
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
