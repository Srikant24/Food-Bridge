import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Utensils, 
  Clock, 
  MapPin, 
  ArrowRight, 
  Building2,
  Tag,
  AlertCircle
} from 'lucide-react';
import type { DonationItem } from '../services/api';
import {
  resolveDonationPhoto,
  formatFoodCategory,
  formatDonationDeadline,
} from '../utils/donationImageResolver';

interface DonationCardProps {
  donation: DonationItem;
  delay?: number;
}

export const DonationCard: React.FC<DonationCardProps> = ({ 
  donation, 
  delay = 0 
}) => {
  const photoSrc = resolveDonationPhoto(donation);
  const deadlineInfo = formatDonationDeadline(donation.collectionDeadline);
  const isExpired = deadlineInfo.isExpired || donation.status === 'expired';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-3xl bg-warmwhite border border-forest/15 shadow-warm hover:shadow-editorial hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
    >
      <div>
        {/* 1. Image Header with High-Contrast Solid Badges */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream">
          <img
            src={photoSrc}
            alt={donation.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-104"
            loading="lazy"
          />

          {/* Solid Category Badge in Top-Left Corner */}
          <div className="absolute top-3 left-3 z-20 bg-white text-forest text-xs font-bold px-3 py-1.5 rounded-full border border-forest/25 shadow-md flex items-center gap-1.5 select-none">
            <Tag className="w-3.5 h-3.5 text-apricot shrink-0" />
            <span>{formatFoodCategory(donation.foodCategory)}</span>
          </div>

          {/* Solid High-Contrast Status Badge in Bottom-Right Corner */}
          <div className="absolute bottom-3 right-3 z-20 select-none">
            {isExpired ? (
              <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border border-rose-500 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Expired</span>
              </span>
            ) : donation.status === 'pickup_scheduled' || donation.status === 'requested' ? (
              <span className="bg-honey text-darkink text-xs font-bold px-3 py-1 rounded-full shadow-md border border-honey-600/30 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-darkink shrink-0" />
                <span>In Motion</span>
              </span>
            ) : donation.status === 'completed' || donation.status === 'delivered' ? (
              <span className="bg-forest text-white text-xs font-bold px-3 py-1 rounded-full shadow-md border border-white/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sage inline-block shrink-0" />
                <span>Delivered</span>
              </span>
            ) : (
              <span className="bg-white text-forest text-xs font-bold px-3 py-1 rounded-full shadow-md border border-forest/25 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block animate-pulse shrink-0" />
                <span>Ready for Pickup</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Content Body */}
        <div className="p-5 sm:p-6 space-y-3.5">
          {/* Food Title */}
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-darkink leading-snug line-clamp-2 group-hover:text-forest transition-colors">
              {donation.title}
            </h3>
            {donation.description && (
              <p className="text-xs text-darkink/75 line-clamp-1 mt-1 font-sans">
                {donation.description}
              </p>
            )}
          </div>

          {/* Organization / Kitchen Badge */}
          <div className="p-2.5 rounded-xl bg-cream/70 border border-forest/15 text-xs text-darkink font-medium flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <Building2 className="w-3.5 h-3.5 text-forest shrink-0" />
              <span className="font-bold truncate text-darkink">
                {donation.organizationId?.name || 'Local Kitchen Partner'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold text-forest bg-sage/60 px-2 py-0.5 rounded-md border border-forest/15">
              {donation.dietaryType.replace('_', ' ')}
            </span>
          </div>

          {/* Quantities & Storage Grid */}
          <div className="flex items-center gap-2 text-xs font-bold text-forest bg-sage/50 px-3 py-1.5 rounded-xl border border-forest/20 w-fit">
            <Utensils className="w-3.5 h-3.5 text-forest shrink-0" />
            <span>
              {donation.quantityMeals} Meals ({donation.quantityKg} kg)
            </span>
          </div>

          {/* Location & Deadline */}
          <div className="space-y-1.5 pt-2 border-t border-forest/10 text-xs text-darkink/85 font-sans">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-apricot shrink-0" />
              <span className="truncate font-semibold text-darkink">
                {donation.location?.city || 'Local Metro'}
                {donation.location?.address ? ` • ${donation.location.address}` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-darkink/70 shrink-0" />
              <span className="text-darkink/90">
                {isExpired ? (
                  <strong className="text-rose-600 font-bold">{deadlineInfo.text}</strong>
                ) : (
                  <>Deadline: <strong className="font-bold text-forest">{deadlineInfo.text}</strong></>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Action Button Footer */}
      <div className="p-5 sm:p-6 pt-0">
        {isExpired ? (
          <Link
            to={`/donations/${donation._id}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-800 font-bold text-xs border border-charcoal-300 transition-colors"
          >
            <span>View Historical Record</span>
            <ArrowRight className="w-3.5 h-3.5 text-charcoal-500" />
          </Link>
        ) : (
          <Link
            to={`/donations/${donation._id}`}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-forest hover:bg-forest-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          >
            <span className="text-white">View Details & Request</span>
            <ArrowRight className="w-3.5 h-3.5 text-white transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </motion.div>
  );
};
