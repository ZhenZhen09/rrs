import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { WebPushSettings } from "../components/WebPushSettings";
import { MapPickerContent } from "../components/MapPicker";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { type Location, type DeliveryRequest, type RequestType, type UrgencyLevel } from "../types";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  Download,
  FileClock,
  HelpCircle,
  Home,
  LocateFixed,
  MapPin,
  Menu,
  Navigation,
  X,
  PackageCheck,
  RefreshCw,
  Route,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import "./personnel-v2.css";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import { createRevisionDraft, normalizeLocation } from "./revisionDraft";
import { clearLegacyPersonnelV2Draft, clearPersonnelV2Draft, getPersonnelV2DraftKey } from "./draftStorage";

type Step = 1 | 2 | 3 | 4;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const initialDraft = {
  category: "Delivery/Pickup",
  urgency: "Medium",
  date: new Date().toISOString().slice(0, 10),
  slot: "09:00 - 10:00",
  pickup: null as Location | null,
  dropoff: null as Location | null,
  recipient: "",
  recipientContact: "",
  pickupContact: "",
  instructions: "",
};

const ARRIVAL_TIME_SLOTS = Array.from({ length: 11 }, (_, index) => {
  const startHour = index + 8;
  const endHour = startHour + 1;
  return `${String(startHour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;
});

function readSavedDraft(userId?: string | null): { draft: typeof initialDraft; step: Step } {
  try {
    clearLegacyPersonnelV2Draft(localStorage);
    const key = getPersonnelV2DraftKey(userId);
    const saved = key ? localStorage.getItem(key) : null;
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        draft: { ...initialDraft, ...(parsed?.draft ?? parsed) },
        step: parsed?.draft && [1, 2, 3, 4].includes(parsed.step) ? parsed.step : 1,
      };
    }
  } catch { /* Ignore malformed drafts or unavailable browser storage. */ }
  return { draft: initialDraft, step: 1 };
}

const steps = ["Request", "Route", "Recipient", "Review"];
type PaginationItem = number | "ellipsis";
type RebookValues = { date: string; slot: string; urgency: UrgencyLevel };

function getPaginationItems(totalPages: number, currentPage: number): PaginationItem[] {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis", totalPages];
  if (currentPage >= totalPages - 2) return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
}

function statusLabel(request: DeliveryRequest) {
  if (request.delivery_status === "completed") return "Completed";
  if (request.status === "returned_for_revision") return "Needs revision";
  if (request.delivery_status === "in_progress") return "Rider on the way";
  if (request.status === "approved") return "Approved";
  if (request.status === "disapproved") return "Declined";
  return "Awaiting review";
}

function formatLocation(location?: Location | null) {
  if (!location) return "Not selected";
  return location.businessName || location.address.split(",")[0];
}

function estimateDistanceKm(from: Location, to: Location) {
  const earthRadius = 6371;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FitRouteBounds({ pickup, dropoff }: { pickup: Location; dropoff: Location }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]], {
      padding: [40, 40],
      maxZoom: 15,
      animate: true,
    });
  }, [dropoff.lat, dropoff.lng, map, pickup.lat, pickup.lng]);
  return null;
}

function RoutePreview({ pickup, dropoff }: { pickup: Location; dropoff: Location }) {
  const [route, setRoute] = useState<{ positions: [number, number][]; distanceKm: number; durationMin: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeError, setRouteError] = useState(false);
  const safePickup = useMemo(() => normalizeLocation(pickup), [pickup]);
  const safeDropoff = useMemo(() => normalizeLocation(dropoff), [dropoff]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchRoute = async () => {
      if (!safePickup || !safeDropoff) {
        setIsLoading(false);
        setRouteError(true);
        setRoute(null);
        return;
      }
      setIsLoading(true);
      setRouteError(false);
      try {
        const params = new URLSearchParams({
          waypoints: `${safePickup.lat},${safePickup.lng}|${safeDropoff.lat},${safeDropoff.lng}`,
          mode: "drive",
          format: "geojson",
          details: "instruction_details",
          apiKey: "e981beca841349698124675a91674f3a",
        });
        const response = await fetch(
          `https://api.geoapify.com/v1/routing?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error(`Routing request failed: ${response.status}`);
        const data = await response.json();
        const feature = data.features?.[0];
        const coordinates = feature?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 1) throw new Error("No route geometry returned");

        // Geoapify may return either LineString or MultiLineString geometry.
        // Leaflet needs one flat list of [lat, lng] points.
        const flatCoordinates = feature.geometry.type === "MultiLineString"
          ? coordinates.flat(1)
          : coordinates;

        const positions = flatCoordinates
          .filter((point: unknown) => Array.isArray(point) && point.length >= 2)
          .map((point: [number, number]) => [Number(point[1]), Number(point[0])] as [number, number])
          .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
        const distanceMeters = Number(feature.properties?.distance || data.results?.[0]?.distance || 0);
        const durationSeconds = Number(feature.properties?.time || data.results?.[0]?.time || 0);
        if (positions.length < 2) throw new Error("Invalid route geometry returned");
        setRoute({
          positions,
          distanceKm: distanceMeters / 1000,
          durationMin: Math.max(1, Math.round(durationSeconds / 60)),
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Geoapify route preview failed", error);
        setRouteError(true);
        setRoute(null);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    fetchRoute();
    return () => controller.abort();
  }, [safeDropoff, safePickup]);

  if (!safePickup || !safeDropoff) {
    return <div className="flex min-h-[292px] items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900">Location coordinates are unavailable. Open the location cards above and adjust the pins before continuing.</div>;
  }

  const fallbackDistance = estimateDistanceKm(safePickup, safeDropoff);
  const validRoutePositions = route?.positions.filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  const routePositions: [number, number][] = validRoutePositions && validRoutePositions.length >= 2 ? validRoutePositions : [[safePickup.lat, safePickup.lng], [safeDropoff.lat, safeDropoff.lng]];
  const distance = route?.distanceKm ?? fallbackDistance;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100" style={{ height: 292 }}>
      <MapContainer
        center={[(safePickup.lat + safeDropoff.lat) / 2, (safePickup.lng + safeDropoff.lng) / 2]}
        zoom={13}
        scrollWheelZoom
        zoomControl
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitRouteBounds pickup={safePickup} dropoff={safeDropoff} />
        <Polyline positions={routePositions} pathOptions={{ color: route ? "#059669" : "#94a3b8", weight: 5, dashArray: route ? undefined : "10 8" }} />
        <CircleMarker center={[safePickup.lat, safePickup.lng]} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#059669", fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -8]} permanent>Pickup</Tooltip>
        </CircleMarker>
        <CircleMarker center={[safeDropoff.lat, safeDropoff.lng]} radius={9} pathOptions={{ color: "#ffffff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }}>
          <Tooltip direction="top" offset={[0, -8]} permanent>Drop-off</Tooltip>
        </CircleMarker>
      </MapContainer>
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <div className="min-w-0"><p className="truncate font-bold text-slate-800">{formatLocation(pickup)} <ArrowRight className="mx-1 inline h-3 w-3 text-slate-400" /> {formatLocation(dropoff)}</p><p className="mt-0.5 text-[10px] text-slate-500">{isLoading ? "Calculating road route..." : routeError ? "Road route unavailable · showing direct preview" : `Road route · about ${route?.durationMin} min`}</p></div>
        <span className={`ml-3 shrink-0 font-black ${routeError ? "text-slate-500" : "text-emerald-700"}`}>{isLoading ? "..." : `~${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}`}</span>
      </div>
    </div>
  );
}

function LocationCard({
  label,
  location,
  tone,
  onClick,
}: {
  label: string;
  location: Location | null;
  tone: "green" | "blue";
  onClick: () => void;
}) {
  const color = tone === "green" ? "text-emerald-700 bg-emerald-50" : "text-blue-700 bg-blue-50";
  return (
    <button onClick={onClick} className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-md">
      <div className="mb-3 flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
        <MapPin className="h-4 w-4 text-slate-400 group-hover:text-emerald-600" />
      </div>
      <p className="font-semibold text-slate-900">{formatLocation(location)}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{location?.address || "Search an address or move the pin on the map"}</p>
      <p className="mt-3 text-xs font-bold text-emerald-700">{location ? "Adjust location" : "Choose location"} <ArrowRight className="ml-1 inline h-3 w-3" /></p>
    </button>
  );
}

export function PersonnelV2Page() {
  const { user, logout } = useAuth();
  const { requests, fetchWithAuth, refreshData, cancelRequest } = useData();
  const [activeView, setActiveView] = useState<"home" | "requests" | "help" | "preferences">("home");
  const [notificationRequestId, setNotificationRequestId] = useState<string | null>(null);
  const requestFromNotification = typeof window === 'undefined'
    ? null
    : new URLSearchParams(window.location.search).get('request');
  const [savedDraft] = useState(() => readSavedDraft(user?.id));
  const [step, setStep] = useState<Step>(savedDraft.step);
  const [draft, setDraft] = useState(savedDraft.draft);
  const [mapTarget, setMapTarget] = useState<"pickup" | "dropoff" | null>(null);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState<DeliveryRequest | null>(null);

  useEffect(() => {
    const nextSavedDraft = readSavedDraft(user?.id);
    setStep(nextSavedDraft.step);
    setDraft(nextSavedDraft.draft);
  }, [user?.id]);

  useEffect(() => {
    if (!requestFromNotification) return;
    setNotificationRequestId(requestFromNotification);
    setActiveView('requests');
  }, [requestFromNotification]);

  useEffect(() => {
    const openRequest = (event: Event) => {
      const requestId = (event as CustomEvent<{ requestId?: string }>).detail?.requestId;
      if (!requestId) return;
      setNotificationRequestId(requestId);
      setActiveView("requests");
    };
    window.addEventListener("personnel:open-request", openRequest);
    return () => window.removeEventListener("personnel:open-request", openRequest);
  }, []);

  const myRequests = useMemo(() => (Array.isArray(requests) ? requests : []).filter((r) => r.requester_id === user?.id), [requests, user?.id]);
  const activeRequests = myRequests.filter((r) => !["completed", "failed", "cancelled"].includes(String(r.delivery_status || "")));
  const pendingRequests = myRequests.filter((r) => String(r.status) === "pending" || String(r.status) === "submitted_waiting");
  const revisionRequests = myRequests.filter((r) => r.status === "returned_for_revision");
  const doneRequests = myRequests.filter((r) => r.delivery_status === "completed");

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    const install = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const installed = () => setInstallPrompt(null);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("beforeinstallprompt", install as EventListener);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeinstallprompt", install as EventListener);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const updateDraft = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }));

  const saveDraft = () => {
    const key = getPersonnelV2DraftKey(user?.id);
    if (!key) return;
    localStorage.setItem(key, JSON.stringify({ draft, step }));
    toast.success("Draft saved on this device");
  };

  const clearDraft = () => {
    clearPersonnelV2Draft(user?.id, localStorage);
    setDraft(initialDraft);
    setStep(1);
    toast.success("Draft cleared");
  };

  const startRevision = (request: DeliveryRequest) => {
    if (request.status !== "returned_for_revision") return;
    setRevisionRequest(request);
    setDraft(createRevisionDraft(request, initialDraft));
    setStep(1);
    setActiveView("home");
    setShowMobileNav(false);
    toast.info("The request is ready in the wizard. Update the requested details, then submit the revision.");
  };

  const cancelRevision = () => {
    setRevisionRequest(null);
    setDraft(initialDraft);
    setStep(1);
    clearPersonnelV2Draft(user?.id, localStorage);
    toast.info("Revision mode closed");
  };

  const next = () => {
    if (step === 1 && (!draft.category || !draft.date || !draft.slot)) return toast.error("Complete the request details first");
    if (step === 2 && (!draft.pickup || !draft.dropoff)) return toast.error("Choose both route locations first");
    if (step === 3 && !draft.recipient.trim()) return toast.error("Add a recipient name first");
    setStep((current) => Math.min(4, current + 1) as Step);
  };

  const handleSubmitRequest = async () => {
    if (!isOnline) return toast.error("Reconnect to the internet before submitting a request");
    if (!draft.pickup || !draft.dropoff || !draft.recipient.trim()) return toast.error("Complete the request before submitting");
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const requestPayload = {
        delivery_date: draft.date,
        time_window: draft.slot,
        pickup_location: draft.pickup,
        dropoff_location: draft.dropoff,
        pickup_contact_name: draft.pickupContact || undefined,
        recipient_name: draft.recipient.trim(),
        recipient_contact: draft.recipientContact.trim() || undefined,
        request_type: draft.category as RequestType,
        urgency_level: draft.urgency as UrgencyLevel,
        personnel_instructions: draft.instructions.trim() || undefined,
        requester_id: user?.id,
        requester_name: user?.name,
        requester_department: user?.department,
      };
      const response = await fetchWithAuth("/api/requests", {
        method: "POST",
        body: JSON.stringify(requestPayload),
      });
      if (!response || !response.ok) {
        throw new Error(`Request submission failed: ${response?.status || "network error"}`);
      }
      await refreshData();
      clearPersonnelV2Draft(user?.id, localStorage);
      setDraft(initialDraft);
      setStep(1);
      setShowSubmitConfirm(false);
      toast.success("Request submitted. You have 60 seconds to cancel it.");
    } catch (error) {
      console.error("V2 request submission failed", error);
      toast.error("The request could not be submitted. Your draft was kept.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRevision = async () => {
    if (!revisionRequest) return handleSubmitRequest();
    if (!isOnline) return toast.error("Reconnect to the internet before submitting a revision");
    if (!draft.pickup || !draft.dropoff || !draft.recipient.trim()) return toast.error("Complete the revision before submitting");
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await fetchWithAuth(`/api/requests/${revisionRequest.request_id}/resubmit`, {
        method: "PUT",
        body: JSON.stringify({
          delivery_date: draft.date,
          time_window: draft.slot,
          pickup_location: draft.pickup,
          dropoff_location: draft.dropoff,
          pickup_contact_name: draft.pickupContact || undefined,
          recipient_name: draft.recipient.trim(),
          recipient_contact: draft.recipientContact.trim() || undefined,
          request_type: draft.category as RequestType,
          urgency_level: draft.urgency as UrgencyLevel,
          personnel_instructions: draft.instructions.trim() || undefined,
          on_behalf_of: revisionRequest.on_behalf_of || undefined,
          requester_id: user?.id,
          requester_name: user?.name,
          requester_department: user?.department,
        }),
      });
      if (!response || !response.ok) throw new Error(`Revision submission failed: ${response?.status || "network error"}`);
      await refreshData();
      clearPersonnelV2Draft(user?.id, localStorage);
      setRevisionRequest(null);
      setDraft(initialDraft);
      setStep(1);
      setShowSubmitConfirm(false);
      toast.success("Revision submitted. Admin will review the updated request.");
    } catch (error) {
      console.error("V2 request revision failed", error);
      toast.error("The revision could not be submitted. Your changes were kept.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRebookRequest = async (request: DeliveryRequest, values: RebookValues) => {
    if (!isOnline) {
      toast.error("Reconnect to the internet before rebooking a request");
      return;
    }
    const reference = `Rebooked from #${request.request_id.slice(-6).toUpperCase()}`;
    const instructions = [reference, request.personnel_instructions].filter(Boolean).join("\n");
    try {
      const response = await fetchWithAuth("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          delivery_date: values.date,
          time_window: values.slot,
          pickup_location: request.pickup_location,
          dropoff_location: request.dropoff_location,
          pickup_contact_name: request.pickup_contact_name,
          pickup_contact_mobile: request.pickup_contact_mobile,
          recipient_name: request.recipient_name,
          recipient_contact: request.recipient_contact,
          request_type: request.request_type,
          urgency_level: values.urgency,
          personnel_instructions: instructions,
          requester_id: user?.id,
          requester_name: user?.name,
          requester_department: user?.department,
        }),
      });
      if (!response || !response.ok) throw new Error(`Rebooking failed: ${response?.status || "network error"}`);
      await refreshData();
      toast.success(`New request created from ${reference}`);
    } catch (error) {
      console.error("V2 rebooking failed", error);
      toast.error("The request could not be rebooked.");
      throw error;
    }
  };

  const selectLocation = (target: "pickup" | "dropoff", location: Location) => {
    setDraft((current) => ({
      ...current,
      [target]: location,
    }));
    setMapTarget(null);
    setMobileDetailsOpen(false);
    toast.success(`${target === "pickup" ? "Pickup" : "Destination"} location updated`);
  };

  const install = async () => {
    if (!installPrompt) return toast.info("Use your browser menu and choose 'Add to Home screen'");
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } finally {
      setInstallPrompt(null);
    }
  };

  const navigate = (view: "home" | "requests" | "help" | "preferences") => {
    setActiveView(view);
    setShowMobileNav(false);
  };

  return (
    <div className="personnel-v2-page min-h-[100dvh] bg-[#f5f7f8] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2 hover:bg-slate-100 md:hidden" onClick={() => setShowMobileNav((v) => !v)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"><Navigation className="h-5 w-5" /></div>
            <div><p className="text-sm font-black tracking-tight">Personnel Portal <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] text-emerald-700">V2 PREVIEW</span></p><p className="hidden text-[11px] text-slate-500 sm:block">A simpler way to move work forward</p></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {!isOnline && <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-800">Offline mode</span>}
            <PersonnelNotificationBell />
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-4 sm:flex"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{user?.name?.slice(0, 1) || "P"}</div><span className="max-w-32 truncate text-sm font-semibold">{user?.name || "Personnel"}</span></div>
          </div>
        </div>
      </header>

      {showMobileNav && <div className="personnel-v2-mobile-nav fixed inset-0 z-40 bg-slate-900/20 md:hidden" onClick={() => setShowMobileNav(false)}><aside className="h-full w-72 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><Nav activeView={activeView} setActiveView={navigate} /></aside></div>}

      <div className="mx-auto flex max-w-[1500px]">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-7 md:block"><Nav activeView={activeView} setActiveView={navigate} /></aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-6xl">
            {activeView === "help" ? <HelpPanel /> : activeView === "requests" ? <RequestsPanel requests={myRequests} openRequestId={notificationRequestId} onOpenedRequest={() => setNotificationRequestId(null)} onCancel={(requestId) => cancelRequest(requestId)} onRebook={handleRebookRequest} onRevise={startRevision} /> : activeView === "preferences" ? <PreferencesPanel onInstall={install} canInstall={Boolean(installPrompt)} onLogout={logout} fetchWithAuth={fetchWithAuth} /> : <>
              <div className="personnel-v2-overview-hero mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Good morning, {user?.name?.split(" ")[0] || "there"}</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">What needs moving today?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">File a request in minutes, confirm the exact route, and keep every delivery update in one place.</p></div></div>

              {!isOnline && <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><LocateFixed className="h-5 w-5" /><span><b>You are offline.</b> Your draft remains safe on this device. Final submission will be available when you reconnect.</span></div>}

              <div className="personnel-v2-primary-content">
              <div className="personnel-v2-metrics mb-8 grid gap-4 sm:grid-cols-3"><Metric icon={<Clock3 />} label="Pending / Awaiting review" value={pendingRequests.length} /><Metric icon={<RefreshCw />} label="Revisions" value={revisionRequests.length} /><Metric icon={<PackageCheck />} label="Done" value={doneRequests.length} /></div>

              <section className="personnel-v2-wizard mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                {revisionRequest && <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><RefreshCw className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div className="min-w-0 flex-1"><p className="text-sm font-black">Revision requested for #{revisionRequest.request_id.slice(-6).toUpperCase()}</p><p className="mt-1 text-sm leading-5 text-amber-900">{revisionRequest.admin_remark || "Please review the request details and submit the updated information."}</p></div><button type="button" onClick={cancelRevision} className="shrink-0 rounded-lg p-1.5 text-amber-700 hover:bg-amber-100" aria-label="Close revision mode"><X className="h-4 w-4" /></button></div>}
                <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-slate-400">Quick request wizard</p><h2 className="mt-1 text-xl font-black">{revisionRequest ? "Update and resubmit request" : "Plan a delivery"}</h2></div><div className="flex items-center gap-2"><Button variant="ghost" onClick={saveDraft} className="rounded-xl text-slate-500"><Save className="mr-2 h-4 w-4" />Save draft</Button><Button variant="ghost" onClick={clearDraft} className="rounded-xl text-slate-400"><RefreshCw className="mr-2 h-4 w-4" />Reset</Button></div></div>
                <div className="mb-8 flex items-center gap-2">{steps.map((label, index) => { const number = index + 1; return <div key={label} className="flex min-w-0 flex-1 items-center gap-2"><div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${step >= number ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"}`}>{step > number ? <Check className="h-4 w-4" /> : number}</div><span className={`hidden truncate text-xs font-bold sm:block ${step >= number ? "text-slate-900" : "text-slate-400"}`}>{label}</span>{number < 4 && <div className={`h-px flex-1 ${step > number ? "bg-emerald-500" : "bg-slate-200"}`} />}</div>; })}</div>

                {step === 1 && <div className="grid gap-5 md:grid-cols-2"><Field label="What do you need?" hint="Choose the closest category"><select value={draft.category} onChange={(e) => updateDraft({ category: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"><option>Delivery/Pickup</option><option>Purchasing / Errand</option><option>Signature Chasing</option><option>Special Service / Others</option></select></Field><Field label="Priority" hint="Helps dispatch plan the route"><select value={draft.urgency} onChange={(e) => updateDraft({ urgency: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></Field><Field label="Preferred date"><div className="relative"><CalendarDays className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><Input type="date" value={draft.date} onChange={(e) => updateDraft({ date: e.target.value })} className="h-12 rounded-xl pl-10" /></div></Field><Field label="Arrival window" hint="Slots update based on availability"><select value={draft.slot} onChange={(e) => updateDraft({ slot: e.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">{ARRIVAL_TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></Field></div>}

                {step === 2 && <div><div className="mb-5 grid gap-4 md:grid-cols-2"><LocationCard label="1 · Pickup" tone="green" location={draft.pickup} onClick={() => setMapTarget("pickup")} /><LocationCard label="2 · Destination" tone="blue" location={draft.dropoff} onClick={() => setMapTarget("dropoff")} /></div>{draft.pickup && draft.dropoff ? <RoutePreview pickup={draft.pickup} dropoff={draft.dropoff} /> : <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-6"><div className="absolute inset-0 opacity-40 [background-image:linear-gradient(#cbd5e1_1px,transparent_1px),linear-gradient(90deg,#cbd5e1_1px,transparent_1px)] [background-size:32px_32px]" /><div className="relative flex min-h-44 flex-col items-center justify-center text-center"><Route className="mb-2 h-8 w-8 text-emerald-600" /><p className="font-bold text-slate-800">Your route preview appears here</p><p className="mt-1 text-xs text-slate-500">Select both points to verify the exact pickup and delivery path.</p></div></div>}</div>}

                {step === 3 && <div className="grid gap-5 md:grid-cols-2"><Field label="Recipient name"><Input value={draft.recipient} onChange={(e) => updateDraft({ recipient: e.target.value })} placeholder="Full name" className="h-12 rounded-xl" /></Field><Field label="Recipient contact"><Input value={draft.recipientContact} onChange={(e) => updateDraft({ recipientContact: e.target.value })} placeholder="+63 9xx xxx xxxx" className="h-12 rounded-xl" /></Field><Field label="Pickup contact"><Input value={draft.pickupContact} onChange={(e) => updateDraft({ pickupContact: e.target.value })} placeholder="Name and number at pickup point" className="h-12 rounded-xl" /></Field><Field label="Instructions" hint="Optional · include entrance, floor, or landmark"><Textarea value={draft.instructions} onChange={(e) => updateDraft({ instructions: e.target.value })} placeholder="e.g. Receive at the main lobby..." className="min-h-24 rounded-xl" /></Field></div>}

                {step === 4 && <Review draft={draft} onEdit={(target) => setStep(target)} />}
                <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row"><Button variant="ghost" disabled={step === 1} onClick={() => setStep((current) => Math.max(1, current - 1) as Step)} className="rounded-xl text-slate-500"><ChevronLeft className="mr-2 h-4 w-4" />Back</Button>{step < 4 ? <Button onClick={next} className="rounded-xl bg-emerald-600 px-6 hover:bg-emerald-700">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button> : <Button onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting || !isOnline} className="rounded-xl bg-slate-900 px-6 hover:bg-slate-800"><Send className="mr-2 h-4 w-4" />{revisionRequest ? "Submit revision" : "Submit request"}</Button>}</div>
              </section>
              </div>

              <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-slate-400">Needs attention</p><h2 className="mt-1 text-lg font-black">Active requests</h2></div><Button variant="ghost" onClick={() => setActiveView("requests")} className="rounded-xl text-xs font-bold text-emerald-700">View all <ArrowRight className="ml-1 h-3 w-3" /></Button></div>{activeRequests.length ? activeRequests.slice(0, 3).map((r) => <RequestRow request={r} key={r.request_id} onCancel={() => cancelRequest(r.request_id)} onSelect={() => setActiveView("requests")} />) : <div className="rounded-2xl bg-slate-50 p-7 text-center"><Sparkles className="mx-auto mb-2 h-6 w-6 text-emerald-600" /><p className="font-bold">You are all caught up</p><p className="mt-1 text-xs text-slate-500">Your new requests will appear here.</p></div>}</div><div className="rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10"><div className="mb-8 flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500"><HelpCircle className="h-5 w-5" /></div><h2 className="text-xl font-black">Need a hand?</h2><p className="mt-2 text-sm leading-6 text-slate-300">Learn how to choose an exact pin, write clear landmarks, and follow your request.</p><Button onClick={() => setActiveView("help")} className="mt-6 rounded-xl bg-white text-slate-900 hover:bg-slate-100">Open help center <ArrowRight className="ml-2 h-4 w-4" /></Button></div></section>
            </>}
          </div>
        </main>
      </div>
      <Dialog open={mapTarget !== null} onOpenChange={(open) => { if (!open) { setMapTarget(null); setMobileDetailsOpen(false); } }}>
        <DialogContent
          className="personnel-v2-map-dialog !left-1/2 !top-1/2 !max-w-none !-translate-x-1/2 !-translate-y-1/2 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:rounded-[2rem]"
          style={{
            width: "calc(100vw - 2rem)",
            maxWidth: "1440px",
            height: "calc(100dvh - 2rem)",
            maxHeight: "900px",
          }}
        >
          <DialogTitle className="sr-only">{mapTarget === "pickup" ? "Confirm pickup point" : "Confirm destination point"}</DialogTitle>
          <div className={`personnel-v2-map-shell ${mobileDetailsOpen ? "mobile-details-open" : ""}`}>
            <MapPickerContent
              title={mapTarget === "pickup" ? "Confirm pickup point" : "Confirm destination point"}
              initialLocation={mapTarget === "pickup" ? draft.pickup || undefined : draft.dropoff || undefined}
              onLocationSelect={(location) => selectLocation(mapTarget === "pickup" ? "pickup" : "dropoff", location)}
              onClose={() => setMapTarget(null)}
              isStandalone
            />
            <button
              type="button"
              className="personnel-v2-mobile-details-toggle"
              onClick={() => setMobileDetailsOpen((open) => !open)}
            >
              {mobileDetailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {mobileDetailsOpen ? "Hide details" : "More location details"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="max-w-md rounded-3xl border-0 p-7">
          <DialogTitle className="text-xl font-black text-slate-900">{revisionRequest ? "Submit this revision?" : "Submit this request?"}</DialogTitle>
          <p className="mt-3 text-sm leading-6 text-slate-500">{revisionRequest ? "This will send the updated request back to Admin for review. The original request number stays the same." : "This will create a real delivery request and send it to the Admin Pending queue. You will have 60 seconds to cancel it after submission."}</p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm"><p className="font-bold text-slate-900">{formatLocation(draft.pickup)} <ArrowRight className="mx-1 inline h-3 w-3 text-slate-400" /> {formatLocation(draft.dropoff)}</p><p className="mt-1 text-xs text-slate-500">{draft.date} · {draft.slot} · {draft.recipient}</p></div>
          <div className="mt-6 flex gap-3"><Button variant="outline" onClick={() => setShowSubmitConfirm(false)} className="flex-1 rounded-xl">Review again</Button><Button onClick={revisionRequest ? handleSubmitRevision : handleSubmitRequest} disabled={isSubmitting} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700">{isSubmitting ? "Submitting..." : revisionRequest ? "Yes, submit revision" : "Yes, submit"}</Button></div>
        </DialogContent>
      </Dialog>
      <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-center text-[11px] text-slate-400">Personnel Portal V2 is a safe prototype. Final submission is intentionally disabled.</footer>
    </div>
  );
}

function PersonnelNotificationBell() {
  const { user } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useData();
  const [open, setOpen] = useState(false);
  const myNotifications = (Array.isArray(notifications) ? notifications : [])
    .filter((notification) => notification.user_id === user?.id)
    .slice(0, 50);
  const unreadCount = myNotifications.filter((notification) => !notification.read).length;

  return <>
    <button type="button" className="relative rounded-xl p-2.5 hover:bg-slate-100" aria-label="Notifications" onClick={() => setOpen(true)}>
      <Bell className="h-5 w-5 text-slate-500" />
      {unreadCount > 0 && <span className="absolute right-2 top-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
    </button>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="inset-x-0 bottom-0 top-auto h-[min(72dvh,36rem)] max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-none rounded-t-2xl border-l-0 border-t border-slate-100 pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:left-auto md:right-0 md:top-0 md:h-full md:max-h-none md:w-full md:max-w-sm md:rounded-none md:border-l md:border-t-0">
        <SheetHeader className="border-b border-slate-100 pr-12 text-left">
          <div className="flex items-center justify-between gap-3">
            <div><SheetTitle className="text-sm font-black uppercase tracking-widest">Notifications</SheetTitle><SheetDescription className="mt-1 text-xs text-slate-400">Updates for your requests.</SheetDescription></div>
            {unreadCount > 0 && <Button type="button" variant="ghost" className="h-8 px-2 text-[10px] font-black uppercase text-emerald-700" onClick={() => void markAllNotificationsRead()}>Mark all read</Button>}
          </div>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
          {myNotifications.length === 0 ? <div className="py-12 text-center"><Bell className="mx-auto mb-2 h-6 w-6 text-slate-200" /><p className="text-xs font-bold uppercase tracking-widest text-slate-400">All caught up</p></div> : myNotifications.map((notification) => <button type="button" key={notification.id} className={`w-full rounded-xl border p-3 text-left ${notification.read ? "border-slate-100 bg-slate-50/60" : "border-emerald-100 bg-emerald-50"}`} onClick={() => { void markNotificationRead(notification.id); setOpen(false); if (notification.request_id) window.dispatchEvent(new CustomEvent("personnel:open-request", { detail: { requestId: notification.request_id } })); }}><div className="flex items-start gap-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" /><div className="min-w-0"><p className="text-xs font-semibold text-slate-800">{notification.message}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{new Date(notification.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div></div></button>)}
        </div>
      </SheetContent>
    </Sheet>
  </>;
}

function Nav({ activeView, setActiveView }: { activeView: string; setActiveView: (view: "home" | "requests" | "help" | "preferences") => void }) {
  return <nav className="space-y-1"><p className="mb-5 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Workspace</p><NavButton icon={<Home />} label="Overview" active={activeView === "home"} onClick={() => setActiveView("home")} /><NavButton icon={<FileClock />} label="My requests" active={activeView === "requests"} onClick={() => setActiveView("requests")} /><div className="my-6 border-t border-slate-100" /><p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Support</p><NavButton icon={<HelpCircle />} label="Help center" active={activeView === "help"} onClick={() => setActiveView("help")} /><NavButton icon={<Settings />} label="Preferences" active={activeView === "preferences"} onClick={() => setActiveView("preferences")} /></nav>;
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? "bg-emerald-50 text-emerald-800" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}>{icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>}{label}</button>; }
function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="personnel-v2-metric flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-5 sm:p-5"><div className="personnel-v2-metric-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 sm:h-14 sm:w-14 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">{icon}</div><div className="min-w-0 text-left"><p className="personnel-v2-metric-value text-2xl font-black leading-none sm:text-3xl">{value}</p><p className="personnel-v2-metric-label mt-1 text-[10px] font-semibold leading-tight text-slate-500 sm:text-sm">{label}</p></div></div>; }
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-bold text-slate-800">{label}</span>{children}{hint && <span className="mt-2 block text-[11px] text-slate-400">{hint}</span>}</label>; }
function Review({ draft, onEdit }: { draft: typeof initialDraft; onEdit: (step: Step) => void }) { return <div className="space-y-4"><div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900"><Check className="mr-2 inline h-4 w-4" />Review everything before saving this prototype request.</div><ReviewRow label="Request" value={`${draft.category} · ${draft.urgency} priority · ${draft.date} · ${draft.slot}`} onClick={() => onEdit(1)} /><ReviewRow label="Route" value={`${formatLocation(draft.pickup)} → ${formatLocation(draft.dropoff)}`} onClick={() => onEdit(2)} /><ReviewRow label="Recipient" value={`${draft.recipient || "Not provided"}${draft.recipientContact ? ` · ${draft.recipientContact}` : ""}`} onClick={() => onEdit(3)} /><ReviewRow label="Instructions" value={draft.instructions || "None added"} onClick={() => onEdit(3)} /></div>; }
function ReviewRow({ label, value, onClick }: { label: string; value: string; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-start justify-between gap-4 rounded-2xl border border-slate-200 p-4 text-left hover:border-emerald-300"><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-semibold text-slate-800">{value}</p></div><span className="text-xs font-bold text-emerald-700">Edit</span></button>; }
function RequestRow({ request, onCancel, onSelect }: { request: DeliveryRequest; onCancel: (requestId: string) => void; onSelect: () => void }) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect();
    }
  };

  return <div role="button" tabIndex={0} onClick={onSelect} onKeyDown={handleKeyDown} className="personnel-v2-request-row group flex w-full cursor-pointer items-center justify-between gap-4 border-t border-slate-100 py-4 text-left transition hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset"><div className="min-w-0"><div className="mb-1 flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${request.delivery_status === "completed" ? "bg-emerald-500" : request.status === "returned_for_revision" ? "bg-amber-500" : "bg-blue-500"}`} /><p className="truncate text-sm font-bold">{request.recipient_name || "Delivery request"}</p></div><p className="truncate text-xs text-slate-500">{request.dropoff_location?.address || "Destination pending"}</p></div><div className="flex shrink-0 items-center gap-3 text-right"><div className="flex flex-col items-end gap-2">{request.status === "submitted_waiting" ? <span onClick={(event) => event.stopPropagation()}><V2CancellationTimer request={request} onCancel={onCancel} /></span> : <p className="text-xs font-bold text-slate-700">{statusLabel(request)}</p>}<p className="text-[10px] text-slate-400">#{request.request_id.slice(-6).toUpperCase()}</p></div><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" /></div></div>;
}

function V2CancellationTimer({ request, onCancel }: { request: DeliveryRequest; onCancel: (requestId: string) => void }) {
  const [secondsLeft, setSecondsLeft] = useState(() => Math.max(0, 60 - Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000)));

  useEffect(() => {
    const update = () => setSecondsLeft(Math.max(0, 60 - Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [request.created_at]);

  const handleCancel = () => {
    if (secondsLeft <= 0) return;
    if (window.confirm("Cancel this request? This action cannot be undone.")) {
      onCancel(request.request_id);
      toast.info("Request cancellation sent.");
    }
  };

  return <div className="flex items-center gap-2"><span className={`text-[10px] font-black uppercase tracking-wide ${secondsLeft > 0 ? "text-amber-600" : "text-slate-400"}`}>{secondsLeft > 0 ? `Cancel window ${secondsLeft}s` : "Cancel window ended"}</span><button type="button" disabled={secondsLeft <= 0} onClick={handleCancel} className="rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">Cancel</button></div>;
}
function RequestsPanel({ requests, openRequestId, onOpenedRequest, onCancel, onRebook, onRevise }: { requests: DeliveryRequest[]; openRequestId: string | null; onOpenedRequest: () => void; onCancel: (requestId: string) => void; onRebook: (request: DeliveryRequest, values: RebookValues) => Promise<void>; onRevise: (request: DeliveryRequest) => void }) {
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<"all" | "pending" | "revision" | "done">("all");
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [rebookingRequest, setRebookingRequest] = useState<DeliveryRequest | null>(null);
  const filteredRequests = requests.filter((request) => {
    if (filter === "pending") return String(request.status) === "pending" || String(request.status) === "submitted_waiting";
    if (filter === "revision") return request.status === "returned_for_revision";
    if (filter === "done") return request.delivery_status === "completed";
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const visibleRequests = filteredRequests.slice(start, start + pageSize);
  const paginationItems = getPaginationItems(totalPages, safePage);

  const [pageInputs, setPageInputs] = useState({ filter, count: requests.length });
  useEffect(() => {
    if (!openRequestId) return;
    const request = requests.find((item) => item.request_id === openRequestId);
    if (request) {
      setFilter("all");
      setPage(1);
      setSelectedRequest(request);
      onOpenedRequest();
    }
  }, [openRequestId, onOpenedRequest, requests]);
  if (pageInputs.filter !== filter || pageInputs.count !== requests.length) {
    setPageInputs({ filter, count: requests.length });
    setPage(1);
  }

  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-slate-400">History and tracking</p><h1 className="mt-1 text-2xl font-black">My requests</h1></div><Search className="h-5 w-5 text-slate-400" /></div>
    <div className="personnel-v2-request-filters mb-5 flex gap-2 overflow-x-auto pb-1"><RequestFilterButton label="All" count={requests.length} active={filter === "all"} onClick={() => setFilter("all")} /><RequestFilterButton label="Pending" count={requests.filter((request) => String(request.status) === "pending" || String(request.status) === "submitted_waiting").length} active={filter === "pending"} onClick={() => setFilter("pending")} /><RequestFilterButton label="Revisions" count={requests.filter((request) => request.status === "returned_for_revision").length} active={filter === "revision"} onClick={() => setFilter("revision")} /><RequestFilterButton label="Done" count={requests.filter((request) => request.delivery_status === "completed").length} active={filter === "done"} onClick={() => setFilter("done")} /></div>
    {filteredRequests.length ? <>
      <div className="mb-3 text-xs font-semibold text-slate-400">Showing {start + 1}–{Math.min(start + pageSize, filteredRequests.length)} of {filteredRequests.length} requests · Select a request for details</div>
      {visibleRequests.map((request) => <RequestRow request={request} key={request.request_id} onCancel={onCancel} onSelect={() => setSelectedRequest(request)} />)}
      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
        <Button variant="outline" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl px-2 text-xs sm:px-3"><ChevronLeft className="mr-1 h-4 w-4" /><span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span></Button>
        <span className="text-xs font-bold text-slate-500 sm:hidden">Page {safePage} of {totalPages}</span>
        <div className="hidden items-center gap-1 sm:flex">{paginationItems.map((item, index) => item === "ellipsis" ? <span key={`ellipsis-${index}`} className="px-1 text-xs font-bold text-slate-400">…</span> : <button key={item} aria-label={`Go to page ${item}`} aria-current={item === safePage ? "page" : undefined} onClick={() => setPage(item)} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold ${item === safePage ? "bg-emerald-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{item}</button>)}</div>
        <Button variant="outline" aria-label="Next page" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-xl px-2 text-xs sm:px-3"><span className="hidden sm:inline">Next</span><span className="sm:hidden">Next</span><ArrowRight className="ml-1 h-4 w-4" /></Button>
      </div>
    </> : <div className="rounded-2xl bg-slate-50 py-16 text-center text-sm text-slate-500">No requests match this filter.</div>}
    {selectedRequest && <div className="personnel-v2-request-details-overlay" role="presentation" onClick={() => setSelectedRequest(null)}><section className="personnel-v2-request-details-panel" role="dialog" aria-modal="true" aria-label="Request details" onClick={(event) => event.stopPropagation()}><button type="button" className="personnel-v2-request-details-close" aria-label="Close request details" onClick={() => setSelectedRequest(null)}><X className="h-5 w-5" /></button><RequestDetails request={selectedRequest} onRevise={() => { onRevise(selectedRequest); setSelectedRequest(null); }} onRebook={() => { setRebookingRequest(selectedRequest); setSelectedRequest(null); }} /></section></div>}
    {rebookingRequest && <RebookPanel request={rebookingRequest} onClose={() => setRebookingRequest(null)} onSubmit={async (values) => { await onRebook(rebookingRequest, values); setRebookingRequest(null); }} />}
  </section>;
}

function RequestFilterButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition ${active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700"}`}>{label} <span className={active ? "text-emerald-100" : "text-slate-400"}>({count})</span></button>; }

function RebookPanel({ request, onClose, onSubmit }: { request: DeliveryRequest; onClose: () => void; onSubmit: (values: RebookValues) => Promise<void> }) {
  const [date, setDate] = useState(request.delivery_date);
  const [slot, setSlot] = useState(request.time_window);
  const [urgency, setUrgency] = useState<UrgencyLevel>(request.urgency_level);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ date, slot, urgency });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="personnel-v2-request-details-overlay" role="presentation" onClick={onClose}><section className="personnel-v2-rebook-panel" role="dialog" aria-modal="true" aria-label="Rebook request" onClick={(event) => event.stopPropagation()}><button type="button" className="personnel-v2-request-details-close" aria-label="Close rebooking" onClick={onClose}><X className="h-5 w-5" /></button><div className="personnel-v2-rebook-body"><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700">Create a new request</p><h2 className="mt-1 text-2xl font-black text-slate-900">Rebook delivery</h2><p className="mt-1 text-sm leading-5 text-slate-500">The original request stays unchanged. Update the new schedule below.</p><div className="mt-5 rounded-2xl bg-slate-50 p-4"><p className="text-sm font-bold text-slate-800">{request.recipient_name || "Delivery request"}</p><p className="mt-1 break-words text-xs leading-5 text-slate-500">{formatLocation(request.pickup_location)} → {formatLocation(request.dropoff_location)}</p><p className="mt-2 text-[11px] font-semibold text-slate-400">Copied from #{request.request_id.slice(-6).toUpperCase()}</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="New delivery date"><Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-xl" /></Field><Field label="New time window"><select value={slot} onChange={(event) => setSlot(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500">{ARRIVAL_TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></Field><Field label="Priority"><select value={urgency} onChange={(event) => setUrgency(event.target.value as UrgencyLevel)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-emerald-500"><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></Field></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onClose} className="rounded-xl sm:px-5">Cancel</Button><Button type="button" onClick={submit} disabled={isSubmitting || !date || !slot} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 sm:px-5">{isSubmitting ? "Creating..." : "Create rebooking"}</Button></div></div></section></div>;
}


function RequestDetails({ request, onRevise, onRebook }: { request: DeliveryRequest; onRevise?: () => void; onRebook?: () => void }) {
  const isDone = request.delivery_status === "completed";
  const isRevision = request.status === "returned_for_revision";
  const canRebook = Boolean(onRebook) && (["completed", "failed", "cancelled"].includes(String(request.delivery_status || "")) || String(request.status || "") === "cancelled");
  const timeline = [
    { label: "Submitted", icon: <FileClock />, complete: true },
    { label: isRevision ? "Needs revision" : request.status === "pending" ? "Awaiting review" : "Reviewed", icon: <Clock3 />, complete: !request.status || request.status !== "pending" },
    { label: "Assigned to rider", icon: <Navigation />, complete: Boolean(request.assigned_rider_name) || request.delivery_status === "in_progress" || isDone },
    { label: "In progress", icon: <Route />, complete: request.delivery_status === "in_progress" || isDone },
    { label: "Done", icon: <PackageCheck />, complete: isDone },
  ];

  return (
    <div className="personnel-v2-request-details-body max-h-[min(88dvh,760px)] overflow-y-auto p-6 sm:p-8">
      <div className="personnel-v2-request-details-header mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700">Request details</p>
          <h2 className="mt-1 truncate text-2xl font-black text-slate-900">{request.recipient_name || "Delivery request"}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">#{request.request_id.slice(-6).toUpperCase()}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${isDone ? "bg-emerald-100 text-emerald-800" : isRevision ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>{statusLabel(request)}</span>
      </div>
      {isRevision && request.admin_remark && (
        <div className="personnel-v2-revision-callout mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.17em] text-amber-700">Changes requested by Admin</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-amber-950">{request.admin_remark}</p>
        </div>
      )}
      <div className="personnel-v2-request-route-layout">
        <div className="personnel-v2-request-summary">
          <DetailItem icon={<Route />} label="Route" value={`${formatLocation(request.pickup_location)} to ${formatLocation(request.dropoff_location)}`} />
          <div className="personnel-v2-detail-addresses">
            <DetailItem icon={<MapPin />} label="Pickup address" value={request.pickup_location?.address || "Not provided"} />
            <DetailItem icon={<MapPin />} label="Destination address" value={request.dropoff_location?.address || "Not provided"} />
          </div>
          <div className="personnel-v2-detail-meta">
            <DetailItem icon={<CalendarDays />} label="Schedule" value={`${request.delivery_date} · ${request.time_window}`} />
            <DetailItem icon={<Clock3 />} label="Submitted" value={formatRequestDate(request.created_at)} />
            {request.completed_at && <DetailItem icon={<Check />} label="Completed" value={formatRequestDate(request.completed_at)} />}
          </div>
        </div>
        {request.assigned_rider_name && (
          <div className="personnel-v2-assigned-rider rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.17em] text-slate-400">Assigned rider</p>
            <p className="mt-1 font-bold text-slate-800">{request.assigned_rider_name}</p>
          </div>
        )}
      </div>
      <div className="personnel-v2-request-timeline mt-7">
        <p className="mb-4 text-xs font-black uppercase tracking-[0.17em] text-slate-400">Status timeline</p>
        <div className="personnel-v2-status-timeline">
          {timeline.map((item, index) => (
            <div className="personnel-v2-status-step" key={item.label}>
              <span className={`personnel-v2-status-node ${item.complete ? "is-complete" : ""}`}>{item.icon}</span>
              <span className={`personnel-v2-status-label ${item.complete ? "is-complete" : ""}`}>{item.label}</span>
              {index < timeline.length - 1 && <span className={`personnel-v2-status-connector ${timeline[index + 1].complete ? "is-complete" : ""}`} />}
            </div>
          ))}
        </div>
      </div>
      {(request.personnel_instructions || request.admin_remark || request.rider_remark) && (
        <div className="personnel-v2-request-notes mt-7">
          <p className="text-xs font-black uppercase tracking-[0.17em] text-slate-400">Notes</p>
          <div className="personnel-v2-notes-grid">
            {request.personnel_instructions && <DetailNote label="Instructions" value={request.personnel_instructions} />}
            {request.admin_remark && <DetailNote label="Admin remark" value={request.admin_remark} />}
            {request.rider_remark && <DetailNote label="Rider remark" value={request.rider_remark} />}
          </div>
        </div>
      )}
      {isRevision && onRevise && (
        <div className="personnel-v2-revision-action mt-7 border-t border-amber-100 pt-5">
          <Button type="button" onClick={onRevise} className="w-full rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400">
            <RefreshCw className="mr-2 h-4 w-4" />
            Revise this request
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400">Opens the Quick Request Wizard with the current details prefilled.</p>
        </div>
      )}
      {canRebook && (
        <div className="personnel-v2-rebook-action mt-7 border-t border-slate-100 pt-5">
          <Button type="button" onClick={onRebook} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
            <RefreshCw className="mr-2 h-4 w-4" />
            Rebook this request
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-400">Creates a new request and keeps this record unchanged.</p>
        </div>
      )}
    </div>
  );
}


function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="personnel-v2-detail-item min-w-0 rounded-2xl bg-slate-50 p-4"><div className="mb-2 flex items-center gap-2 text-emerald-700 [&>svg]:h-4 [&>svg]:w-4">{icon}<span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span></div><p className="break-words text-sm font-semibold leading-5 text-slate-800">{value}</p></div>; }
function DetailNote({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-5 text-slate-700">{value}</p></div>; }
function formatRequestDate(value?: string) { if (!value) return "Not available"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
function HelpPanel() { return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10"><p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700">Guided support</p><h1 className="mt-2 text-3xl font-black">Help center</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Simple guidance for filing a request that a rider can complete without calling back for clarification.</p><div className="mt-8 grid gap-4 md:grid-cols-3"><HelpCard icon={<MapPin />} title="Choose an exact pin" text="Place the pin at the entrance, lobby, gate, or loading area—not only the building name." /><HelpCard icon={<Copy />} title="Write useful landmarks" text="Add floor, unit, entrance, and a nearby landmark that is visible to the rider." /><HelpCard icon={<RefreshCw />} title="Follow the timeline" text="Every status change appears in your request timeline so you know what happens next." /></div></section>; }
function PreferencesPanel({ onInstall, canInstall, onLogout, fetchWithAuth }: { onInstall: () => void; canInstall: boolean; onLogout: () => void; fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response | null> }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
    <p className="text-xs font-bold uppercase tracking-[0.17em] text-emerald-700">Workspace settings</p>
    <h1 className="mt-2 text-3xl font-black">Preferences</h1>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Manage how the Personnel Portal is accessed on your device.</p>
    <div className="mt-8 max-w-2xl rounded-2xl border border-slate-200 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-sm"><Download className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">Install app</h2><p className="mt-1 text-sm leading-5 text-slate-500">Add the Personnel Portal to your home screen for faster access and a standalone app experience.</p><Button onClick={onInstall} className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700">{canInstall ? "Install app" : "Show install options"}</Button></div>
      </div>
    </div>
    <div className="mt-6 max-w-2xl"><WebPushSettings fetchWithAuth={fetchWithAuth} /></div>
    <div className="mt-6 max-w-2xl border-t border-slate-100 pt-6"><h2 className="font-bold text-slate-900">Account</h2><p className="mt-1 text-sm leading-5 text-slate-500">Sign out of the Personnel Portal on this device.</p><Button variant="outline" onClick={onLogout} className="mt-4 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700">Sign out</Button></div>
  </section>;
}
function HelpCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-2xl bg-slate-50 p-5"><div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm [&>svg]:h-4 [&>svg]:w-4">{icon}</div><h3 className="font-bold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div>; }
