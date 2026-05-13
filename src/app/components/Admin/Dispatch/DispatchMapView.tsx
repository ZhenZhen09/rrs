import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location } from '../../../types';
import { Button } from '../../ui/button';
import carTopViewIconUrl from '../../../assets/car-top-view-marker.svg';

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

// Rider Icon using car top-view asset
const riderIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; animation: car-road-glide-mini 1.4s ease-in-out infinite;">
      <img
        src="${carTopViewIconUrl}"
        alt=""
        style="width: 46px; height: 46px; object-fit: contain; filter: drop-shadow(0 8px 10px rgba(15,23,42,0.28));"
      />
      <div style="position: absolute; inset: 0; background: #60a5fa; border-radius: 9999px; opacity: 0.22; z-index: -1; animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23]
});

interface DispatchMapViewProps {
  origin: Location;
  destination: Location;
  current?: { lat: number, lng: number } | null;
}

function MapCameraController({
  origin,
  destination,
  current,
  followMode,
  onUserInteraction,
}: DispatchMapViewProps & {
  followMode: boolean;
  onUserInteraction: () => void;
}) {
  const hasInitialFitRef = useRef(false);
  const isProgrammaticMove = useRef(false);
  const map = useMapEvents({
    dragstart: () => {
      if (!isProgrammaticMove.current) onUserInteraction();
    },
    zoomstart: () => {
      if (!isProgrammaticMove.current) onUserInteraction();
    },
  });

  useEffect(() => {
    if (!origin || !destination || hasInitialFitRef.current) {
      return;
    }

    isProgrammaticMove.current = true;
    const points: [number, number][] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];

    if (current) {
      points.push([current.lat, current.lng]);
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], animate: false });
    hasInitialFitRef.current = true;
    window.setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 100);
  }, [origin, destination, current, map]);

  useEffect(() => {
    if (!current || !followMode) {
      return;
    }

    isProgrammaticMove.current = true;
    map.panTo([current.lat, current.lng], {
      animate: true,
      duration: 0.7,
      easeLinearity: 0.35,
      noMoveStart: true,
    });

    const timeout = window.setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [current, followMode, map]);

  return null;
}

export const DispatchMapView: React.FC<DispatchMapViewProps> = ({ origin, destination, current }) => {
  const mapRef = useRef<L.Map | null>(null);
  const [followMode, setFollowMode] = React.useState(true);
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
        @keyframes car-road-glide-mini {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1px) scale(1.025); }
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
        
        <MapCameraController
          origin={origin}
          destination={destination}
          current={current}
          followMode={followMode}
          onUserInteraction={() => setFollowMode(false)}
        />
      </MapContainer>

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

      {current && (
        <div className="absolute bottom-4 right-4 z-[400] flex flex-col items-end gap-2">
          <div className="rounded-full bg-white/95 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-slate-600 shadow-lg border border-slate-100">
            Follow {followMode ? 'On' : 'Off'}
          </div>
          <Button
            type="button"
            onClick={() => {
              setFollowMode(true);
              mapRef.current?.panTo([current.lat, current.lng], {
                animate: true,
                duration: 0.8,
              });
            }}
            className={`h-10 w-10 rounded-full border-none p-0 shadow-xl ${
              followMode
                ? 'bg-gradient-to-br from-emerald-500 to-blue-600'
                : 'bg-gradient-to-br from-slate-700 to-slate-950'
            }`}
            aria-label={followMode ? 'Following rider location' : 'Recenter rider location'}
          >
            <img src={carTopViewIconUrl} alt="" className="h-7 w-7 object-contain drop-shadow-md" />
          </Button>
        </div>
      )}
    </div>
  );
};
