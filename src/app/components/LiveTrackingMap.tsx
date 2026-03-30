import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  ZoomControl,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";
import { Bike, MapPin, MapPinned, Clock, ShieldCheck, Activity, Search, X, Loader2 } from "lucide-react";
import { renderToString } from "react-dom/server";
import { Badge } from "./ui/badge";
import { format } from "date-fns";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";

// Custom icons using Lucide
const createIcon = (IconComponent: any, color: string, isPulsing = false, label?: string) => {
  return L.divIcon({
    html: renderToString(
      <div className="relative flex flex-col items-center">
        {label && (
          <div className="bg-white px-1.5 py-0.5 rounded shadow-md border border-slate-200 mb-1">
            <p className="text-[8px] font-black text-slate-700 leading-none uppercase tracking-tighter">{label}</p>
          </div>
        )}
        <div
          className={`relative ${isPulsing ? "animate-bounce-short" : ""}`}
          style={{ color }}
        >
          <IconComponent size={32} fill="white" strokeWidth={2.5} />
          {isPulsing && (
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30 -z-10"></div>
          )}
        </div>
      </div>,
    ),
    className: "custom-map-icon smooth-marker-move",
    iconSize: [60, 60],
    iconAnchor: [30, 60],
  });
};

const riderIcon = createIcon(Bike, "#3b82f6", true, "Rider");
const pickupIcon = createIcon(MapPin, "#10b981");
const dropoffIcon = createIcon(MapPinned, "#ef4444");
const searchIcon = createIcon(Search, "#6366f1");

interface LiveTrackingMapProps {
  requestId?: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  current: { lat: number; lng: number } | null;
  riderName?: string;
  status?: string;
  timeWindow?: string;
  remark?: string;
  hideSearch?: boolean;
  containerClassName?: string;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

function ChangeView({ center, zoom }: { center: [number, number], zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true, duration: 1.5 });
  }, [center, map, zoom]);
  return null;
}

