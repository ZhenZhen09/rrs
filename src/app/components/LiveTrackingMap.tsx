import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
  ZoomControl,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState, useRef } from "react";
import {
  MapPin,
  MapPinned,
  Clock,
  Activity,
  Search,
  X,
  Loader2,
  WifiOff,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import carTopViewIconUrl from "../assets/car-top-view-marker.svg";
import { cn } from "./ui/utils";

export type TrackingStatus = 'OFFLINE' | 'SIGNAL_LOST' | 'DELAYED' | 'LIVE';

const calculateBearing = (
  from: [number, number],
  to: [number, number],
) => {
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;

  const startLat = (fromLat * Math.PI) / 180;
  const startLng = (fromLng * Math.PI) / 180;
  const endLat = (toLat * Math.PI) / 180;
  const endLng = (toLng * Math.PI) / 180;

  const y = Math.sin(endLng - startLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLng - startLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const toMeters = (latDiff: number, lngDiff: number, atLat: number) => {
  const metersPerLat = 111320;
  const metersPerLng = 111320 * Math.cos((atLat * Math.PI) / 180);
  return {
    x: lngDiff * metersPerLng,
    y: latDiff * metersPerLat,
  };
};

const nearestPointOnSegment = (
  point: [number, number],
  start: [number, number],
  end: [number, number],
) => {
  const atLat = point[0];
  const startOffset = toMeters(start[0] - point[0], start[1] - point[1], atLat);
  const endOffset = toMeters(end[0] - point[0], end[1] - point[1], atLat);
  const vx = endOffset.x - startOffset.x;
  const vy = endOffset.y - startOffset.y;
  const lengthSquared = vx * vx + vy * vy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, (-(startOffset.x * vx + startOffset.y * vy)) / lengthSquared));

  return {
    point: [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
    ] as [number, number],
    distance: Math.sqrt(
      Math.pow(startOffset.x + vx * t, 2) +
      Math.pow(startOffset.y + vy * t, 2),
    ),
  };
};

const snapToRoute = (
  point: [number, number] | null,
  route: [number, number][],
  maxDistanceMeters = 80,
) => {
  if (!point || route.length < 2) return point;

  let nearest = point;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.length - 1; i += 1) {
    const candidate = nearestPointOnSegment(point, route[i], route[i + 1]);
    if (candidate.distance < nearestDistance) {
      nearest = candidate.point;
      nearestDistance = candidate.distance;
    }
  }

  return nearestDistance <= maxDistanceMeters ? nearest : point;
};

const routeBearingAtPoint = (
  point: [number, number] | null,
  route: [number, number][],
  maxDistanceMeters = 80,
) => {
  if (!point || route.length < 2) return null;

  let nearestBearing: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < route.length - 1; i += 1) {
    const segmentStart = route[i];
    const segmentEnd = route[i + 1];
    const candidate = nearestPointOnSegment(point, segmentStart, segmentEnd);

    if (candidate.distance < nearestDistance) {
      nearestDistance = candidate.distance;
      nearestBearing = calculateBearing(segmentStart, segmentEnd);
    }
  }

  return nearestDistance <= maxDistanceMeters ? nearestBearing : null;
};

// Custom icons using Leaflet's divIcon with raw HTML strings for reliability
const createRiderIcon = (rotation = 0, isOffline = false, status: TrackingStatus = 'LIVE') => {
  return L.divIcon({
    html: `
      <div class="relative car-marker-shell ${isOffline ? 'grayscale opacity-60' : ''}" style="width: 64px; height: 64px;">
        <div class="car-marker-body" style="transform: rotate(${rotation}deg);">
          <img
            src="${carTopViewIconUrl}"
            alt=""
            style="width: 64px; height: 64px; object-fit: contain; filter: drop-shadow(0 10px 12px rgba(15,23,42,0.32));"
          />
          ${status === 'LIVE' ? '<div class="absolute inset-0 bg-blue-500 rounded-full recovery-pulse -z-10"></div>' : ''}
        </div>
        ${!isOffline ? '<div class="absolute inset-0 bg-blue-400 rounded-full animate-ping-custom opacity-20 -z-10"></div>' : ''}
      </div>
    `,
    className: "custom-map-icon smooth-marker-move",
    iconSize: [64, 64],
    iconAnchor: [32, 32],
  });
};

