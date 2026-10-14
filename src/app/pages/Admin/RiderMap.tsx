import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useRealTime } from '../../context/RealTimeContext';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { 
  Search, 
  MapPin, 
  Bike, 
  Navigation, 
  Battery, 
  BatteryLow, 
  BatteryMedium, 
  Wifi, 
  Power 
} from 'lucide-react';
import { cn } from '../../components/ui/utils';
import type { DeliveryStatus } from '../../types';
import { getDefaultRiderAvatarUrl } from '../../utils/riderAvatar';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = '/api';

interface RiderLive {
  id: string;
  name: string;
  email: string;
  avatar_id?: string | null;
  user_status: 'active' | 'inactive';
  is_online: boolean;
  last_seen: string | null;
  current_lat: number | null;
  current_lng: number | null;
  pickup_address: string | null;
  request_id: string | null;
  delivery_status: DeliveryStatus | null;
  time_window: string | null;
  is_on_duty: boolean;
  last_battery_level: number | null;
  last_signal_strength: string | null;
}

function MapController({ riderId, center, zoom }: { riderId: string | null, center: [number, number] | null, zoom?: number }) {
  const map = useMap();
  const lastCenteredRiderRef = useRef<string | null>(null);

  useEffect(() => {
    if (!riderId) {
      lastCenteredRiderRef.current = null;
      return;
    }

    // Center once when a rider is selected. Live location updates should move
    // the marker without repeatedly restarting a map animation.
    if (center && riderId !== lastCenteredRiderRef.current) {
      lastCenteredRiderRef.current = riderId;
      map.flyTo(center, zoom || map.getZoom(), {
        duration: 0.35
      });
    }
  }, [center, riderId, zoom, map]);
  return null;
}