export function LiveTrackingMap({
  requestId,
  pickup,
  dropoff,
  current,
  riderName,
  status,
  timeWindow,
  remark,
  hideSearch = false,
  containerClassName = "h-[600px]",
}: LiveTrackingMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [historyCoords, setHistoryCoords] = useState<[number, number][]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Smooth position state to prevent jumping
  const [smoothPos, setSmoothPos] = useState<[number, number] | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchPos, setSearchPos] = useState<[number, number] | null>(null);
  const [searchLabel, setSearchLabel] = useState("");
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to smooth out incoming GPS data
  useEffect(() => {
    if (current) {
      const newLat = Number(current.lat);
      const newLng = Number(current.lng);
      
      if (!smoothPos) {
        setSmoothPos([newLat, newLng]);
      } else {
        // Simple smoothing filter: only move if difference is significant 
        // to avoid "dancing" markers on the map
        const latDiff = Math.abs(smoothPos[0] - newLat);
        const lngDiff = Math.abs(smoothPos[1] - newLng);
        
        if (latDiff > 0.00001 || lngDiff > 0.00001) {
           setSmoothPos([newLat, newLng]);
           setLastUpdate(new Date());
        }
      }
    }
  }, [current]);

  const center: [number, number] = smoothPos 
    ? smoothPos 
    : [Number(pickup.lat), Number(pickup.lng)];

  // Fetch actual road route from OSRM
  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const points = current
          ? `${pickup.lng},${pickup.lat};${current.lng},${current.lat};${dropoff.lng},${dropoff.lat}`
          : `${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`;

        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=geojson`,
        );
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [
            c[1],
            c[0],
          ]);
          setRouteCoords(coords);
        }
      } catch (err) {
        console.error("Routing error:", err);
      }
    };

    fetchRoute();
  }, [pickup, current, dropoff]);

  // Fetch Location History (Breadcrumbs)
  useEffect(() => {
    if (requestId) {
      const fetchHistory = async () => {
        try {
          const res = await fetch(`/api/requests/${requestId}/history`);
          if (res.ok) {
            const data = await res.json();
            const coords = data.map((log: any) => [Number(log.lat), Number(log.lng)] as [number, number]);
            setHistoryCoords(coords);
          }
        } catch (err) {
          console.error("History fetch error:", err);
        }
      };
      fetchHistory();
      const interval = setInterval(fetchHistory, 15000);
      return () => clearInterval(interval);
    }
  }, [requestId, current]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const GEOAPIFY_KEY = 'e981beca841349698124675a91674f3a';
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:ph&limit=5&apiKey=${GEOAPIFY_KEY}`
      );
      const data = await res.json();
      
      if (data.features) {
        const results = data.features.map((f: any) => ({
          place_id: f.properties.place_id,
          lat: f.properties.lat,
          lon: f.properties.lon,
          display_name: f.properties.formatted
        }));
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowSuggestions(true);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(val), 400);
  };

  const selectSuggestion = (s: SearchResult) => {
    const pos: [number, number] = [Number(s.lat), Number(s.lon)];
    setSearchPos(pos);
    setSearchLabel(s.display_name.split(',')[0]);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const formatAddress = (fullAddress: string) => {
    const parts = fullAddress.split(",");
    if (parts.length > 1) {
      return { main: parts[0].trim(), sub: parts.slice(1).join(",").trim() };
    }
    return { main: fullAddress, sub: "" };
  };

  const dropoffDetails = formatAddress(dropoff.address);

  return (
    <div className={`w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100 relative group ${containerClassName}`}>
      {/* GLOBAL CSS FOR SMOOTH MARKERS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .smooth-marker-move {
          transition: transform 2s linear !important;
        }
      `}} />

      <MapContainer
        center={center}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <div className="absolute top-1/2 -translate-y-1/2 right-4 z-[9999] flex flex-col gap-2">
          <ZoomControl position="topright" />
        </div>

        {routeCoords.length > 0 && (
          <Polyline positions={routeCoords} color="#10b981" weight={8} opacity={0.6} />
        )}

        {historyCoords.length > 1 && (
          <Polyline positions={historyCoords} color="#3b82f6" weight={4} opacity={0.9} dashArray="1, 8" lineJoin="round" />
        )}

        <Marker position={[Number(pickup.lat), Number(pickup.lng)]} icon={pickupIcon}>
          <Popup>Pickup: {pickup.address}</Popup>
        </Marker>

        <Circle center={[Number(dropoff.lat), Number(dropoff.lng)]} pathOptions={{ color: '#ef4444', fillOpacity: 0.05 }} radius={200} />
        <Marker position={[Number(dropoff.lat), Number(dropoff.lng)]} icon={dropoffIcon}>
          <Popup>Destination: {dropoff.address}</Popup>
        </Marker>

        {smoothPos && (
          <>
            <ChangeView center={smoothPos} />
            <Marker position={smoothPos} icon={riderIcon}>
              <Tooltip permanent direction="top" offset={[0, -40]} className="bg-white border-none shadow-none text-[10px] font-bold">
                {riderName}
              </Tooltip>
            </Marker>
          </>
        )}

        {searchPos && (
          <>
            <ChangeView center={searchPos} zoom={17} />
            <Marker position={searchPos} icon={searchIcon}>
              <Popup>{searchLabel}</Popup>
              <Tooltip permanent direction="top" offset={[0, -40]} className="bg-white border-none shadow-none text-[10px] font-bold text-indigo-600">
                Found Place
              </Tooltip>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* SEARCH INTERFACE */}
      {!hideSearch && (
        <div className="absolute top-4 right-4 left-4 md:left-auto md:w-[350px] z-[9999]">
          <div className="relative group/search">
            <div className="bg-white/95 backdrop-blur shadow-xl border border-slate-200 rounded-2xl flex items-center px-4 h-12 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
              <Search size={18} className="text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={onSearchChange}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Find a business or place..."
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-slate-400 text-sm font-medium w-full"
              />
              {isSearching ? (
                <Loader2 size={16} className="animate-spin text-indigo-500" />
              ) : searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSuggestions([]); }} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={16} className="text-slate-400" />
                </button>
              )}
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-white shadow-2xl border border-slate-100 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <ScrollArea className="max-h-[300px]">
                  <div className="p-1">
                    {suggestions.map((s) => (
                      <button
                        key={s.place_id}
                        onClick={() => selectSuggestion(s)}
                        className="w-full text-left p-3 hover:bg-indigo-50/50 rounded-xl transition-colors flex items-start gap-3"
                      >
                        <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-800 truncate">{s.display_name.split(',')[0]}</p>
                          <p className="text-[10px] text-slate-500 truncate">{s.display_name.split(',').slice(1).join(',').trim()}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="absolute top-20 left-4 z-[9999] max-w-[280px]">
        <div className="bg-white/95 backdrop-blur shadow-xl border border-slate-100 p-3 rounded-2xl flex items-start gap-3">
          <div className="p-2 bg-red-50 text-red-500 rounded-lg shrink-0"><MapPinned size={20} /></div>
          <div className="truncate">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">Destination</p>
            <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">{dropoffDetails.main}</h4>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[9999] max-w-[320px]">
        <div className="bg-white/95 backdrop-blur shadow-2xl border border-slate-100 p-4 rounded-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center font-bold text-base shadow-lg shadow-primary/20 shrink-0">
              {riderName?.substring(0, 1)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 leading-none truncate mb-1">{riderName || "Rider"}</h3>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <p className="text-[10px] font-medium text-slate-500 truncate">Live Tracking Active</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-50/50 text-blue-600 border-blue-100 text-[10px] py-0 px-2 h-5 shrink-0">
              History Enabled
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <Clock className="text-slate-400" size={12} />
              <div className="truncate">
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Last Update</p>
                <p className="text-[10px] font-bold text-slate-700">{format(lastUpdate, 'HH:mm:ss')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="text-slate-400" size={12} />
              <div className="truncate">
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">Status</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">{status || 'In Progress'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
