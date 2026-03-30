import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMapEvents,
  useMap,
  ZoomControl,
  Marker
} from "react-leaflet";
import L from "leaflet";
import { type Location } from "../types";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { MapPin, Loader2, Target, X, Navigation, History, Star, ArrowRight, Search, Map as MapIcon, ChevronRight, Check, MapPinned, Info, Building2, InfoIcon } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";

// Fix default marker icon issue
const iconRetinaUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png";
const iconUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png";
const shadowUrl = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export interface MapPickerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
  title: string;
  isStandalone?: boolean;
}

interface SearchResult {
  place_id: string;
  lat: number;
  lon: number;
  display_name: string;
  name?: string;
  type?: 'address' | 'business';
  category?: string;
}

function MapInteractions({ 
  onCenterChanged, 
  onMapClick 
}: { 
  onCenterChanged: (lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onCenterChanged(center.lat, center.lng);
    },
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
      map.setView(e.latlng, map.getZoom(), { animate: true });
    },
  });
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

function FixMapSize({ watch }: { watch?: any }) {
  const map = useMap();
  useEffect(() => {
    const intervals = [10, 50, 150, 300, 500, 1000];
    const timers = intervals.map((ms) => setTimeout(() => map.invalidateSize(), ms));
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    const container = map.getContainer();
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(container);
    }
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [map, watch]);
  return null;
}

