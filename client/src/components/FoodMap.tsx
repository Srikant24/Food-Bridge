import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { ExternalLink } from 'lucide-react';

// Custom modern Leaflet SVG Pin Generator
const createCustomIcon = (bgColor: string, iconHtml: string) => {
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="
        background: ${bgColor};
        width: 36px;
        height: 36px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        border: 2px solid white;
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center; color: white;">
          ${iconHtml}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

const providerIcon = createCustomIcon(
  '#14532D', 
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A3E635" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"/><path d="M15 2v10"/><path d="M12 2v8"/><path d="M18 12a6 6 0 0 1-6 6v4"/><path d="M6 2v20"/></svg>'
);

const ngoIcon = createCustomIcon(
  '#10B981', 
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>'
);

export interface MapDonationItem {
  id: string;
  title: string;
  meals: number;
  category: string;
  address: string;
  city: string;
  coordinates: [number, number]; // [lng, lat]
  deadline: string;
  status: string;
}

export interface MapNgoItem {
  id: string;
  name: string;
  capacity: number;
  address: string;
  city: string;
  coordinates: [number, number]; // [lng, lat]
  hasRefrigeration: boolean;
  hasTransportFleet: boolean;
}

interface FoodMapProps {
  donations?: MapDonationItem[];
  ngos?: MapNgoItem[];
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  highlightedCoord?: [number, number]; // [lng, lat]
  showRadiusCircle?: boolean;
}

export const FoodMap: React.FC<FoodMapProps> = ({
  donations = [],
  ngos = [],
  center = [28.6139, 77.2090], // Delhi NCR center [lat, lng]
  zoom = 11,
  highlightedCoord,
  showRadiusCircle = false,
}) => {
  return (
    <div className="w-full h-full min-h-[420px] rounded-3xl overflow-hidden shadow-lg border border-charcoal-200 relative z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={false}
        className="w-full h-full min-h-[420px]"
      >
        {/* Clean OpenStreetMap CartoDB tiles for elegant SaaS dashboard aesthetic */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Radius Circle if selected */}
        {showRadiusCircle && highlightedCoord && (
          <Circle
            center={[highlightedCoord[1], highlightedCoord[0]]}
            radius={15000} // 15 km service radius
            pathOptions={{
              color: '#10B981',
              fillColor: '#10B981',
              fillOpacity: 0.1,
              weight: 1.5,
              dashArray: '4, 8',
            }}
          />
        )}

        {/* Donation Markers */}
        {donations.map((d) => (
          <Marker
            key={`donation-${d.id}`}
            position={[d.coordinates[1], d.coordinates[0]]}
            icon={providerIcon}
          >
            <Popup className="custom-leaflet-popup">
              <div className="p-1 space-y-2 text-charcoal-900 max-w-[220px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-forest-900 bg-forest-50 px-2 py-0.5 rounded">
                    Surplus Batch
                  </span>
                  <span className="text-[10px] font-bold text-rose-600">
                    {d.status}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-charcoal-900 leading-snug">
                  {d.title}
                </h4>
                <div className="text-[11px] text-charcoal-600 space-y-0.5">
                  <div className="font-semibold text-emerald-700">{d.meals} servings available</div>
                  <div className="text-[10px] text-charcoal-500 truncate">{d.address}, {d.city}</div>
                </div>
                <div className="pt-1 border-t border-charcoal-100 flex items-center justify-between">
                  <a
                    href={`/donations/${d.id}`}
                    className="text-[11px] font-bold text-forest-900 hover:text-emerald-600 underline"
                  >
                    View Details
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${d.coordinates[1]},${d.coordinates[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-charcoal-500 hover:text-charcoal-900"
                  >
                    <span>Nav</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* NGO Markers */}
        {ngos.map((ngo) => (
          <Marker
            key={`ngo-${ngo.id}`}
            position={[ngo.coordinates[1], ngo.coordinates[0]]}
            icon={ngoIcon}
          >
            <Popup className="custom-leaflet-popup">
              <div className="p-1 space-y-2 text-charcoal-900 max-w-[220px]">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    Verified Recipient
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700">
                    ✓ 80G
                  </span>
                </div>
                <h4 className="font-bold text-xs text-charcoal-900 leading-snug">
                  {ngo.name}
                </h4>
                <div className="text-[11px] text-charcoal-600 space-y-0.5">
                  <div>Capacity: <span className="font-semibold text-charcoal-900">{ngo.capacity} meals/day</span></div>
                  <div>Cold Storage: <span className="font-semibold text-charcoal-900">{ngo.hasRefrigeration ? 'Equipped' : 'None'}</span></div>
                  <div>Transport: <span className="font-semibold text-charcoal-900">{ngo.hasTransportFleet ? 'Fleet Ready' : 'Volunteer'}</span></div>
                </div>
                <div className="pt-1 border-t border-charcoal-100 flex items-center justify-between">
                  <span className="text-[10px] text-charcoal-500">{ngo.city}</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${ngo.coordinates[1]},${ngo.coordinates[0]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-charcoal-500 hover:text-charcoal-900"
                  >
                    <span>Route</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend Floating Badge */}
      <div className="absolute bottom-4 left-4 z-[400] glass-card px-3 py-2 rounded-xl border border-charcoal-200/90 shadow-md text-[11px] font-semibold text-charcoal-800 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-forest-900 border border-white"></span>
          <span>Food Provider ({donations.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span>
          <span>Verified NGO ({ngos.length})</span>
        </div>
      </div>
    </div>
  );
};