export function RiderMap() {
  const { socket, riderPresence, riderLocations } = useRealTime();
  const [riders, setRiders] = useState<RiderLive[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline' | 'on-duty'>('all');
  const [selectedRider, setSelectedRider] = useState<RiderLive | null>(null);
  const [autoUpdate] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  const getRiderLocation = useCallback((rider: RiderLive) => {
    // Priority 1: Real-time socket location
    const live = riderLocations[rider.id];
    if (live) return { lat: live.lat, lng: live.lng };
    // Priority 2: Database fallback
    if (rider.current_lat && rider.current_lng) {
      return { lat: Number(rider.current_lat), lng: Number(rider.current_lng) };
    }
    return null;
  }, [riderLocations]);

  const isRiderOnline = useCallback((rider: RiderLive) => {
    // Priority 1: Real-time socket check
    const presence = riderPresence[rider.id];
    if (presence === 'online') return true;
    if (presence === 'offline') return false;

    // Priority 2: Database fallback
    return !!rider.is_online;
  }, [riderPresence]);

  const getRiderStatusLabel = useCallback((rider: RiderLive) => {
    const isOnline = isRiderOnline(rider);
    
    // NEW: Off-duty status takes precedence for labeling
    if (!rider.is_on_duty) return 'OFF DUTY';

    const live = riderLocations[rider.id];
    
    // Calculate data age based on socket or DB
    const lastUpdateTs = live?.timestamp 
      ? Number(live.timestamp)
      : (rider.last_seen ? new Date(rider.last_seen).getTime() : 0);
    
    const dataAgeSeconds = lastUpdateTs ? (nowMs - lastUpdateTs) / 1000 : 9999;

    if (!isOnline) return 'OFFLINE';
    if (dataAgeSeconds > 130) return 'SIGNAL LOST';
    if (dataAgeSeconds > 65) return 'DELAYED';
    return 'LIVE';
  }, [isRiderOnline, riderLocations, nowMs]);

  const fetchRiders = useCallback(() => {
    return fetch(`${API_URL}/users/riders/live`, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) return;
        const data: RiderLive[] = await response.json();
        setRiders(data);
        setSelectedRider(current => current ? data.find(r => r.id === current.id) || current : current);
      })
      .catch(error => console.error('Error fetching live riders:', error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchRiders();
    const interval = setInterval(() => {
      if (autoUpdate) fetchRiders();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoUpdate, fetchRiders]);

  useEffect(() => {
    if (!socket) return;

    const syncFleet = () => {
      fetchRiders();
    };

    socket.on('connect', syncFleet);
    socket.on('rider-presence-changed', syncFleet);
    socket.on('rider-status-updated', syncFleet);

    return () => {
      socket.off('connect', syncFleet);
      socket.off('rider-presence-changed', syncFleet);
      socket.off('rider-status-updated', syncFleet);
    };
  }, [socket, fetchRiders]);

  const filteredRiders = useMemo(() => {
    return riders.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           r.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const online = isRiderOnline(r);
      
      if (filter === 'on-duty') return matchesSearch && r.is_on_duty;
      if (filter === 'online') return matchesSearch && online;
      if (filter === 'offline') return matchesSearch && !online;
      return matchesSearch;
    });
  }, [riders, searchQuery, filter, isRiderOnline]);

  const activeCount = riders.filter(r => r.is_on_duty).length;

  const createCustomIcon = useCallback((rider: RiderLive) => {
    const status = getRiderStatusLabel(rider);
    const hasUnfinishedTasks = !!rider.request_id;
    const isOverdueOffDuty = !rider.is_on_duty && hasUnfinishedTasks;
    
    let color = status === 'LIVE' ? '#10b981' : (status === 'OFFLINE' ? '#94a3b8' : '#f59e0b');
    if (isOverdueOffDuty) color = '#ef4444'; // Red for overdue log-off

    const isSelected = selectedRider?.id === rider.id;
    const avatarUrl = getDefaultRiderAvatarUrl(rider.avatar_id || rider.id);
    const icon = L.divIcon({
      className: 'custom-rider-icon',
      html: `
        <div style="position: relative; width: ${isSelected ? '40px' : '32px'}; height: ${isSelected ? '40px' : '32px'}; background: white; border-radius: 50%; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); ${isOverdueOffDuty ? 'opacity: 0.5;' : ''}">
          <img src="${avatarUrl}" alt="" aria-hidden="true" style="width: ${isSelected ? '32px' : '24px'}; height: ${isSelected ? '32px' : '24px'}; border-radius: 50%; object-fit: cover;" />
          <div style="position: absolute; bottom: -1px; right: -1px; width: ${isSelected ? '12px' : '10px'}; height: ${isSelected ? '12px' : '10px'}; background: ${color}; border: 1.5px solid white; border-radius: 50%;"></div>
          ${isOverdueOffDuty ? '<div class="absolute inset-0 rounded-full animate-red-pulse -z-10" style="background: rgba(239, 68, 68, 0.4);"></div>' : ''}
        </div>
      `,
      iconSize: isSelected ? [40, 40] : [32, 32],
      iconAnchor: isSelected ? [20, 20] : [16, 16]
    });
    return icon;
  }, [getRiderStatusLabel, selectedRider?.id]);

  const renderSelectedRiderActions = (compact = false) => (
    <div className={cn("grid grid-cols-2 gap-2", compact && "w-[150px] shrink-0 gap-1.5")}>
      <Button
        size="sm"
        className={cn(
          "rounded-xl bg-slate-900 text-white hover:bg-black font-black uppercase tracking-widest shadow-md active:scale-95 transition-all",
          compact ? "h-8 px-1 text-[7px] tracking-tight" : "h-9 text-[9px]"
        )}
        onClick={() => {
          if (!selectedRider) return;
          const loc = getRiderLocation(selectedRider);
          if (loc && mapRef.current) {
            mapRef.current.flyTo([loc.lat, loc.lng], 16);
          }
        }}
      >
        Focus Map
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={cn(
          "rounded-xl border-slate-200 text-slate-900 hover:bg-slate-50 font-black uppercase tracking-widest active:scale-95 transition-all",
          compact ? "h-8 px-1 text-[7px] tracking-tight" : "h-9 text-[9px]"
        )}
        onClick={() => setSelectedRider(null)}
      >
        Dismiss
      </Button>
    </div>
  );

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row bg-white overflow-hidden">
      {/* Sidebar List */}
      <div className="w-full h-[48%] min-h-0 md:h-full md:w-[300px] shrink-0 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col z-10 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-2 md:p-4 space-y-2 md:space-y-3 shrink-0">
          <div className="flex items-center justify-between">
             <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Rider Fleet</h2>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Location Overview</p>
             </div>
             <Badge variant="secondary" className="bg-slate-900 text-white font-black px-2 py-0 h-4 text-[8px]">
                {activeCount} ON DUTY
             </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <Input 
              placeholder="Search riders..." 
              className="pl-8 h-7 bg-slate-50 border-none rounded-md text-[10px] focus-visible:ring-primary/20 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 bg-slate-50 rounded-md">
             {(['on-duty', 'online', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "flex-1 py-1 text-[8px] font-black uppercase tracking-widest rounded transition-all",
                    filter === f 
                      ? f === 'on-duty' ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {f === 'on-duty' ? 'On Duty' : f}
                </button>
             ))}
          </div>
        </div>

        <div className={cn(
          "min-h-0 flex-1 overflow-y-auto px-2 md:px-4 space-y-1.5 md:space-y-2 pb-2 md:pb-4 custom-scrollbar overscroll-contain",
          selectedRider && "min-h-[96px] md:min-h-0"
        )}>
          {loading ? (
             <div className="flex flex-col gap-2">
                {[1,2,3,4].map(i => <div key={i} className="h-12 bg-slate-50 rounded-xl animate-pulse" />)}
             </div>
          ) : filteredRiders.length === 0 ? (
             <div className="py-12 text-center">
                <Bike className="h-8 w-8 text-slate-100 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-300">No riders found</p>
             </div>
          ) : (
            filteredRiders.map((rider) => {
              const status = getRiderStatusLabel(rider);
              const isSelected = selectedRider?.id === rider.id;
              const hasUnfinishedTasks = !!rider.request_id;
              const isOverdueOffDuty = !rider.is_on_duty && hasUnfinishedTasks;
              
              return (
                <button
                  key={rider.id}
                  onClick={() => setSelectedRider(rider)}
                  className={cn(
                    "w-full p-2 md:p-2.5 rounded-xl border-2 transition-all text-left flex items-start gap-2 md:gap-3 relative overflow-hidden",
                    isSelected 
                      ? "border-slate-900 bg-slate-900 shadow-lg shadow-slate-900/10" 
                      : isOverdueOffDuty
                      ? "border-rose-100 bg-rose-50/20 hover:border-rose-200"
                      : "border-slate-50 hover:border-slate-200 bg-white"
                  )}
                >
                  {isOverdueOffDuty && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="bg-rose-500 text-white text-[6px] font-black px-1 rounded-bl-md uppercase tracking-tighter">Overdue</div>
                    </div>
                  )}
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 relative",
                    isSelected ? "bg-white text-slate-900" : isOverdueOffDuty ? "bg-rose-500 text-white" : "bg-slate-900 text-white shadow-sm",
                    isOverdueOffDuty && "opacity-60"
                  )}>
                    {rider.name.substring(0, 1)}
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-white",
                      isOverdueOffDuty ? "bg-rose-500" :
                      status === 'LIVE' ? "bg-emerald-500" :
                      status === 'OFFLINE' ? "bg-slate-400" : "bg-amber-500"
                    )} />
                  </div>
                  <div className={cn("flex-1 min-w-0", isOverdueOffDuty && "opacity-70")}>
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn(
                        "font-black truncate text-[10px] leading-tight",
                        isSelected ? "text-white" : "text-slate-900"
                      )}>{rider.name}</p>
                      <Badge variant="outline" className={cn(
                        "text-[7px] font-black px-1 py-0 border-none shrink-0",
                        status === 'LIVE' ? "bg-emerald-50 text-emerald-600" :
                        status === 'OFFLINE' ? (isSelected ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500") :
                        "bg-amber-50 text-amber-600 animate-pulse"
                      )}>
                        {status}
                      </Badge>
                    </div>

                    {rider.request_id && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            "text-[7px] font-black uppercase tracking-tighter px-1 rounded",
                            isSelected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                             #{rider.request_id.slice(-6).toUpperCase()}
                          </span>
                          <span className={cn(
                            "text-[8px] font-bold truncate",
                            isSelected ? "text-slate-300" : "text-slate-500"
                          )}>
                             {rider.delivery_status || 'Assigned'}
                          </span>
                        </div>
                        <p className={cn(
                          "text-[8px] font-medium truncate",
                          isSelected ? "text-slate-400" : "text-slate-400"
                        )}>
                          {rider.pickup_address || 'Fetching pickup location...'}
                        </p>
                      </div>
                    )}
                    <p className={cn(
                      "text-[9px] font-bold truncate mt-0.5",
                      isSelected ? "text-slate-400" : "text-slate-500"
                    )}>
                      {rider.last_seen ? `Seen ${new Date(rider.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Never seen'}
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-50/10">
                      <div className="flex items-center gap-1">
                        {(() => {
                          const level = rider.last_battery_level ?? 0;
                          const color = level < 20 ? "text-rose-500" : isSelected ? "text-slate-400" : "text-slate-500";
                          if (level === 0) return <Battery size={10} className="text-slate-300" />;
                          if (level < 20) return <BatteryLow size={10} className={color} />;
                          return <BatteryMedium size={10} className={color} />;
                        })()}
                        <span className={cn(
                          "text-[8px] font-black tracking-tighter",
                          (rider.last_battery_level ?? 0) < 20 ? "text-rose-500" : isSelected ? "text-slate-400" : "text-slate-500"
                        )}>
                          {rider.last_battery_level ? `${rider.last_battery_level}%` : '--'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Wifi size={10} className={isSelected ? "text-slate-400" : "text-slate-500"} />
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-tighter",
                          isSelected ? "text-slate-400" : "text-slate-500"
                        )}>
                          {rider.last_signal_strength || 'Unknown'}
                        </span>
                      </div>
                      
                      {rider.is_on_duty ? (
                         <div className="flex items-center gap-1 bg-emerald-500/10 px-1 rounded">
                            <Power size={8} className="text-emerald-500" />
                            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter">On Duty</span>
                         </div>
                      ) : (
                         <div className="flex items-center gap-1 bg-slate-500/10 px-1 rounded">
                            <Power size={8} className="text-slate-500" />
                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Off Duty</span>
                         </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {selectedRider && (
        <div className="relative z-20 min-h-0 max-h-[60%] shrink-0 overflow-y-auto overscroll-contain p-2 md:p-4 border-t border-slate-100 bg-white animate-in slide-in-from-bottom-4 duration-300 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:max-h-none md:overflow-visible md:pb-4">
             <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-4">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-slate-900 flex items-center justify-center text-white shrink-0 shadow-lg shadow-slate-900/20">
                   <Navigation size={16} className="md:h-[18px] md:w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                   <h3 className="text-xs font-black text-slate-900 truncate uppercase tracking-tight">{selectedRider.name}</h3>
                   <p className="text-[9px] font-bold text-slate-500 truncate">{selectedRider.email}</p>
                   <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                         <MapPin size={8} className="text-slate-400" />
                         <span className="text-[7px] font-black text-slate-600 tabular-nums">
                            {selectedRider.current_lat?.toString().slice(0, 9)}, {selectedRider.current_lng?.toString().slice(0, 9)}
                         </span>
                      </div>
                   </div>
                </div>
             </div>

             {selectedRider.request_id ? (
                 <div className="mb-2 md:mb-4 space-y-1 md:space-y-2">
                   <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Transaction</p>
                      <Badge className="bg-primary/10 text-primary border-none font-black text-[7px] h-4">
                         #{selectedRider.request_id.slice(-8).toUpperCase()}
                      </Badge>
                   </div>
                    <div className="bg-slate-50 rounded-xl p-2 border border-slate-100 space-y-1.5 md:p-2.5 md:space-y-2">
                      <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                         <p className="text-[9px] font-black text-slate-900 uppercase">
                            {selectedRider.delivery_status || 'Assigned'}
                         </p>
                      </div>
                      <div className="space-y-1.5 ml-3.5">
                         <div className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-slate-300 mt-1" />
                            <p className="text-[8px] font-bold text-slate-500 leading-tight">
                               <span className="text-slate-900 font-black">PICKUP:</span> {selectedRider.pickup_address || 'Loading...'}
                            </p>
                         </div>
                         <div className="flex items-start gap-2">
                            <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1" />
                            <p className="text-[8px] font-bold text-slate-500 leading-tight">
                               <span className="text-slate-900 font-black">DELIVER TO:</span> {selectedRider.time_window || 'Schedule Pending'}
                            </p>
                         </div>
                      </div>
                   </div>
                </div>
             ) : (
                 <div className="mb-2 md:mb-4 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-2 py-1.5 md:py-2">
                   <p className="min-w-0 flex-1 text-center text-[9px] font-black uppercase tracking-tighter italic text-slate-400">No Active Job Assigned</p>
                   {renderSelectedRiderActions(true)}
                </div>
             )}

             {selectedRider.request_id && (
               <div className="sticky bottom-0 z-10 bg-white pt-2 md:static md:bg-transparent md:pt-0">
                 {renderSelectedRiderActions()}
               </div>
             )}
          </div>
        )}
      </div>

      {/* Main Map View */}
      <div className="flex-1 min-h-0 min-w-0 relative">
        <MapContainer
          center={[14.5995, 120.9842]}
          zoom={12}
          className="h-full w-full"
          zoomControl={false}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            referrerPolicy="strict-origin-when-cross-origin"
          />
          
          <MarkerClusterGroup
            chunkedLoading
            polygonOptions={{
              fillColor: '#ffffff',
              color: '#334155',
              weight: 1,
              opacity: 1,
              fillOpacity: 0.1,
            }}
          >
            {riders.map((rider) => {
              const loc = getRiderLocation(rider);
              if (!loc) return null;

              return (
                <Marker
                  key={rider.id}
                  position={[loc.lat, loc.lng]}
                  icon={createCustomIcon(rider)}
                  eventHandlers={{
                    click: () => setSelectedRider(rider),
                  }}
                >
                  <Popup className="rider-mini-popup" closeButton={false}>
                    <div className="p-2 min-w-[120px]">
                      <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{rider.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-1 mb-2 truncate">{rider.email}</p>
                      
                      <div className="flex items-center justify-between border-t border-slate-50 pt-2">
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isRiderOnline(rider) ? "bg-emerald-500" : "bg-slate-400"
                          )} />
                          <span className="text-[8px] font-black text-slate-600 uppercase tracking-tight">
                            {getRiderStatusLabel(rider)}
                          </span>
                        </div>
                        <span className="text-[7px] font-black text-slate-400 tabular-nums">
                           {rider.last_seen ? new Date(rider.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>

          <MapController
            riderId={selectedRider?.id || null}
            center={selectedRider ? [getRiderLocation(selectedRider)?.lat || 0, getRiderLocation(selectedRider)?.lng || 0] : null}
          />
        </MapContainer>

        {/* Legend Overlay */}
        <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 md:bottom-6 md:left-6 z-[1000] space-y-2">
           <Card className="bg-white/90 backdrop-blur-md border-slate-100 p-3 rounded-2xl shadow-2xl">
              <div className="space-y-2">
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Live / Active</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Stale Data (&gt;2m)</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white shadow-sm" />
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Offline</span>
                 </div>
              </div>
           </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .rider-mini-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        }
        .rider-mini-popup .leaflet-popup-content {
          margin: 8px 12px;
        }
        .rider-mini-popup .leaflet-popup-tip-container {
          display: none;
        }
        .rider-mini-popup .leaflet-popup-tip {
          background: white;
        }
        .custom-rider-icon {
          background: transparent;
          border: none;
        }
        @keyframes red-pulse {
          0% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.2; }
          100% { transform: scale(1.1); opacity: 0.4; }
        }
        .animate-red-pulse {
          animation: red-pulse 2s infinite ease-in-out;
        }
      `}} />
    </div>
  );
}