export function MapPickerContent({ 
  onLocationSelect, 
  initialLocation, 
  title, 
  onClose,
  isStandalone = false 
}: { 
  onLocationSelect: (location: Location) => void; 
  initialLocation?: Location; 
  title: string;
  onClose?: () => void;
  isStandalone?: boolean;
}) {
  // DEFAULT LOCATION: Toyota Pasong Tamo @ Chino Roces Ave
  const defaultCenter: [number, number] = [14.544837, 121.018449];
  const defaultAddress = { 
    main: "Toyota Pasong Tamo", 
    sub: "2292 Chino Roces Ave, Makati, 1231 Metro Manila" 
  };
  const defaultBusinessName = "Toyota Pasong Tamo";

  const [mapCenter, setMapCenter] = useState<[number, number]>(initialLocation ? [initialLocation.lat, initialLocation.lng] : defaultCenter);
  const [currentPos, setCurrentPos] = useState<[number, number]>(mapCenter);
  
  const [addressDetails, setAddressDetails] = useState<{ main: string; sub: string; }>(
    initialLocation ? { main: "Loading...", sub: "Please wait" } : defaultAddress
  );
  const [customAddressName, setCustomAddressName] = useState(
    initialLocation ? "" : defaultBusinessName
  );
  
  const [landmarks, setLandmarks] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Geoapify Specific States
  const [discoveryResults, setDiscoveryResults] = useState<any[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  
  const hasEditedRef = useRef(!initialLocation); // Set to true if using default so it doesn't get overwritten immediately
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  const GEOAPIFY_KEY = 'e981beca841349698124675a91674f3a'; // Updated Geoapify Key

  const formatAddress = (fullAddress: string) => {
    const cleanAddress = fullAddress.replace(/ \(Landmarks:.*?\)/, '');
    const parts = cleanAddress.split(",");
    if (parts.length > 1) {
      return { main: parts[0].trim(), sub: parts.slice(1).join(",").trim() };
    }
    return { main: cleanAddress, sub: "" };
  };

  // 1. Discovery/Nearby Search Logic
  const fetchNearbyPlaces = async (lat: number, lon: number) => {
    // Cancel previous discovery request
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsDiscovering(true);
    try {
      // Nearby search for businesses, cafes, offices, etc.
      const response = await fetch(
        `https://api.geoapify.com/v2/places?categories=commercial,catering,education,healthcare,office,entertainment,tourism&filter=circle:${lon},${lat},1000&bias=proximity:${lon},${lat}&limit=10&apiKey=${GEOAPIFY_KEY}`,
        { signal }
      );
      const data = await response.json();
      if (data.features) {
        setDiscoveryResults(data.features.map((f: any) => ({
          name: f.properties.name || f.properties.street || "Business/Building",
          address: f.properties.formatted,
          lat: f.properties.lat,
          lon: f.properties.lon,
          category: f.properties.categories[0]?.replace(/_/g, ' ') || 'Place'
        })));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Discovery failed", error);
    } finally {
      if (!signal.aborted) {
        setIsDiscovering(false);
      }
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    // Cancel previous search request
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsSearching(true);
    try {
      // Use only Autocomplete API for the dropdown - it's much faster and includes POIs
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:ph&limit=10&apiKey=${GEOAPIFY_KEY}`,
        { signal }
      );

      if (!response.ok) {
        throw new Error(`Autocomplete API error: ${response.status}`);
      }
      
      const data = await response.json();
      const addrSuggestions = data.features ? data.features.map((f: any) => ({
        place_id: f.properties.place_id,
        lat: f.properties.lat,
        lon: f.properties.lon,
        display_name: f.properties.formatted,
        name: f.properties.name || f.properties.street || formatAddress(f.properties.formatted).main,
        type: 'address' as const
      })) : [];

      if (!signal.aborted) {
        setSuggestions(addrSuggestions);
        if (addrSuggestions.length > 0) setShowSuggestions(true);
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error("Search failed:", error);
    } finally {
      if (!signal.aborted) {
        setIsSearching(false);
      }
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      if (initialLocation) {
        const formatted = formatAddress(initialLocation.address);
        setAddressDetails(formatted);
        setCustomAddressName(formatted.main);
        const landmarkMatch = initialLocation.address.match(/\(Landmarks: (.*?)\)/);
        if (landmarkMatch && landmarkMatch[1]) setLandmarks(landmarkMatch[1]);
        hasEditedRef.current = true;
        fetchNearbyPlaces(initialLocation.lat, initialLocation.lng);
      } else {
        // Just fetch nearby places for the default location
        fetchNearbyPlaces(defaultCenter[0], defaultCenter[1]);
      }
      isInitialMount.current = false;
      return;
    }

    if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
    setIsGeocoding(true);
    setAddressDetails({ main: "Locating...", sub: "Fetching address details" });

    geocodeTimeoutRef.current = setTimeout(async () => {
      try {
        // Use Geoapify for Reverse Geocoding
        const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${currentPos[0]}&lon=${currentPos[1]}&apiKey=${GEOAPIFY_KEY}`);
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const prop = data.features[0].properties;
          const foundAddress = prop.formatted || "Unknown Location";
          const formatted = formatAddress(foundAddress);
          setAddressDetails(formatted);
          if (!hasEditedRef.current) {
            setCustomAddressName(prop.name || prop.street || formatted.main);
          }
        } else {
          setAddressDetails({ main: "Unknown Location", sub: `Coordinates: ${currentPos[0].toFixed(5)}, ${currentPos[1].toFixed(5)}` });
        }
        
        // Also fetch nearby businesses whenever point changes
        fetchNearbyPlaces(currentPos[0], currentPos[1]);
        
      } catch (error) {
        setAddressDetails({ main: "Unknown Location", sub: `Coordinates: ${currentPos[0].toFixed(5)}, ${currentPos[1].toFixed(5)}` });
      } finally {
        setIsGeocoding(false);
      }
    }, 600);
  }, [currentPos[0], currentPos[1]]);

  const handleCenterChanged = (lat: number, lng: number) => {
    setCurrentPos([lat, lng]);
    hasEditedRef.current = false;
  };

  const handleMapClick = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setCurrentPos([lat, lng]);
    hasEditedRef.current = false;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (value.trim().length >= 2) {
      setShowSuggestions(true);
      searchTimeoutRef.current = setTimeout(() => fetchSuggestions(value), 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: SearchResult) => {
    const newPos: [number, number] = [suggestion.lat, suggestion.lon];
    setMapCenter(newPos);
    setCurrentPos(newPos);
    const formatted = formatAddress(suggestion.display_name);
    setAddressDetails(formatted);
    setCustomAddressName(suggestion.name || formatted.main);
    hasEditedRef.current = true;
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleSelectDiscovery = (place: any) => {
    const newPos: [number, number] = [place.lat, place.lon];
    setMapCenter(newPos);
    setCurrentPos(newPos);
    const formatted = formatAddress(place.address);
    setAddressDetails(formatted);
    setCustomAddressName(place.name);
    hasEditedRef.current = true;
  };

  const handleConfirm = () => {
    onLocationSelect({ 
      lat: currentPos[0], 
      lng: currentPos[1], 
      address: addressDetails.sub || "Selected Location",
      businessName: customAddressName,
      landmarks: landmarks
    });
  };

  const locateMe = () => {
    if ("geolocation" in navigator) {
      setIsGeocoding(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setCurrentPos([latitude, longitude]);
          hasEditedRef.current = false;
        },
        () => {
          toast.error("Could not get your location. Please check permissions.");
          setIsGeocoding(false);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  const containerClasses = isStandalone 
    ? "w-full h-full relative overflow-hidden bg-white flex flex-col md:flex-row" 
    : "max-w-6xl w-[95vw] h-[90dvh] md:h-[min(900px,85vh)] p-0 overflow-hidden bg-white border-none rounded-[2rem] shadow-2xl [&>button:last-child]:hidden sm:rounded-[2rem] relative";

  return (
    <div className={containerClasses}>
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-sidebar-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        /* For Firefox */
        .custom-sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #e2e8f0 transparent;
        }
      `}} />
      
      {/* FULLSCREEN MAP FOUNDATION */}
      <div className={`absolute inset-0 z-0 bg-[#e5e3df] transition-all duration-500 ease-in-out ${isExpanded ? 'md:pl-[424px]' : 'md:pl-0'}`}>
        <MapContainer 
          center={mapCenter} 
          zoom={16} 
          style={{ height: "100%", width: "100%" }} 
          zoomControl={false} 
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
          <FixMapSize watch={isExpanded} />
          <ChangeView center={mapCenter} />
          <MapInteractions onCenterChanged={handleCenterChanged} onMapClick={handleMapClick} />
          <ZoomControl position="bottomright" />
          
          {/* Real Map Marker instead of CSS Overlay */}
          <Marker position={currentPos} icon={DefaultIcon}>
             {/* Optional: Add a simple popup or tooltip if needed */}
          </Marker>
        </MapContainer>
      </div>

      {/* FLOATING SIDEBAR */}
      <div className={`
        absolute z-50 transition-all duration-500 ease-in-out
        md:top-6 md:left-6 md:bottom-6 md:w-[400px]
        top-0 left-0 w-full h-full md:h-auto
        ${isExpanded ? 'translate-x-0' : 'md:-translate-x-[calc(100%-20px)] -translate-y-[calc(100%-80px)] md:translate-y-0'}
      `}>
        <div className="w-full h-full bg-white md:rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100/50 flex flex-col overflow-hidden relative">
          
          {/* Header (Search) */}
          <div className="p-6 pb-4 border-b border-slate-50 relative">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <div className="p-2 bg-[#00B14F] rounded-xl shadow-lg shadow-[#00B14F]/20">
                    <MapIcon className="h-4 w-4 text-white" />
                  </div>
                  {title}
                </h2>
              </div>
              {onClose && (
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-slate-400 hover:bg-slate-50" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <Input
                placeholder="Search location or business..."
                className="h-14 pl-11 pr-12 bg-slate-50 border-slate-100 rounded-2xl focus-visible:ring-[#00B14F]/10 focus-visible:border-[#00B14F] font-bold text-slate-900 transition-all"
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(true)}
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-slate-400" />
              )}

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-3 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2">
                  <div className="max-h-[320px] overflow-y-auto custom-sidebar-scrollbar">
                    <div className="py-2">
                      {suggestions.map((s, i) => (
                        <button key={i} className="w-full text-left px-5 py-4 hover:bg-slate-50 transition-colors flex items-start gap-4 border-b border-slate-50 last:border-0" onClick={() => handleSelectSuggestion(s)}>
                          <div className="p-2 bg-slate-100 rounded-full mt-0.5 shrink-0">
                             <MapPin className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-bold text-slate-900 truncate">{s.name}</p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{s.display_name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Discovery Panel - Changed from ScrollArea to div for better scrollbar control */}
          <div className="flex-1 bg-white overflow-y-auto custom-sidebar-scrollbar">
            <div className="p-6 space-y-8">
              
              {/* Selected Location Information */}
              <div className="space-y-6">
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2 mb-1">
                      <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-100">
                        Selected Point
                      </div>
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                     {customAddressName || "Select a location"}
                   </h3>
                   <div className="flex items-start gap-2 mt-2">
                      <MapPinned className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-sm font-bold text-slate-500 leading-relaxed italic">
                        {isGeocoding ? "Identifying location..." : addressDetails.sub || "Click on the map or search to pick a location"}
                      </p>
                   </div>
                </div>
              </div>

              {/* Geoapify Discovery & Nearby Section */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-50 rounded-lg">
                        <Building2 className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discovery & Businesses</Label>
                    </div>
                    {isDiscovering && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                 </div>

                 {discoveryResults.length > 0 ? (
                   <div className="space-y-3">
                      {discoveryResults.slice(0, 5).map((place, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => handleSelectDiscovery(place)}
                          className="w-full group text-left p-3 rounded-2xl border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm group-hover:bg-blue-50 transition-colors">
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-slate-900 truncate">{place.name}</p>
                                <span className="text-[8px] font-black text-blue-500 uppercase bg-blue-50 px-1.5 py-0.5 rounded-md">{place.category}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">{place.address}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                   </div>
                 ) : (
                   <div className="py-8 text-center bg-slate-50/50 rounded-[1.5rem] border border-dashed border-slate-200">
                      <p className="text-[11px] font-bold text-slate-400">Search for businesses or explore nearby</p>
                   </div>
                 )}
              </div>

              {/* Discovery Details Form */}
              <div className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 px-1">
                  <InfoIcon className="h-3.5 w-3.5 text-[#00B14F]" />
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalize Location</Label>
                </div>
                
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 ml-1">
                       <Building2 className="h-3 w-3 text-slate-400" />
                       <Label className="text-[11px] font-bold text-slate-500">Business / Building Name</Label>
                    </div>
                    <Input 
                      value={customAddressName} 
                      onChange={e => {setCustomAddressName(e.target.value); hasEditedRef.current = true;}}
                      placeholder="e.g. Starbucks, 5th Ave Entrance"
                      className="h-12 bg-slate-50 border-transparent font-black text-slate-900 rounded-2xl focus-visible:bg-white focus-visible:border-slate-200 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 ml-1">
                       <Info className="h-3 w-3 text-slate-400" />
                       <Label className="text-[11px] font-bold text-slate-500">Nearby Landmarks / Instructions</Label>
                    </div>
                    <Input 
                      value={landmarks} 
                      onChange={e => setLandmarks(e.target.value)}
                      placeholder="e.g. Beside the main lobby elevators"
                      className="h-12 bg-slate-50 border-transparent text-sm font-bold text-slate-700 rounded-2xl focus-visible:bg-white focus-visible:border-slate-200 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <div className="p-6 border-t border-slate-50 bg-white md:rounded-b-[2rem]">
            <Button
              onClick={handleConfirm}
              disabled={isGeocoding || !customAddressName}
              className="w-full h-16 rounded-[1.4rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              Confirm Selection
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="hidden md:flex absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-20 bg-white border border-slate-100 rounded-full items-center justify-center shadow-lg hover:bg-slate-50 transition-all z-[60]"
          >
            <div className={`w-1 h-8 rounded-full bg-slate-200 transition-all ${isExpanded ? 'bg-slate-300' : 'bg-slate-900'}`} />
          </button>
        </div>
      </div>

      {/* FLOATING ACTION BUTTONS */}
      <div className="absolute top-6 right-6 z-40 flex flex-col gap-3">
        {isStandalone && (
           <Button 
             onClick={handleConfirm}
             disabled={isGeocoding || !customAddressName}
             className="rounded-2xl h-14 px-6 bg-[#00B14F] text-white shadow-2xl hover:bg-[#009e46] border-none font-black text-xs uppercase tracking-widest transition-transform active:scale-95 flex items-center gap-2"
           >
             <Check className="h-5 w-5" />
             Confirm
           </Button>
        )}
        <Button 
          onClick={locateMe} 
          variant="outline" 
          size="icon" 
          className="rounded-2xl h-14 w-14 bg-white shadow-2xl hover:bg-slate-50 border-none text-slate-900 transition-transform active:scale-90"
        >
          <Target className="h-6 w-6" />
        </Button>
        {!isStandalone && onClose && (
          <div className="hidden md:flex flex-col gap-2 p-2 bg-white rounded-2xl shadow-2xl">
             <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-10 w-10 hover:bg-rose-50 hover:text-rose-500">
               <X className="h-5 w-5" />
             </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function MapPicker({ open, onOpenChange, onLocationSelect, initialLocation, title }: MapPickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90dvh] md:h-[min(900px,85vh)] p-0 overflow-hidden bg-white border-none rounded-[2rem] shadow-2xl [&>button:last-child]:hidden sm:rounded-[2rem]">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <MapPickerContent 
          title={title}
          initialLocation={initialLocation}
          onLocationSelect={onLocationSelect}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
