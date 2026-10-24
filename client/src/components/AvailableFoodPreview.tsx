import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Clock, ArrowRight, Utensils, Tag, AlertCircle } from 'lucide-react';
import { fetchDonations, type DonationItem } from '../services/api';
import {
  resolveDonationPhoto,
  formatFoodCategory,
  formatDonationDeadline,
} from '../utils/donationImageResolver';

export const AvailableFoodPreview: React.FC = () => {
  const [items, setItems] = useState<DonationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadEligibleDonations = async () => {
      try {
        const response = await fetchDonations({ status: 'available' });
        if (isMounted && response?.donations) {
          const nowMs = Date.now();
          // Strictly exclude any expired donations from the default available food view
          const nonExpired = response.donations.filter((d) => {
            const isAvailable = d.status === 'available';
            const deadlineMs = new Date(d.collectionDeadline).getTime();
            return isAvailable && deadlineMs > nowMs;
          });

          // Show up to 3 recent eligible food listings
          setItems(nonExpired.slice(0, 3));
        }
      } catch (err) {
        console.warn('Notice: Loading available food listings preview', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadEligibleDonations();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!isLoading && items.length === 0) {
    return null; // Gracefully conceal section if no active available food
  }

  return (
    <section className="py-20 lg:py-24 bg-cream border-t border-forest/10 relative overflow-hidden">
      {/* Background Soft Accent Glows */}
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-sage/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-80 h-80 bg-honey/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-forest/80 bg-warmwhite px-3.5 py-1 rounded-full border border-forest/10 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-terracotta inline-block" />
              <span>Real-Time Redistribution</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-forest tracking-tight font-bold">
              Good food, ready to be shared.
            </h2>

            <p className="text-sm sm:text-base text-forest/75 font-sans leading-relaxed">
              Wholesome surplus food currently available from local commercial kitchens, canteens, and bakeries — verified and ready for same-day community intake.
            </p>
          </div>

          <Link
            to="/donations"
            className="inline-flex items-center gap-2 text-sm font-semibold text-terracotta hover:text-forest transition-colors self-start md:self-end pb-1 border-b-2 border-terracotta/40 hover:border-forest group shrink-0"
          >
            <span>Explore all open donations</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        </div>

        {/* 3 Editorial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading
            ? [1, 2, 3].map((placeholder) => (
                <div
                  key={placeholder}
                  className="rounded-3xl bg-warmwhite border border-forest/10 p-5 h-96 animate-pulse"
                />
              ))
            : items.map((donation, index) => {
                const photoSrc = resolveDonationPhoto(donation);
                const deadlineInfo = formatDonationDeadline(donation.collectionDeadline);

                return (
                  <motion.article
                    key={donation._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group bg-warmwhite rounded-3xl overflow-hidden border border-forest/15 shadow-warm hover:shadow-editorial transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                  >
                    <div>
                      {/* Photographic Header with High-Contrast Badges */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream">
                        <img
                          src={photoSrc}
                          alt={donation.title}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-104"
                          loading="lazy"
                        />

                        {/* 1. Category Label: Solid High-Contrast Badge in Top-Left Corner */}
                        <div className="absolute top-3.5 left-3.5 z-20 bg-white text-forest text-xs font-bold px-3.5 py-1.5 rounded-full border border-forest/25 shadow-md flex items-center gap-1.5 select-none">
                          <Tag className="w-3.5 h-3.5 text-apricot shrink-0" />
                          <span>{formatFoodCategory(donation.foodCategory)}</span>
                        </div>

                        {/* 2. Status Label: Solid High-Contrast Badge in Bottom-Right Corner */}
                        <div className="absolute bottom-3.5 right-3.5 z-20 select-none">
                          {deadlineInfo.isExpired ? (
                            <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border border-rose-500 flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />
                              <span>Expired</span>
                            </span>
                          ) : (
                            <span className="bg-white text-forest text-xs font-bold px-3 py-1 rounded-full shadow-md border border-forest/25 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse shrink-0" />
                              <span>Ready for Pickup</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="p-6 space-y-4">
                        {/* Food Title */}
                        <h3 className="font-serif text-xl font-bold text-darkink leading-snug line-clamp-2 group-hover:text-forest transition-colors">
                          {donation.title}
                        </h3>

                        {/* Quantity Pill */}
                        <div className="flex items-center gap-2 text-xs font-bold text-forest bg-sage/50 px-3 py-1.5 rounded-xl border border-forest/20 w-fit">
                          <Utensils className="w-3.5 h-3.5 text-forest shrink-0" />
                          <span>
                            {donation.quantityMeals} Meals ({donation.quantityKg} kg)
                          </span>
                        </div>

                        {/* Meta Specifications */}
                        <div className="space-y-2 pt-2 border-t border-forest/10 text-xs text-darkink/85 font-sans">
                          {/* Location */}
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-apricot shrink-0" />
                            <span className="truncate font-semibold text-darkink">
                              {donation.location?.city || 'Local Metro Area'}
                              {donation.location?.address ? ` • ${donation.location.address}` : ''}
                            </span>
                          </div>

                          {/* Pickup Deadline */}
                          <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-darkink/70 shrink-0" />
                            <span className="text-darkink/90">
                              Deadline: <strong className="font-bold text-forest">{deadlineInfo.text}</strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer / Action Button */}
                    <div className="p-6 pt-0">
                      {deadlineInfo.isExpired ? (
                        <Link
                          to={`/donations/${donation._id}`}
                          className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-800 font-bold text-xs border border-charcoal-300 transition-colors"
                        >
                          <span>View Historical Record</span>
                          <ArrowRight className="w-3.5 h-3.5 text-charcoal-500" />
                        </Link>
                      ) : (
                        <Link
                          to={`/donations/${donation._id}`}
                          className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
                        >
                          <span className="text-white">View Details & Request</span>
                          <ArrowRight className="w-3.5 h-3.5 text-white transition-transform duration-200 group-hover:translate-x-1" />
                        </Link>
                      )}
                    </div>
                  </motion.article>
                );
              })}
        </div>
      </div>
    </section>
  );
};
