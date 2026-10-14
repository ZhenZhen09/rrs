import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from "react-router";
import { useData } from "../context/DataContext";
import { LiveTrackingMap } from "../components/LiveTrackingMap";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Clock, User as UserIcon, Bike, ChevronLeft, XCircle, CheckCircle2, Navigation } from "lucide-react";
import { formatLocalDate } from "../utils/dateUtils";
import { DeliveryRequest } from "../types";
import { useRealTime } from "../context/RealTimeContext";
import { cn } from "../components/ui/utils";
import { EtaStatus, RouteEstimate, getEtaStatus, formatDuration, formatEtaTime } from "../utils/eta";

export type TrackingStatus = 'OFFLINE' | 'SIGNAL_LOST' | 'DELAYED' | 'LIVE';
export type SyncPhase = 'FETCHING_API' | 'SYNCING_PRESENCE' | 'RIDER_FOUND' | 'READY';

interface LiveTrackingDashboardProps {
  requestId?: string;
  embedded?: boolean;
  onClose?: () => void;
}

interface TrackingLocation {
  lat: number;
  lng: number;
  source?: "request" | "rider";
  updated_at?: string;
}

interface TrackingPayload {
  request: DeliveryRequest;
  current_location: TrackingLocation | null;
  request_current_location: TrackingLocation | null;
  rider_current_location: TrackingLocation | null;
  history: { lat: number; lng: number; timestamp?: string }[];
  tracking_state: {
    has_request_location: boolean;
    has_rider_location: boolean;
    is_request_specific: boolean;
    is_fallback: boolean;
    rider_status: string | null;
    rider_is_online?: boolean; // New field for clearer fallback
    rider_is_on_duty?: boolean;
  };
}

