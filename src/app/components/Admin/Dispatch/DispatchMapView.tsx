import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '../../../types';
import { Bike } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { Button } from '../../ui/button';

// Fix for default Leaflet icons in React
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

// Custom Icons for Origin and Destination
const originIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #10B981; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const destinationIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #EF4444; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// Rider Icon using Lucide Bike
const riderIcon = L.divIcon({
  className: 'custom-div-icon',
  html: renderToString(
    <div className="relative flex flex-col items-center">
      <div className="bg-blue-500 p-1.5 rounded-full border-2 border-white shadow-lg animate-bounce-short">
        <Bike size={18} color="white" strokeWidth={3} />
      </div>
      <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30 -z-10"></div>
    </div>
  ),
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

interface DispatchMapViewProps {
  origin: Location;
  destination: Location;
  current?: { lat: number, lng: number } | null;
}

function RecenterMap({ origin, destination, current }: DispatchMapViewProps) {
  const map = useMap();
  
  useEffect(() => {
    if (origin && destination) {
      const points: [number, number][] = [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng]
      ];
      
      if (current) {
        points.push([current.lat, current.lng]);
      }
      
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [origin, destination, current, map]);

  return null;
}

export const DispatchMapView: React.FC<DispatchMapViewProps> = ({ origin, destination, current }) => {
  const mapRef = useRef<L.Map | null>(null);
  const polylinePositions: [number, number][] = [
    [origin.lat, origin.lng],
    [destination.lat, destination.lng]
  ];

  return (
    <div className="w-full h-full rounded-[2rem] overflow-hidden border border-slate-100 shadow-inner bg-slate-50 relative group">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sonar-ripple-mini {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
        .ripple-mini::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background: inherit;
          border-radius: inherit;
          animation: sonar-ripple-mini 2s ease-out infinite;
          z-index: -1;
        }
        .fab-glow-mini {
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3);
        }
      `}} />

      <MapContainer 
        center={[origin.lat, origin.lng]} 
        zoom={13} 
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Origin Marker */}
        <Marker position={[origin.lat, origin.lng]} icon={originIcon} />
        
        {/* Destination Marker */}
        <Marker position={[destination.lat, destination.lng]} icon={destinationIcon} />
        
        {/* Rider Marker */}
        {current && (
          <Marker position={[current.lat, current.lng]} icon={riderIcon} />
        )}
        
        {/* Route Line */}
        <Polyline 
          positions={polylinePositions} 
          color="#3B82F6" 
          weight={3} 
          dashArray="10, 10" 
          opacity={0.6}
        />
        
        <RecenterMap origin={origin} destination={destination} current={current} />
      </MapContainer>

      {/* Floating Driver Locator Button - Dashboard Version */}
      {current && (
        <div className="absolute bottom-4 right-4 z-[1000]">
          <div className="group/fab relative">
            <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md opacity-0 group-hover/fab:opacity-100 transition-all pointer-events-none whitespace-nowrap shadow-lg">
              Locate Rider
            </div>
            <Button
              onClick={() => {
                mapRef.current?.flyTo([current.lat, current.lng], 16, { duration: 1.2 });
              }}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-lg transition-all hover:scale-110 active:scale-90 ripple-mini fab-glow-mini flex items-center justify-center border-none p-0 overflow-visible"
            >
              <Bike size={18} md:size={20} strokeWidth={2.5} className="drop-shadow-md" />
            </Button>
          </div>
        </div>
      )}

      {/* Map Overlays */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Origin</p>
            <p className="text-[10px] font-bold text-slate-700 max-w-[150px] truncate">{origin.address}</p>
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Destination</p>
            <p className="text-[10px] font-bold text-slate-700 max-w-[150px] truncate">{destination.address}</p>
          </div>
        </div>
        {current && (
          <div className="bg-blue-500 p-3 rounded-2xl shadow-lg border border-blue-400 flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <div>
              <p className="text-[9px] font-black text-white/80 uppercase tracking-widest">Rider Location</p>
              <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Live Tracking Active</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
