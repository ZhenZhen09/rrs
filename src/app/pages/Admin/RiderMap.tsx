import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { useRealTime } from '../../context/RealTimeContext';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { 
  Search, 
  RefreshCw, 
  ChevronRight,
  AlertCircle,
  Navigation2,
  Signal,
  MapPin
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const API_URL = '/api';

interface RiderLive {
  id: string;
  name: string;
  email: string;
  user_status: 'active' | 'inactive';
  is_online: boolean;
  last_seen: string | null;
  current_lat: number | null;
  current_lng: number | null;
  pickup_address: string | null;
}

function MapController({ center, zoom }: { center: [number, number] | null, zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), {
        duration: 1.5
      });
    }
  }, [center, zoom, map]);
  return null;
}

export function RiderMap() {
  const { socket } = useRealTime();
  const [riders, setRiders] = useState<RiderLive[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [selectedRider, setSelectedRider] = useState<RiderLive | null>(null);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

  const fetchRiders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/users/riders/live`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRiders(data);
        
        if (selectedRider) {
          const updated = data.find((r: RiderLive) => r.id === selectedRider.id);
          if (updated) setSelectedRider(updated);
        }
      }
    } catch (error) {
      console.error('Error fetching live riders:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedRider?.id]);

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
    socket.on('rider-location-updated', syncFleet);

    return () => {
      socket.off('connect', syncFleet);
      socket.off('rider-presence-changed', syncFleet);
      socket.off('rider-location-updated', syncFleet);
    };
  }, [socket, fetchRiders]);

  const filteredRiders = useMemo(() => {
    return riders.filter(r => {
      const name = r.name || '';
      const id = r.id || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           id.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filter === 'online') return matchesSearch && r.is_online;
      if (filter === 'offline') return matchesSearch && !r.is_online;
      return matchesSearch;
    });
  }, [riders, searchQuery, filter]);

  const activeCount = riders.filter(r => r.is_online).length;

  const createCustomIcon = (rider: RiderLive) => {
    const color = rider.is_online ? '#10b981' : '#94a3b8';
    const isSelected = selectedRider?.id === rider.id;
    
    return L.divIcon({
      className: 'custom-rider-icon',
      html: `
        <div style="position: relative; width: ${isSelected ? '40px' : '32px'}; height: ${isSelected ? '40px' : '32px'}; background: white; border-radius: 50%; border: 2px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); transition: all 0.3s ease;">
          <div style="width: ${isSelected ? '32px' : '24px'}; height: ${isSelected ? '32px' : '24px'}; background: #1e293b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: ${isSelected ? '12px' : '10px'};">
            ${(rider.name || 'R').substring(0, 1)}
          </div>
          <div style="position: absolute; bottom: -1px; right: -1px; width: ${isSelected ? '12px' : '10px'}; height: ${isSelected ? '12px' : '10px'}; background: ${rider.is_online ? '#10b981' : '#94a3b8'}; border: 1.5px solid white; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: isSelected ? [40, 40] : [32, 32],
      iconAnchor: isSelected ? [20, 20] : [16, 16]
    });
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar List */}
      <div className="w-[300px] border-r border-slate-100 flex flex-col z-10 bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="p-3 md:p-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
             <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">Rider Fleet</h2>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Location Overview</p>
             </div>
             <Badge variant="secondary" className="bg-slate-900 text-white font-black px-2 py-0 h-4 text-[8px]">
                {activeCount} ONLINE
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
             {(['all', 'online', 'offline'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {f}
                </button>
             ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10">
               <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
               <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest">Loading...</p>
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="text-center py-10"><p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest">No riders found</p></div>
          ) : (
            filteredRiders.map((rider) => (
              <button
                key={rider.id}
                onClick={() => setSelectedRider(rider)}
                className={`w-full p-2.5 rounded-xl border transition-all text-left flex items-start gap-3 ${selectedRider?.id === rider.id ? 'bg-blue-50 border-blue-100' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0 relative shadow-sm">
                  {(rider.name || 'R').substring(0, 1)}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${rider.is_online ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between gap-1">
                      <p className="font-black text-slate-900 truncate text-[10px] leading-tight">{rider.name}</p>
                      {!rider.is_online && <span className="text-[7px] font-bold text-slate-400 whitespace-nowrap uppercase">Disconnected</span>}
                   </div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{rider.is_online ? 'Currently Connected' : 'Last seen: ' + (rider.last_seen ? new Date(rider.last_seen).toLocaleTimeString() : 'N/A')}</p>
                </div>
                <ChevronRight size={10} className={`mt-1 transition-transform ${selectedRider?.id === rider.id ? 'translate-x-0.5 text-blue-400' : 'text-slate-300'}`} />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative bg-slate-100">
        <MapContainer 
          center={[14.5995, 120.9842]} 
          zoom={13} 
          className="h-full w-full z-0"
          zoomControl={false}
          ref={(map) => { if (map) mapRef.current = map; }}
        >
          <TileLayer 
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={40}
            spiderfyOnMaxZoom={false}
            showCoverageOnHover={false}
          >
            {riders.map((rider) => (
              rider.current_lat && rider.current_lng && (
                <Marker 
                  key={rider.id} 
                  position={[Number(rider.current_lat), Number(rider.current_lng)]}
                  icon={createCustomIcon(rider)}
                  eventHandlers={{ click: () => setSelectedRider(rider) }}
                >
                  <Popup className="rider-mini-popup">
                    <div className="p-1 min-w-[120px]">
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center font-black text-[10px]">{(rider.name || 'R').substring(0, 1)}</div>
                         <div>
                            <p className="font-black text-slate-900 text-[10px] leading-none">{rider.name}</p>
                            <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{rider.is_online ? 'Online' : 'Offline'}</p>
                         </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MarkerClusterGroup>
          {selectedRider?.current_lat && selectedRider?.current_lng && (
            <MapController center={[Number(selectedRider.current_lat), Number(selectedRider.current_lng)]} zoom={15} />
          )}
        </MapContainer>

        {/* Floating Controls */}
        <div className="absolute top-4 left-4 flex gap-2 z-[400]">
           <div className="bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm flex items-center gap-2 border border-slate-100">
              <div className="flex items-center gap-1.5 px-1.5 border-r border-slate-100">
                 <p className="text-[8px] font-black text-slate-900 uppercase">Live Tracking</p>
                 <button onClick={() => setAutoUpdate(!autoUpdate)} className={`w-6 h-3.5 rounded-full relative transition-colors ${autoUpdate ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all ${autoUpdate ? 'left-3' : 'left-0.5'}`} />
                 </button>
              </div>
              <Button variant="ghost" size="sm" className="h-6 rounded-md font-black text-[8px] uppercase px-2 hover:bg-slate-50" onClick={fetchRiders}>
                <RefreshCw size={10} className={`mr-1 ${loading ? 'animate-spin' : ''}`} /> Sync Fleet
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 rounded-md font-black text-[8px] uppercase px-2 hover:bg-slate-50 border-l border-slate-100"
                onClick={() => {
                   const first = riders.find(r => r.current_lat && r.current_lng);
                   if (first) setSelectedRider(first);
                }}
              >
                <Navigation2 size={10} className="mr-1" /> Center Map
              </Button>
           </div>
        </div>

        {/* Selected Rider Detail - Pure Geographic Card */}
        {selectedRider && (
           <div className="absolute bottom-6 right-6 w-[280px] z-[400] animate-in slide-in-from-bottom-5 duration-300">
              <Card className="rounded-[1.5rem] border-none shadow-2xl p-5 space-y-4 relative overflow-hidden bg-white">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-700 to-slate-900" />
                 
                 <button onClick={() => setSelectedRider(null)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 transition-colors">
                    <AlertCircle size={16} className="rotate-45" />
                 </button>

                 <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-lg shadow-slate-900/20">
                      {(selectedRider.name || 'R').substring(0, 1)}
                    </div>
                    <div>
                       <h3 className="text-xs font-black text-slate-900 leading-none">{selectedRider.name}</h3>
                       <div className="flex items-center gap-1.5 mt-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${selectedRider.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{selectedRider.is_online ? 'Device Online' : 'Device Offline'}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-start gap-2">
                       <div className="p-1.5 bg-blue-50 rounded-lg shrink-0"><MapPin size={12} className="text-blue-600" /></div>
                       <div className="min-w-0">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Last Known Location</p>
                          <p className="text-[9px] font-bold text-slate-700 leading-tight mt-0.5">{selectedRider.pickup_address || 'Calculating coordinate address...'}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="p-1.5 bg-slate-100 rounded-lg shrink-0"><Signal size={12} className="text-slate-600" /></div>
                       <div className="min-w-0">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Signal Status</p>
                          <p className="text-[9px] font-bold text-slate-700">{selectedRider.is_online ? 'High Precision GPS Active' : 'Signal Lost'}</p>
                       </div>
                    </div>
                 </div>

                 <Button className="w-full h-9 rounded-xl bg-slate-900 hover:bg-black font-black uppercase text-[8px] tracking-widest shadow-xl shadow-slate-900/10 transition-all active:scale-[0.98]">
                    View Detailed Logs
                 </Button>
              </Card>
           </div>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .rider-mini-popup .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 2px;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          border: none;
        }
        .rider-mini-popup .leaflet-popup-tip {
          background: white;
        }
        .custom-rider-icon {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