export function LiveTrackingDashboard({ embedded = false, requestId, onClose }: LiveTrackingDashboardProps = {}) {
  const { id: routeId } = useParams<{ id: string }>();
  const id = requestId || routeId;
  const navigate = useNavigate();
  const { requests, fetchRequestById, refreshData } = useData();
  const { riderLocations, riderPresence, socket } = useRealTime();

  const closeTracking = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (window.opener) {
      window.close();
      return;
    }

    navigate(-1);
  };
  
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('FETCHING_API');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [trackingPayload, setTrackingPayload] = useState<TrackingPayload | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [eta, setEta] = useState<RouteEstimate | null>(null);
  const [etaError, setEtaError] = useState<string | null>(null);
  const [etaRefreshing, setEtaRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [lastEtaRequestAt, setLastEtaRequestAt] = useState(0);
  const etaRequestRef = useRef(0);

  const trackingRequest = trackingPayload?.request || requests.find((r) => r.request_id === id);
  const assignedRiderId = trackingPayload?.request?.assigned_rider_id || trackingRequest?.assigned_rider_id;

  const liveRiderLocation = useMemo(() => {
    return assignedRiderId ? riderLocations[assignedRiderId] : null;
  }, [riderLocations, assignedRiderId]);

  // Derive transitions from the current API and presence inputs.
  if (!isInitialLoading && syncPhase === 'FETCHING_API') setSyncPhase('SYNCING_PRESENCE');
  if (syncPhase === 'SYNCING_PRESENCE') {
    if (!assignedRiderId) setSyncPhase('READY');
    else if (riderPresence[assignedRiderId] === 'online' || liveRiderLocation) setSyncPhase('RIDER_FOUND');
  }
  useEffect(() => {
    if (syncPhase === 'RIDER_FOUND') {
      const timeout = setTimeout(() => setSyncPhase('READY'), 800);
      return () => clearTimeout(timeout);
    }
    if (syncPhase !== 'SYNCING_PRESENCE' || !assignedRiderId) return;
    const expectedWait = trackingPayload?.tracking_state?.rider_is_online ? 1500 : 3000;
    const timeout = setTimeout(() => setSyncPhase('READY'), expectedWait);
    return () => clearTimeout(timeout);
  }, [syncPhase, assignedRiderId, trackingPayload?.tracking_state?.rider_is_online]);

  const fetchTrackingPayload = () => {
    if (!id) return Promise.resolve();
    return fetch(`/api/requests/${id}/tracking`, { credentials: "include" })
      .then(async response => {
        if (!response.ok) {
          setTrackingPayload(null);
          setTrackingError(response.status === 403 ? "You are not allowed to view this tracking session." : "Tracking details are unavailable.");
          return;
        }
        const data: TrackingPayload = await response.json();
        setTrackingPayload(data);
        setTrackingError(null);
      })
      .catch(error => {
        console.error("Tracking payload fetch failed:", error);
        setTrackingError("Tracking details are unavailable.");
      })
      .finally(() => setIsInitialLoading(false));
  };

  // Effect to fetch the specific request if not found in the global list
  useEffect(() => {
    fetchTrackingPayload();

    if (id && !trackingRequest) {
      console.log('🔍 Request not in local state, fetching specifically:', id);
      fetchRequestById(id);
    }
  }, [id]);

  // Keep a local ref of presence pings to avoid "Signal Lost" when stationary
  const [lastPresencePulse, setLastPresencePulse] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    const interval = setInterval(() => {
      fetchTrackingPayload();
      fetchRequestById(id);
    }, 5000);

    return () => clearInterval(interval);
  }, [id, fetchRequestById]);

    const status = trackingRequest?.delivery_status?.toLowerCase();
    const origin = liveRiderLocation || trackingPayload?.current_location || (
      trackingRequest?.current_lat != null && trackingRequest?.current_lng != null
        ? { lat: trackingRequest.current_lat, lng: trackingRequest.current_lng }
        : null
    );
    const destination = trackingRequest?.dropoff_location;
    const hasValidCoordinates = Boolean(
      origin && destination &&
      Number.isFinite(Number(origin.lat)) && Number.isFinite(Number(origin.lng)) &&
      Number.isFinite(Number(destination.lat)) && Number.isFinite(Number(destination.lng)),
    );

  const etaEligible = status === 'in_progress' && !!origin && !!destination && hasValidCoordinates;
  const [etaInputs, setEtaInputs] = useState('');
  const etaInputKey = JSON.stringify([etaEligible, origin?.lat, origin?.lng, destination?.lat, destination?.lng, trackingRequest?.request_id, trackingRequest?.updated_at, trackingPayload?.current_location?.updated_at, liveRiderLocation?.timestamp]);
  if (etaInputs !== etaInputKey) {
    setEtaInputs(etaInputKey);
    if (!etaEligible) {
      setEta(null);
      setEtaError(null);
      setEtaRefreshing(false);
    } else if (nowMs - lastEtaRequestAt >= 60_000) {
      setLastEtaRequestAt(nowMs);
      setEtaRefreshing(true);
    }
  }
  useEffect(() => {
    if (!etaEligible || !origin || !destination || !lastEtaRequestAt) return;
    let cancelled = false;
    const requestNumber = ++etaRequestRef.current;
    fetch('/api/routing/eta', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: Number(origin.lat), lng: Number(origin.lng) },
        destination: { lat: Number(destination.lat), lng: Number(destination.lng) },
        requestId: trackingRequest?.request_id,
      }),
    }).then(async (response) => {
      if (!response.ok) throw new Error('ETA unavailable');
      return response.json() as Promise<RouteEstimate>;
    }).then((estimate) => {
      if (cancelled || requestNumber !== etaRequestRef.current) return;
      setEta(estimate);
      setEtaError(null);
    }).catch((error) => {
      if (cancelled || requestNumber !== etaRequestRef.current) return;
      setEtaError(error instanceof Error ? error.message : 'ETA unavailable');
    }).finally(() => {
      if (!cancelled && requestNumber === etaRequestRef.current) setEtaRefreshing(false);
    });
    return () => { cancelled = true; };
  }, [lastEtaRequestAt, etaEligible, trackingRequest?.request_id]);

  useEffect(() => {
    if (!id || !socket) return;

    socket.emit("join-room", `job_${id}`);

    // TARGETED HANDSHAKE: Ask server for this specific rider's status immediately
    if (assignedRiderId) {
      console.log('🤝 Targeted Handshake: Checking status for', assignedRiderId);
      socket.emit('check-rider-presence', assignedRiderId);
    }

    // LISTENER FIX: Also listen to global presence pings to keep the UI "Live"
    const handlePresenceChange = (data: { riderId: string, status: string, lastSeen: number }) => {
      if (data.riderId === assignedRiderId) {
        console.log('💓 Heartbeat received for tracking:', data);
        if (data.status === 'online') {
          setLastPresencePulse(data.lastSeen || Date.now());
        } else {
          setLastPresencePulse(0); // Clear pulse if they go offline
        }
      }
    };

    socket.on('rider-presence-changed', handlePresenceChange);
    return () => {
      socket.off('rider-presence-changed', handlePresenceChange);
    };
  }, [id, socket, assignedRiderId]);

  if (syncPhase !== 'READY') {
    const isOnline = assignedRiderId 
      ? (riderPresence[assignedRiderId] === 'online' || 
         (riderPresence[assignedRiderId] === undefined && trackingPayload?.tracking_state?.rider_is_online))
      : false;

    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50 animate-in fade-in duration-500">
        <div className="relative mb-8">
           {syncPhase === 'RIDER_FOUND' ? (
             <div className="w-20 h-20 bg-[#00B14F] rounded-full flex items-center justify-center animate-in zoom-in duration-300 shadow-lg shadow-[#00B14F]/20">
                <CheckCircle2 className="text-white" size={40} />
             </div>
           ) : (
             <>
               <div className="w-20 h-20 border-4 border-slate-100 rounded-full" />
               <div className="w-20 h-20 border-4 border-[#00B14F] border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
               <div className="absolute inset-0 flex items-center justify-center">
                 <Bike className="text-[#00B14F]" size={24} />
               </div>
             </>
           )}
        </div>
        
        <h2 className="text-xl font-[900] text-slate-900 mb-2 tracking-tight uppercase">
          {syncPhase === 'FETCHING_API' ? 'Initializing Secure Link' : 
           syncPhase === 'RIDER_FOUND' ? 'Rider Located!' :
           'Connecting to Rider'}
        </h2>
        
        <div className="flex flex-col items-center gap-1">
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest animate-pulse">
            {syncPhase === 'FETCHING_API' ? 'Fetching manifest details...' : 
             syncPhase === 'RIDER_FOUND' ? 'Establishing live stream...' :
             isOnline ? 'Rider online! Syncing live coordinates...' : 'Syncing real-time presence...'}
          </p>
          {syncPhase === 'SYNCING_PRESENCE' && !isOnline && (
             <p className="text-slate-300 font-bold text-[8px] uppercase tracking-[0.2em] mt-2">
               Scanning Fleet Network
             </p>
          )}
        </div>
      </div>
    );
  }

  if (!trackingRequest || trackingError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-slate-200">
          <Bike size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Tracking not found</h2>
        <p className="text-slate-500 mb-8 max-w-xs">{trackingError || "This request might be completed or the link has expired."}</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl h-12 px-8 font-bold border-slate-200">
          Go Back
        </Button>
      </div>
    );
  }

  console.log('📍 Tracking Request Info:', {
    id: trackingRequest.request_id,
    status: trackingRequest.delivery_status,
    lat: trackingPayload?.current_location?.lat ?? trackingRequest.current_lat,
    lng: trackingPayload?.current_location?.lng ?? trackingRequest.current_lng,
    source: trackingPayload?.current_location?.source,
    hasCurrent: Boolean(trackingPayload?.current_location) ||
      trackingRequest.current_lat !== null &&
      trackingRequest.current_lat !== undefined &&
      trackingRequest.current_lng !== null &&
      trackingRequest.current_lng !== undefined
  });

  const isCompleted = trackingRequest.delivery_status === 'completed';
  const isFailed = trackingRequest.delivery_status === 'failed';
  const isFinished = isCompleted || isFailed;

  const currentLocation = liveRiderLocation
    ? { 
        lat: Number(liveRiderLocation.lat), 
        lng: Number(liveRiderLocation.lng),
        heading: liveRiderLocation.heading 
      }
    : trackingPayload?.current_location
    ? { lat: Number(trackingPayload.current_location.lat), lng: Number(trackingPayload.current_location.lng) }
    : ((trackingRequest.current_lat !== null && trackingRequest.current_lat !== undefined && trackingRequest.current_lng !== null && trackingRequest.current_lng !== undefined)
      ? { lat: Number(trackingRequest.current_lat), lng: Number(trackingRequest.current_lng) }
      : null);

  // DATA AGE AUDIT (User Request)
  // Fix: Incorporate lastPresencePulse to avoid "Signal Lost" when stationary
  const lastUpdateTs = liveRiderLocation?.timestamp 
    ? Number(liveRiderLocation.timestamp)
    : (lastPresencePulse > 0 
        ? lastPresencePulse 
        : (trackingPayload?.current_location?.updated_at 
            ? new Date(trackingPayload.current_location.updated_at).getTime() 
            : (trackingRequest.updated_at ? new Date(trackingRequest.updated_at).getTime() : 0)));
  
  const dataAgeSeconds = lastUpdateTs ? (nowMs - lastUpdateTs) / 1000 : 9999;
  
  // Tighter threshold for 'DELAYED' but more relaxed for 'SIGNAL_LOST'
  const hasRecentLocation = Boolean(currentLocation) && dataAgeSeconds <= 180;

  // Hybrid Online Check: Use real-time socket first, fall back to API snapshot
  // CRITICAL FIX: Explicitly check for 'offline' status in socket data to override API snapshot.
  const isOnline = assignedRiderId 
    ? (riderPresence[assignedRiderId] === 'online' || 
       (riderPresence[assignedRiderId] === undefined && (trackingPayload?.tracking_state?.rider_is_online || hasRecentLocation)) ||
       (lastPresencePulse > 0 && (nowMs - lastPresencePulse) < 180000))
    : false;

  // FINAL STATUS RESOLVER (Single Source)
  // Priority: 1. Connection (Offline) > 2. GPS Age (Signal Lost) > 3. Data Delay > 4. Live
  // Thresholds calibrated for reliability
  let trackingStatus: TrackingStatus = 'LIVE';
  if (!isOnline) {
    trackingStatus = 'OFFLINE';
  } else if (dataAgeSeconds > 180) {
    // Online but no pulse for > 3 minutes
    trackingStatus = 'SIGNAL_LOST';
  } else if (dataAgeSeconds > 90) {
    // Online but missed pulse window
    trackingStatus = 'DELAYED';
  }

  const trackingLabel = isFinished ? "Delivery session complete" :
    trackingStatus === 'SIGNAL_LOST' ? "Tracking Suspended (Weak Signal)" :
    trackingStatus === 'DELAYED' ? "Tracking Delayed (Poor Connection)" :
    trackingStatus === 'OFFLINE' ? "Rider is currently offline" :
    trackingPayload?.tracking_state?.is_request_specific ? "Live delivery tracking" :
    "Assigned rider location";

  const etaStatus: EtaStatus = getEtaStatus({
    deliveryStatus: trackingRequest.delivery_status,
    currentLocationAt: lastUpdateTs || undefined,
    calculatedAt: eta ? new Date(eta.calculatedAt).getTime() : undefined,
    nowMs,
    freshnessLimitMs: 180_000,
  });

  return (
    <div
      role={embedded ? "dialog" : undefined}
      aria-modal={embedded ? true : undefined}
      aria-label={embedded ? "Live rider tracking" : undefined}
      className={cn(
      "bg-slate-50 flex flex-col animate-in fade-in duration-1000",
      embedded ? "fixed inset-0 z-[100] h-[100dvh] min-h-0" : "min-h-screen",
      )}
    >
      {/* Dynamic Floating Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-3 py-2.5 sm:px-6 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={closeTracking}
              aria-label={embedded ? "Close live tracking" : "Go back"}
              className="rounded-xl hover:bg-slate-100 h-10 w-10 shrink-0"
            >
              <ChevronLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight">Track Delivery</h1>
                <Badge variant="outline" className={cn(
                  "border-none font-bold text-[8px] sm:text-[10px] uppercase px-1.5 sm:px-2 py-0 transition-colors duration-500",
                  isFinished ? "bg-slate-100 text-slate-500" : 
                  trackingStatus === 'OFFLINE' ? "bg-rose-50 text-rose-500" :
                  trackingStatus === 'SIGNAL_LOST' ? "bg-amber-50 text-amber-600 animate-pulse" :
                  trackingStatus === 'DELAYED' ? "bg-amber-50 text-amber-500" :
                  "bg-[#00B14F]/10 text-[#009e46]"
                )}>
                  {isFinished ? 'Offline' : 
                   trackingStatus === 'OFFLINE' ? 'Offline' :
                   trackingStatus === 'SIGNAL_LOST' ? 'Signal Lost' :
                   trackingStatus === 'DELAYED' ? 'Delayed' : 'Live'}
                </Badge>
              </div>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5 truncate max-w-[180px] sm:max-w-none">
                ID: {trackingRequest.request_id}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-left ml-auto">Estimated Arrival</p>
              <p className="text-sm font-black text-slate-900">{trackingRequest.time_window}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-100" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10">
                <UserIcon size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rider Assigned</p>
                <p className="text-sm font-black text-slate-900">{trackingRequest.assigned_rider_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-[calc(100dvh-60px)] sm:h-[calc(100dvh-73px)] min-h-0">
        {/* Main Map View */}
        <div className="h-[54dvh] min-h-[250px] flex-1 relative bg-slate-200 lg:h-auto">
           <LiveTrackingMap 
             requestId={trackingRequest.request_id}
             pickup={trackingRequest.pickup_location}
             dropoff={trackingRequest.dropoff_location}
             current={currentLocation}
             history={trackingPayload?.history || []}
             riderName={trackingRequest.assigned_rider_name}
             status={trackingRequest.delivery_status}
             timeWindow={trackingRequest.time_window}
             remark={trackingRequest.rider_remark}
             hideSearch={true}
             containerClassName="h-full w-full"
             trackingStatus={trackingStatus}
             lastUpdateTs={lastUpdateTs}
             isOnDuty={trackingPayload?.tracking_state?.rider_is_on_duty}
           />
           
           {isFinished && (
             <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6">
                <Card className="max-w-sm w-full rounded-[2.5rem] border-none shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
                   <div className={`w-20 h-20 ${isCompleted ? 'bg-[#00B14F]' : 'bg-rose-500'} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ${isCompleted ? 'shadow-[#00B14F]/20' : 'shadow-rose-500/20'} text-white`}>
                      {isCompleted ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                   </div>
                   <h2 className="text-2xl font-black text-slate-900 mb-2">
                     {isCompleted ? 'Delivery Complete!' : 'Delivery Failed'}
                   </h2>
                   <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                     {isCompleted 
                       ? 'This task has been successfully delivered and tracking is now offline.' 
                       : 'This delivery attempt has failed. Please contact support for more information.'}
                   </p>
                   <Button onClick={closeTracking} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black uppercase tracking-widest text-xs">
                     Close Window
                   </Button>
                </Card>
             </div>
           )}
        </div>

        {/* Info Sidebar (Mobile: Bottom Sheet style) */}
        <div className="w-full h-[46dvh] max-h-[46dvh] lg:max-h-none lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-100 grid grid-cols-2 lg:flex lg:flex-col p-3 sm:p-8 gap-2 sm:gap-8 lg:space-y-8 z-10 lg:h-full overflow-y-auto">
            {/* Status Section */}
            <div className="col-span-2 space-y-2 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-[900] text-slate-900 tracking-tight text-xs sm:text-xl uppercase">Delivery Status</h3>
                <Badge className={`${isFailed ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#00B14F] hover:bg-[#00B14F]'} text-white px-2 sm:px-4 py-1 sm:py-1.5 rounded-full font-black text-[8px] sm:text-[10px] tracking-widest uppercase`}>
                  {trackingRequest.delivery_status?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="bg-slate-50 p-2.5 sm:p-6 rounded-xl sm:rounded-[2rem] border border-slate-100">
                <div className="flex items-start gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl shadow-sm"><Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" /></div>
                  <div className="text-left">
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rider&apos;s Update</p>
                    <p className="text-[11px] sm:text-sm font-bold text-slate-700 leading-tight sm:leading-relaxed italic line-clamp-2">
                      &quot;{trackingRequest.rider_remark || trackingLabel}&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {(trackingRequest.delivery_status === 'in_progress' || isCompleted) && (
              <div className={cn(
                "col-span-2 flex items-center gap-2 rounded-xl border p-2.5 sm:gap-3 sm:rounded-2xl sm:p-4",
                isCompleted ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50",
              )}>
                <Navigation className={cn("h-4 w-4 shrink-0 sm:h-5 sm:w-5", isCompleted ? "text-emerald-600" : "text-blue-600")} />
                <div className="min-w-0 text-left">
                  <p className={cn("text-[8px] font-black uppercase tracking-widest sm:text-[10px]", isCompleted ? "text-emerald-700" : "text-blue-700")}>
                    {isCompleted ? "Completed at" : "Estimated drop-off"}
                  </p>
                  {isCompleted && trackingRequest.completed_at ? (
                    <p className="text-sm font-black text-slate-900 sm:text-base">
                      {new Date(trackingRequest.completed_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  ) : etaStatus === 'available' && eta ? (
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-black text-slate-900 sm:text-base">{formatEtaTime(nowMs, eta.durationSeconds)}</p>
                      <p className="truncate text-[9px] font-bold text-slate-600 sm:text-[10px]">{formatDuration(eta.durationSeconds)} away</p>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-600 sm:text-xs">
                      {etaRefreshing ? "Calculating route..." : etaError ? "ETA unavailable" : "Waiting for fresh location"}
                    </p>
                  )}
                  {!isCompleted && etaStatus === 'stale' && <p className="text-[9px] font-bold text-amber-700">Location stale · estimate may be outdated</p>}
                </div>
              </div>
            )}

            {/* Schedule Section */}
            <div className="col-span-2 grid grid-cols-2 gap-2 sm:gap-4">
              <div className="bg-slate-50 p-2.5 sm:p-4 rounded-xl sm:rounded-3xl border border-slate-100">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2 text-left">
                  Window
                </p>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  <p className="font-black text-slate-800 text-[11px] sm:text-sm truncate">
                    {trackingRequest.time_window}
                  </p>
                </div>
              </div>
              <div className="bg-white p-2.5 sm:p-4 rounded-xl sm:rounded-3xl border border-slate-100 shadow-sm text-left">
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 sm:mb-2">
                  Date
                </p>
                <p className="font-black text-slate-800 text-[11px] sm:text-sm">
                  {formatLocalDate(trackingRequest.delivery_date, "MMM d")}
                </p>
              </div>
            </div>

            {/* Rider Remark */}
            <div className="space-y-2 sm:space-y-4 min-w-0">
               <h3 className="font-[900] text-slate-900 tracking-tight text-sm sm:text-xl text-left">Rider</h3>
               <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-5 bg-white rounded-xl sm:rounded-[2rem] border border-slate-100 shadow-sm min-w-0">
                  <div className="w-9 h-9 sm:w-14 sm:h-14 bg-slate-900 text-white rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-sm sm:text-xl shadow-lg shrink-0">
                    {trackingRequest.assigned_rider_name?.substring(0,1)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs sm:text-base font-black text-slate-900 truncate">{trackingRequest.assigned_rider_name}</p>
                    <p className="text-[8px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">ID: {trackingRequest.assigned_rider_id}</p>
                  </div>
               </div>
            </div>

            {/* Route Details */}
            <div className="space-y-2 sm:space-y-4 min-w-0">
              <h3 className="font-[900] text-slate-900 tracking-tight text-sm sm:text-xl text-left">Route Details</h3>
              <div className="space-y-2 sm:space-y-6 relative pl-5 sm:pl-8 text-left">
                <div className="absolute left-3 top-2 bottom-2 w-[2px] bg-slate-100 border-l-2 border-dashed" />
                
                <div className="relative">
                  <div className="absolute -left-[18px] sm:-left-[26px] top-1 w-3 h-3 sm:w-4 sm:h-4 bg-[#00B14F] rounded-full border-2 sm:border-4 border-white shadow-sm" />
                  <div>
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup From</p>
                    <p className="text-[10px] sm:text-sm font-bold text-slate-700 leading-tight line-clamp-2">{trackingRequest.pickup_location.address}</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[18px] sm:-left-[26px] top-1 w-3 h-3 sm:w-4 sm:h-4 bg-rose-500 rounded-full border-2 sm:border-4 border-white shadow-sm" />
                  <div>
                    <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deliver To</p>
                    <p className="text-[10px] sm:text-sm font-[900] text-slate-900 leading-tight mb-1 truncate">{trackingRequest.recipient_name}</p>
                    <p className="text-[9px] sm:text-xs font-bold text-slate-600 leading-tight line-clamp-2">{trackingRequest.dropoff_location.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => refreshData()}
              variant="outline" 
              className="col-span-2 w-full h-9 sm:h-14 rounded-xl sm:rounded-2xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[9px] sm:text-[10px] hover:bg-slate-50 transition-all"
            >
              Refresh Info
            </Button>
        </div>
      </div>
    </div>
  );
}