const createStaticIcon = (type: "pickup" | "dropoff" | "search") => {
  const color =
    type === "pickup" ? "#10b981" : type === "dropoff" ? "#ef4444" : "#6366f1";
  const iconPath =
    type === "pickup"
      ? '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'
      : type === "dropoff"
        ? '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><path d="M12 13V7l-2 2"/>'
        : '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>';

  return L.divIcon({
    html: `
      <div style="color: ${color};">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${iconPath}
        </svg>
      </div>
    `,
    className: "custom-map-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

const pickupIcon = createStaticIcon("pickup");
const dropoffIcon = createStaticIcon("dropoff");
const searchIcon = createStaticIcon("search");

interface LiveTrackingMapProps {
  requestId?: string;
  pickup: { lat: number; lng: number; address: string };
  dropoff: { lat: number; lng: number; address: string };
  current: { lat: number; lng: number } | null;
  history?: { lat: number; lng: number; timestamp?: string }[];
  riderName?: string;
  status?: string;
  timeWindow?: string;
  remark?: string;
  hideSearch?: boolean;
  containerClassName?: string;
  trackingStatus?: TrackingStatus;
  lastUpdateTs?: number;
}

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

function ChangeView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), {
      animate: true,
      duration: 1.5,
    });
  }, [center, map, zoom]);
  return null;
}

