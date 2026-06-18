import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from "react-router";
import { useData } from "../context/DataContext";
import { LiveTrackingMap } from "../components/LiveTrackingMap";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Clock, User as UserIcon, Bike, ChevronLeft, MapPin, XCircle, CheckCircle2 } from "lucide-react";
import { formatLocalDate } from "../utils/dateUtils";
import { DeliveryRequest } from "../types";
import { useRealTime } from "../context/RealTimeContext";
import { cn } from "../components/ui/utils";

export type TrackingStatus = 'OFFLINE' | 'SIGNAL_LOST' | 'DELAYED' | 'LIVE';
export type SyncPhase = 'FETCHING_API' | 'SYNCING_PRESENCE' | 'RIDER_FOUND' | 'READY';

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

export function LiveTrackingDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, fetchRequestById, refreshData } = useData();
  const { riderLocations, riderPresence, socket } = useRealTime();
  
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('FETCHING_API');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPresenceSyncing, setIsPresenceSyncing] = useState(true);
  const [trackingPayload, setTrackingPayload] = useState<TrackingPayload | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const trackingRequest = trackingPayload?.request || requests.find((r) => r.request_id === id);
  const assignedRiderId = trackingPayload?.request?.assigned_rider_id || trackingRequest?.assigned_rider_id;

  const liveRiderLocation = useMemo(() => {
    return assignedRiderId ? riderLocations[assignedRiderId] : null;
  }, [riderLocations, assignedRiderId]);

  // Phase Transition: API -> Syncing Presence
  useEffect(() => {
    if (!isInitialLoading && syncPhase === 'FETCHING_API') {
      setSyncPhase('SYNCING_PRESENCE');
    }
  }, [isInitialLoading, syncPhase]);

  // Phase Transition: Syncing Presence -> Rider Found / Ready
  useEffect(() => {
    if (syncPhase !== 'SYNCING_PRESENCE') return;

    if (!assignedRiderId) {
      setSyncPhase('READY');
      setIsPresenceSyncing(false);
      return;
    }

    const concludeSync = (found: boolean) => {
      if (found) {
        setSyncPhase('RIDER_FOUND');
        // Small delay to show "Rider Found!" state
        setTimeout(() => {
          setSyncPhase('READY');
          setIsPresenceSyncing(false);
        }, 800);
      } else {
        setSyncPhase('READY');
        setIsPresenceSyncing(false);
      }
    };

    // Rule 1: Immediate finish if socket already knows they are online
    if (riderPresence[assignedRiderId] === 'online') {
      concludeSync(true);
      return;
    }

    // Rule 2: Immediate finish if we get a live coordinate while waiting
    if (liveRiderLocation) {
      concludeSync(true);
      return;
    }

    // Rule 3: Faster finish if API says they are online (Socket handshake should be fast)
    // We'll give it a shorter window if we expect them to be there.
    const expectedWait = trackingPayload?.tracking_state?.rider_is_online ? 1500 : 3000;

    // Safety timeout: dynamic based on expectations
    const timeout = setTimeout(() => {
      console.log("⏳ Presence sync timeout - showing fallback state");
      concludeSync(false);
    }, expectedWait);

    return () => clearTimeout(timeout);
  }, [syncPhase, assignedRiderId, riderPresence, liveRiderLocation, trackingPayload]);

  const fetchTrackingPayload = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/requests/${id}/tracking`, {
        credentials: "include",
      });

      if (!response.ok) {
        setTrackingPayload(null);
        setTrackingError(response.status === 403 ? "You are not allowed to view this tracking session." : "Tracking details are unavailable.");
        return;
      }

      const data = await response.json();
      setTrackingPayload(data);
      setTrackingError(null);
    } catch (error) {
      console.error("Tracking payload fetch failed:", error);
      setTrackingError("Tracking details are unavailable.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Effect to fetch the specific request if not found in the global list
  useEffect(() => {
    fetchTrackingPayload();

    if (id && !trackingRequest) {
      console.log('🔍 Request not in local state, fetching specifically:', id);
      fetchRequestById(id);
    } else if (trackingRequest) {
      setIsInitialLoading(false);
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
  
  const dataAgeSeconds = lastUpdateTs ? (Date.now() - lastUpdateTs) / 1000 : 9999;
  
  // Tighter threshold for 'DELAYED' but more relaxed for 'SIGNAL_LOST'
  const hasRecentLocation = Boolean(currentLocation) && dataAgeSeconds <= 180;

  // Hybrid Online Check: Use real-time socket first, fall back to API snapshot
  // CRITICAL FIX: Explicitly check for 'offline' status in socket data to override API snapshot.
  const isOnline = assignedRiderId 
    ? (riderPresence[assignedRiderId] === 'online' || 
       (riderPresence[assignedRiderId] === undefined && (trackingPayload?.tracking_state?.rider_is_online || hasRecentLocation)) ||
       (lastPresencePulse > 0 && (Date.now() - lastPresencePulse) < 180000))
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col animate-in fade-in duration-1000">
      {/* Dynamic Floating Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.close()} 
              className="rounded-xl hover:bg-slate-100 h-10 w-10"
            >
              <ChevronLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Track Delivery</h1>
                <Badge variant="outline" className={cn(
                  "border-none font-bold text-[10px] uppercase px-2 py-0 transition-colors duration-500",
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
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

      <div className="flex-1 flex flex-col lg:flex-row h-full">
        {/* Main Map View */}
        <div className="flex-1 relative bg-slate-200">
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
                   <Button onClick={() => window.close()} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black uppercase tracking-widest text-xs">
                     Close Window
                   </Button>
                </Card>
             </div>
           )}
        </div>

        {/* Info Sidebar (Mobile: Bottom Sheet style) */}
        <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col p-8 space-y-8 z-10 lg:h-[calc(100vh-73px)] overflow-y-auto">
            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-[900] text-slate-900 tracking-tight text-xl uppercase">Delivery Status</h3>
                <Badge className={`${isFailed ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#00B14F] hover:bg-[#00B14F]'} text-white px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase`}>
                  {trackingRequest.delivery_status?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm"><Clock className="h-5 w-5 text-amber-500" /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rider's Update</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                      "{trackingRequest.rider_remark || trackingLabel}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">
                  Window
                </p>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  <p className="font-black text-slate-800 text-sm">
                    {trackingRequest.time_window}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Date
                </p>
                <p className="font-black text-slate-800 text-sm">
                  {formatLocalDate(trackingRequest.delivery_date, "MMM d")}
                </p>
              </div>
            </div>

            {/* Rider Remark */}
            <div className="space-y-4">
               <h3 className="font-[900] text-slate-900 tracking-tight text-xl text-left">Rider</h3>
               <div className="flex items-center gap-4 p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                    {trackingRequest.assigned_rider_name?.substring(0,1)}
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black text-slate-900">{trackingRequest.assigned_rider_name}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {trackingRequest.assigned_rider_id}</p>
                  </div>
               </div>
            </div>

            {/* Route Details */}
            <div className="space-y-4 flex-1">
              <h3 className="font-[900] text-slate-900 tracking-tight text-xl text-left">Route Details</h3>
              <div className="space-y-6 relative pl-8 text-left">
                <div className="absolute left-3 top-2 bottom-2 w-[2px] bg-slate-100 border-l-2 border-dashed" />
                
                <div className="relative">
                  <div className="absolute -left-[26px] top-1 w-4 h-4 bg-[#00B14F] rounded-full border-4 border-white shadow-sm" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup From</p>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{trackingRequest.pickup_location.address}</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[26px] top-1 w-4 h-4 bg-rose-500 rounded-full border-4 border-white shadow-sm" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deliver To</p>
                    <p className="text-sm font-[900] text-slate-900 leading-tight mb-1">{trackingRequest.recipient_name}</p>
                    <p className="text-xs font-bold text-slate-600">{trackingRequest.dropoff_location.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => refreshData()}
              variant="outline" 
              className="w-full h-14 rounded-2xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
            >
              Refresh Info
            </Button>
        </div>
      </div>
    </div>
  );
}
