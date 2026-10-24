import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchNgoDirectory } from '../services/api';
import { FoodMap, type MapNgoItem } from '../components/FoodMap';
import { 
  HeartHandshake, 
  MapPin, 
  ShieldCheck, 
  Search, 
  Map, 
  List, 
  Sparkles, 
  Phone 
} from 'lucide-react';
import { CardSkeleton } from '../components/SkeletonLoader';

export const NgoDirectoryPage: React.FC = () => {
  const [ngos, setNgos] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const loadNgos = async () => {
    setLoading(true);
    try {
      const data = await fetchNgoDirectory({
        city: selectedCity !== 'all' ? selectedCity : undefined,
        verifiedOnly: 'false',
        search: searchTerm || undefined,
      });
      setNgos(data.ngos);
    } catch (err) {
      console.error('Error loading NGOs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNgos();
  }, [selectedCity]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadNgos();
  };

  // Convert NGOs to Map format
  const mapNgos: MapNgoItem[] = ngos.map(n => ({
    id: n._id,
    name: n.name,
    capacity: n.capacity?.currentAvailableCapacity || n.capacity?.maxMealsPerDay || 100,
    address: n.location?.address || '',
    city: n.location?.city || '',
    coordinates: n.location?.coordinates || [77.2090, 28.6139],
    hasRefrigeration: n.capacity?.hasRefrigeration || false,
    hasTransportFleet: n.capacity?.hasTransportFleet || false,
  }));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-900/10 text-forest-900 text-xs font-bold mb-2">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified Partner Network</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900">
            NGO & Community Kitchen Directory
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Discover verified food banks, shelters, and distribution partners across Delhi NCR.
          </p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex p-1 rounded-xl bg-charcoal-200/70 border border-charcoal-300/60">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'list' ? 'bg-white text-forest-900 shadow-xs' : 'text-charcoal-600'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'map' ? 'bg-white text-forest-900 shadow-xs' : 'text-charcoal-600'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-charcoal-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by shelter name or keyword..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-charcoal-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-charcoal-200 text-xs bg-white font-medium"
            >
              <option value="all">All Cities</option>
              <option value="New Delhi">New Delhi</option>
              <option value="Noida">Noida</option>
              <option value="Greater Noida">Greater Noida</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-forest-900 text-white font-semibold text-xs hover:bg-forest-800 transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* View Content */}
      {viewMode === 'map' ? (
        <div className="h-[520px]">
          <FoodMap ngos={mapNgos} zoom={11} showRadiusCircle={true} />
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : ngos.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center space-y-3 border border-charcoal-200 text-xs text-charcoal-500">
          <HeartHandshake className="w-8 h-8 text-charcoal-400 mx-auto" />
          <p className="font-semibold text-charcoal-800">No NGOs found matching the criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ngos.map(ngo => (
            <div
              key={ngo._id}
              className="glass-card rounded-2xl p-6 border border-charcoal-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded">
                    {ngo.type.replace('_', ' ')}
                  </span>
                  {ngo.verificationStatus === 'verified' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified Partner</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      Pending Vetting
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-charcoal-900 leading-snug">
                  {ngo.name}
                </h3>

                <p className="text-xs text-charcoal-600 line-clamp-2">
                  {ngo.description || 'Community shelter and welfare home.'}
                </p>

                <div className="text-xs text-charcoal-600 space-y-1 pt-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{ngo.location.address}, {ngo.location.city}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-charcoal-500">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{ngo.phone}</span>
                  </div>
                </div>
              </div>

              {/* Capacity & Handling Spec Pills */}
              <div className="py-2.5 border-y border-charcoal-100 grid grid-cols-2 gap-2 text-[11px] text-charcoal-700">
                <div>Daily Intake: <strong className="text-charcoal-900">{ngo.capacity?.maxMealsPerDay} meals</strong></div>
                <div>Available: <strong className="text-emerald-700">{ngo.capacity?.currentAvailableCapacity} meals</strong></div>
                <div>Cold Storage: <strong className="text-charcoal-900">{ngo.capacity?.hasRefrigeration ? 'Yes' : 'No'}</strong></div>
                <div>Vehicle Fleet: <strong className="text-charcoal-900">{ngo.capacity?.hasTransportFleet ? 'Equipped' : 'No'}</strong></div>
              </div>

              {/* Action */}
              <Link
                to="/donations/create"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <span>Offer Food Donation</span>
                <Sparkles className="w-3.5 h-3.5 text-lime-300" />
              </Link>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
