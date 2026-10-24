import React, { useState, useEffect } from 'react';
import { fetchDonations, type DonationItem } from '../services/api';
import { 
  Utensils, 
  Search, 
  RefreshCw 
} from 'lucide-react';
import { CardSkeleton } from '../components/SkeletonLoader';
import { DonationCard } from '../components/DonationCard';

export const AvailableDonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('available');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<string>('all');

  const loadDonations = async () => {
    setLoading(true);
    try {
      const data = await fetchDonations({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        foodCategory: categoryFilter !== 'all' ? categoryFilter : undefined,
        dietaryType: dietaryFilter !== 'all' ? dietaryFilter : undefined,
        urgency: urgencyFilter !== 'all' ? urgencyFilter : undefined,
      });
      setDonations(data.donations || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, [statusFilter, urgencyFilter, categoryFilter, dietaryFilter]);

  const nowMs = Date.now();
  const filtered = donations
    .filter(d => {
      if (statusFilter === 'available') {
        const isExpired = new Date(d.collectionDeadline).getTime() <= nowMs;
        return d.status === 'available' && !isExpired;
      }
      return true;
    })
    .filter(d => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        d.title.toLowerCase().includes(term) ||
        d.description.toLowerCase().includes(term) ||
        d.location.city.toLowerCase().includes(term) ||
        (d.organizationId?.name || '').toLowerCase().includes(term)
      );
    });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-bold mb-2 border border-forest/15">
            <Utensils className="w-3.5 h-3.5 text-emerald-600" />
            <span>Surplus Food Exchange</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900 tracking-tight">
            Available <span className="text-forest">Surplus Food Batches</span>
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Browse verified food listings ready for pickup by registered NGOs, shelters, and community kitchens.
          </p>
        </div>

        <button
          onClick={loadDonations}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-sage hover:bg-emerald-50 text-xs font-semibold text-charcoal-700 transition-colors self-start md:self-auto shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Listings</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-sage/80 shadow-glass space-y-4 bg-white/90 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, food or city..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-sage text-xs bg-cream/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-sage text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="available">Active Available</option>
              <option value="all">All Records (Historical)</option>
              <option value="expired">Expired Listings</option>
              <option value="completed">Delivered / Completed</option>
            </select>
          </div>

          {/* Urgency */}
          <div>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-sage text-xs bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Urgency Levels</option>
              <option value="critical">Critical Urgency (&lt; 2h left)</option>
              <option value="urgent">Urgent (&lt; 6h left)</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs bg-white font-medium"
            >
              <option value="all">All Food Categories</option>
              <option value="cooked_meals">Cooked Prepared Meals</option>
              <option value="bakery">Fresh Bakery</option>
              <option value="packaged_produce">Packaged Produce</option>
              <option value="fruits_vegetables">Fruits & Vegetables</option>
              <option value="dairy">Dairy</option>
            </select>
          </div>

          {/* Dietary */}
          <div>
            <select
              value={dietaryFilter}
              onChange={(e) => setDietaryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-charcoal-200 text-xs bg-white font-medium"
            >
              <option value="all">All Dietary Types</option>
              <option value="veg">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="contains_eggs">Contains Eggs</option>
              <option value="non_veg">Non-Vegetarian</option>
            </select>
          </div>

        </div>
      </div>

      {/* Grid of Listings */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-dashed border-charcoal-300">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Utensils className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-charcoal-900">No matching surplus listings found</h3>
            <p className="text-xs text-charcoal-500 mt-1 max-w-sm mx-auto">
              Try adjusting your urgency or food category filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((donation, idx) => (
            <DonationCard
              key={donation._id}
              donation={donation}
              delay={idx * 0.05}
            />
          ))}
        </div>
      )}

    </div>
  );
};