function FollowModeController({
  center,
  followMode,
  onUserInteraction,
}: {
  center: [number, number] | null;
  followMode: boolean;
  onUserInteraction: () => void;
}) {
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
    if (!center || !followMode) return;

    isProgrammaticMove.current = true;
    map.panTo(center, {
      animate: true,
      duration: 0.7,
      easeLinearity: 0.35,
      noMoveStart: true,
    });

    const timeout = window.setTimeout(() => {
      isProgrammaticMove.current = false;
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [center, followMode, map]);

  return null;
}

export function LiveTrackingMap({
  requestId,
  pickup,
  dropoff,
  current,
  history,
  riderName,
  status,
  timeWindow,
  remark,
  hideSearch = false,
  containerClassName = "h-[600px]",
  trackingStatus = 'LIVE',
  lastUpdateTs = 0,
}: LiveTrackingMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [historyCoords, setHistoryCoords] = useState<[number, number][]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [followMode, setFollowMode] = useState(true);

  // Smooth position state to prevent jumping
  const [smoothPos, setSmoothPos] = useState<[number, number] | null>(null);
  const [headingAngle, setHeadingAngle] = useState(0);

  // Target states for animation loop
  const targetPosRef = useRef<[number, number] | null>(null);
  const targetHeadingRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const velocityRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const posHistoryRef = useRef<[number, number][]>([]);

  // Animation Loop: Enterprise Frame-Based Movement
  useEffect(() => {
    const animate = (time: number) => {
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdateRef.current;

      setSmoothPos((prev) => {
        if (!prev) return targetPosRef.current;

        const [currLat, currLng] = prev;
        
        // DEAD RECKONING: If data is stale (> 2s), continue moving with last known velocity
        if (timeSinceUpdate > 2000 && timeSinceUpdate < 15000 && (velocityRef.current.lat !== 0 || velocityRef.current.lng !== 0)) {
          const friction = Math.max(0, 1 - (timeSinceUpdate - 2000) / 13000);
          const nextLat = currLat + velocityRef.current.lat * friction;
          const nextLng = currLng + velocityRef.current.lng * friction;
          return [nextLat, nextLng];
        }

        if (!targetPosRef.current) return prev;
        const [targetLat, targetLng] = targetPosRef.current;

        // INTERPOLATION: Move 5% towards target per frame
        const nextLat = currLat + (targetLat - currLat) * 0.05;
        const nextLng = currLng + (targetLng - currLng) * 0.05;

        const latDone = Math.abs(nextLat - targetLat) < 0.0000001;
        const lngDone = Math.abs(nextLng - targetLng) < 0.0000001;

        if (latDone && lngDone) return targetPosRef.current;
        return [nextLat, nextLng];
      });

      setHeadingAngle((prev) => {
        const target = targetHeadingRef.current;
        const delta = ((target - prev + 540) % 360) - 180;
        
        // TURN ANTICIPATION: Slightly faster rotation when the delta is large (preparing for turn)
        const rotationSpeed = Math.abs(delta) > 45 ? 0.15 : 0.1;
        const next = prev + delta * rotationSpeed;
        
        if (Math.abs(delta) < 0.1) return target;
        return (next + 360) % 360;
      });

      // SMART ZOOM: Adjust zoom based on velocity (speed)
      if (followMode && mapRef.current) {
        const speed = Math.sqrt(Math.pow(velocityRef.current.lat, 2) + Math.pow(velocityRef.current.lng, 2)) * 1000000;
        const currentZoom = mapRef.current.getZoom();
        
        // Target Zoom: Fast speed -> Zoom 14-15, Slow speed -> Zoom 16-17
        const targetZoom = speed > 50 ? 14 : speed > 20 ? 15 : 16;
        
        if (Math.abs(currentZoom - targetZoom) > 0.5) {
          // mapRef.current.setZoom(targetZoom, { animate: true });
          // Note: Frequent setZoom can be jarring, better to just log or use a smoother mechanism if Leaflet allowed fractional zoom easing easily
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [followMode]);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchPos, setSearchPos] = useState<[number, number] | null>(null);
  const [searchLabel, setSearchLabel] = useState("");

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPositionRef = useRef<[number, number] | null>(null);
  const latestHistoryPoint =
    historyCoords.length > 0 ? historyCoords[historyCoords.length - 1] : null;
  const effectiveCurrent = current
    ? ([Number(current.lat), Number(current.lng)] as [number, number])
    : latestHistoryPoint;
  const activeRouteCoords = routeCoords.length > 0 ? routeCoords : [];
  const snappedCurrent = snapToRoute(effectiveCurrent, activeRouteCoords);
  const fallbackRouteCoords: [number, number][] = effectiveCurrent
    ? (status === "assigned"
        ? [
            effectiveCurrent,
            [Number(pickup.lat), Number(pickup.lng)],
            [Number(dropoff.lat), Number(dropoff.lng)],
          ]
        : [
            effectiveCurrent,
            [Number(dropoff.lat), Number(dropoff.lng)],
          ])
    : [
        [Number(pickup.lat), Number(pickup.lng)],
        [Number(dropoff.lat), Number(dropoff.lng)],
      ];

  // Effect to handle incoming GPS data
  useEffect(() => {
    if (current) {
      const newLat = Number(current.lat);
      const newLng = Number(current.lng);

      if (isNaN(newLat) || isNaN(newLng)) return;

      const now = Date.now();
      const nextPosition: [number, number] = [newLat, newLng];
      
      // Calculate Velocity for Dead Reckoning (lat/lng per ms)
      if (targetPosRef.current) {
        const timeDelta = now - lastUpdateRef.current;
        if (timeDelta > 0) {
          const latVel = (newLat - targetPosRef.current[0]) / timeDelta;
          const lngVel = (newLng - targetPosRef.current[1]) / timeDelta;
          
          // Noise Filter: Only update velocity if it's within realistic bounds (prevent teleportation jitter)
          if (Math.abs(latVel) < 0.00001 && Math.abs(lngVel) < 0.00001) {
            velocityRef.current = { lat: latVel, lng: lngVel };
          }
        }
      }

      targetPosRef.current = nextPosition;
      lastUpdateRef.current = now;

      if (!smoothPos) {
        setSmoothPos(nextPosition);
      }

      // Calculate bearing from previous raw point to new raw point
      if (previousPositionRef.current) {
        const prev = previousPositionRef.current;
        const latDiff = Math.abs(prev[0] - nextPosition[0]);
        const lngDiff = Math.abs(prev[1] - nextPosition[1]);

        // Only update heading if movement is significant enough to determine direction
        if (latDiff > 0.00001 || lngDiff > 0.00001) {
          targetHeadingRef.current = calculateBearing(prev, nextPosition);
        }
      }

      previousPositionRef.current = nextPosition;
      setLastUpdate(new Date());
    }
  }, [current, smoothPos]);

  const displayCurrent = smoothPos
    ? snapToRoute(smoothPos, activeRouteCoords)
    : snappedCurrent;
  
  // Dynamic Bearing: If snapped to route, use route's heading, otherwise use movement heading
  const displayHeading =
    routeBearingAtPoint(displayCurrent, activeRouteCoords) ?? headingAngle;

  const center: [number, number] = displayCurrent || [Number(pickup.lat), Number(pickup.lng)];

  // Fetch actual road route from OSRM
  useEffect(() => {
    if (routeFetchTimeoutRef.current) {
      clearTimeout(routeFetchTimeoutRef.current);
    }

    routeFetchTimeoutRef.current = setTimeout(async () => {
      try {
        const points = effectiveCurrent
          ? (status === "assigned"
              ? `${effectiveCurrent[1]},${effectiveCurrent[0]};${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}`
              : `${effectiveCurrent[1]},${effectiveCurrent[0]};${dropoff.lng},${dropoff.lat}`)
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
    }, 750);

    return () => {
      if (routeFetchTimeoutRef.current) {
        clearTimeout(routeFetchTimeoutRef.current);
      }
    };
  }, [pickup, effectiveCurrent, dropoff, status]);

  // Fetch Location History (Breadcrumbs)
  useEffect(() => {
    if (history) {
      setHistoryCoords(
        history.map((log) => [Number(log.lat), Number(log.lng)] as [number, number]),
      );
      return;
    }

    if (requestId) {
      const fetchHistory = async () => {
        try {
          const res = await fetch(`/api/requests/${requestId}/history`);
          if (res.ok) {
            const data = await res.json();
            const coords = data.map(
              (log: any) =>
                [Number(log.lat), Number(log.lng)] as [number, number],
            );
            setHistoryCoords(coords);
          }
        } catch (err) {
          console.error("History fetch error:", err);
        }
      };
      fetchHistory();
      const interval = setInterval(fetchHistory, 5000);
      return () => clearInterval(interval);
    }
  }, [requestId, history]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const GEOAPIFY_KEY = "e981beca841349698124675a91674f3a";
      const res = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&filter=countrycode:ph&limit=5&apiKey=${GEOAPIFY_KEY}`,
      );
      const data = await res.json();

      if (data.features) {
        const results = data.features.map((f: any) => ({
          place_id: f.properties.place_id,
          lat: f.properties.lat,
          lon: f.properties.lon,
          display_name: f.properties.formatted,
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
    setSearchLabel(s.display_name.split(",")[0]);
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
    <div
      className={`w-full rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-slate-100 relative group ${containerClassName}`}
    >
      {/* GLOBAL CSS FOR SMOOTH MARKERS AND ANIMATIONS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .smooth-marker-move {
          /* Transition managed by requestAnimationFrame */
          transition: none !important;
        }
        @keyframes ping-custom {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-ping-custom {
          animation: ping-custom 1s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .recovery-pulse {
          animation: sonar-ripple 1.5s ease-out forwards;
        }
        .car-marker-shell {
          animation: car-road-glide 1.4s ease-in-out infinite;
          transition: filter 0.5s ease, opacity 0.5s ease;
        }
        .car-marker-body {
          transition: transform 0.45s ease;
          transform-origin: 50% 50%;
        }
        @keyframes car-road-glide {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-1px) scale(1.025);
          }
        }
        @keyframes sonar-ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        .ripple-effect::after {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background: inherit;
          border-radius: inherit;
          animation: sonar-ripple 2s ease-out infinite;
          z-index: -1;
        }
        .fab-glow {
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.3);
        }
        .fab-glow:hover {
          box-shadow: 0 0 30px rgba(236, 72, 153, 0.5);
        }
        `,
        }}
      />

      {/* Enterprise Connectivity Banner */}
      {(trackingStatus === 'OFFLINE' || trackingStatus === 'SIGNAL_LOST') && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[9999] w-auto max-w-[90%]">
          <div className={cn(
            "bg-white/90 backdrop-blur shadow-2xl border px-6 py-3 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500",
            trackingStatus === 'SIGNAL_LOST' ? "border-amber-100" : "border-rose-100"
          )}>
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors",
              trackingStatus === 'SIGNAL_LOST' ? "bg-amber-500 shadow-amber-500/20" : "bg-rose-500 shadow-rose-500/20"
            )}>
              <WifiOff size={20} className="text-white animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-slate-900 tracking-tight leading-none uppercase">
                {trackingStatus === 'SIGNAL_LOST' ? "Signal Strength Critical" : "Connection Interrupted"}
              </p>
              <p className={cn(
                "text-[10px] font-bold mt-1 uppercase tracking-widest leading-none",
                trackingStatus === 'SIGNAL_LOST' ? "text-amber-600" : "text-rose-500"
              )}>
                {trackingStatus === 'SIGNAL_LOST' ? `Signal lost for ${riderName || "Rider"}` : `Rider ${riderName || "Assigned"} is offline`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Driver Locator Button */}
      <div className="absolute bottom-8 right-8 z-[1000] flex flex-col items-end gap-3">
        <div className="group relative">
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap shadow-xl">
            {followMode ? "Following Driver" : "Recenter Driver"}
          </div>
          <div className="mb-2 rounded-full bg-white/95 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-lg border border-slate-100 text-right ml-auto">
            Follow {followMode ? "On" : "Off"}
          </div>
          <Button
            onClick={() => {
              if (displayCurrent) {
                setFollowMode(true);
                mapRef.current?.panTo(displayCurrent as [number, number], {
                  animate: true,
                  duration: 0.8,
                });
              }
            }}
            className={`w-14 h-14 rounded-full text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-90 ripple-effect fab-glow flex items-center justify-center border-none p-0 overflow-visible ${
              followMode
                ? "bg-gradient-to-br from-emerald-500 to-blue-600"
                : "bg-gradient-to-br from-slate-700 to-slate-950"
            }`}
            aria-label={followMode ? "Following driver location" : "Recenter driver location"}
          >
            <img
              src={carTopViewIconUrl}
              alt=""
              className="h-9 w-9 object-contain drop-shadow-md"
            />
          </Button>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={15}
        ref={mapRef}
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

        <FollowModeController
          center={displayCurrent}
          followMode={followMode}
          onUserInteraction={() => setFollowMode(false)}
        />

        {routeCoords.length > 0 ? (
          <Polyline
            positions={routeCoords}
            color="#3b82f6"
            weight={8}
            opacity={0.65}
          />
        ) : (
          <Polyline
            positions={fallbackRouteCoords}
            color="#3b82f6"
            weight={6}
            opacity={0.95}
          />
        )}

        {historyCoords.length > 1 && (
          <Polyline
            positions={historyCoords}
            color="#3b82f6"
            weight={4}
            opacity={0.9}
            dashArray="1, 8"
            lineJoin="round"
          />
        )}

        <Marker
          position={[Number(pickup.lat), Number(pickup.lng)]}
          icon={pickupIcon}
        >
          <Popup>Pickup: {pickup.address}</Popup>
        </Marker>

        <Circle
          center={[Number(dropoff.lat), Number(dropoff.lng)]}
          pathOptions={{ color: "#ef4444", fillOpacity: 0.05 }}
          radius={200}
        />
        <Marker
          position={[Number(dropoff.lat), Number(dropoff.lng)]}
          icon={dropoffIcon}
        >
          <Popup>Destination: {dropoff.address}</Popup>
        </Marker>

        {displayCurrent && (
          <>
            <Marker
              position={displayCurrent}
              icon={createRiderIcon(displayHeading, trackingStatus === 'OFFLINE' || trackingStatus === 'SIGNAL_LOST', trackingStatus)}
            >
              <Tooltip
                permanent
                direction="top"
                offset={[0, -40]}
                className={cn(
                  "bg-white border-none shadow-xl text-[10px] font-black px-2 py-1 rounded-md",
                  trackingStatus === 'OFFLINE' ? "text-rose-500" : 
                  trackingStatus === 'SIGNAL_LOST' ? "text-amber-600" : 
                  trackingStatus === 'DELAYED' ? "text-amber-500" : "text-emerald-600"
                )}
              >
                {riderName || "Rider"} 
                {trackingStatus === 'OFFLINE' && " (Offline)"}
                {trackingStatus === 'SIGNAL_LOST' && " (Signal Lost)"}
                {trackingStatus === 'DELAYED' && " (Delayed)"}
              </Tooltip>
            </Marker>
          </>
        )}

        {searchPos && (
          <>
            <ChangeView center={searchPos} zoom={17} />
            <Marker position={searchPos} icon={searchIcon}>
              <Popup>{searchLabel}</Popup>
              <Tooltip
                permanent
                direction="top"
                offset={[0, -40]}
                className="bg-white border-none shadow-none text-[10px] font-bold text-indigo-600"
              >
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
              ) : (
                searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setSuggestions([]);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                )
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
                        <MapPin
                          size={16}
                          className="text-slate-400 mt-0.5 shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {s.display_name.split(",")[0]}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {s.display_name
                              .split(",")
                              .slice(1)
                              .join(",")
                              .trim()}
                          </p>
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
        <div className="bg-white/95 backdrop-blur shadow-xl border border-slate-100 p-3 rounded-2xl flex items-start gap-3 text-left">
          <div className="p-2 bg-red-50 text-red-500 rounded-lg shrink-0">
            <MapPinned size={20} />
          </div>
          <div className="truncate">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-1">
              Destination
            </p>
            <h4 className="text-sm font-bold text-slate-800 truncate leading-tight">
              {dropoffDetails.main}
            </h4>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[9999] max-w-[320px]">
        <div className="bg-white/95 backdrop-blur shadow-2xl border border-slate-100 p-4 rounded-3xl">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-lg shrink-0 transition-colors",
              trackingStatus === 'OFFLINE' ? "bg-rose-100 text-rose-500" : 
              trackingStatus === 'SIGNAL_LOST' ? "bg-amber-100 text-amber-600" : 
              "bg-primary text-white shadow-primary/20"
            )}>
              {riderName?.substring(0, 1)}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <h3 className="font-bold text-slate-900 leading-none truncate mb-1">
                {riderName || "Rider"}
              </h3>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "flex h-2 w-2 rounded-full",
                  trackingStatus === 'OFFLINE' ? "bg-rose-500" : 
                  trackingStatus === 'SIGNAL_LOST' ? "bg-amber-500 animate-pulse" : 
                  trackingStatus === 'DELAYED' ? "bg-amber-300" : 
                  "bg-[#00B14F] animate-pulse"
                )} />
                <p className="text-[10px] font-medium text-slate-500 truncate">
                  {trackingStatus === 'OFFLINE' ? "Offline" : 
                   trackingStatus === 'SIGNAL_LOST' ? "Signal Lost" : 
                   trackingStatus === 'DELAYED' ? "Delayed" : "Live Tracking Active"}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] py-0 px-2 h-5 shrink-0 transition-colors",
                trackingStatus === 'LIVE' ? "bg-emerald-50/50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
              )}
            >
              {trackingStatus === 'LIVE' ? "Real-time" : "Stale Data"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-left">
            <div className="flex items-center gap-2">
              <Clock className="text-slate-400" size={12} />
              <div className="truncate">
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">
                  Last Update
                </p>
                <p className="text-[10px] font-bold text-slate-700">
                   {lastUpdateTs ? formatDistanceToNow(lastUpdateTs, { addSuffix: true }) : format(lastUpdate, "HH:mm:ss")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-left">
              <Activity className="text-slate-400" size={12} />
              <div className="truncate">
                <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">
                  Status
                </p>
                <p className={cn(
                  "text-[10px] font-bold uppercase tracking-tight",
                  trackingStatus === 'LIVE' ? "text-blue-600" : "text-slate-400"
                )}>
                  {status || "In Progress"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
