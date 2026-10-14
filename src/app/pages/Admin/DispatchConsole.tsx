import { useState, useMemo, useEffect, useCallback } from "react";
import { useData as useGlobalData } from "../../context/DataContext";
import { useRealTime } from "../../context/RealTimeContext";
import { type User as UserType, DeliveryRequest } from "../../types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  Search,
  RefreshCw,
  LayoutDashboard,
  Loader2,
  CheckCheck,
  RotateCcw,
  X,
  Ban,
  Bike as BikeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { RequestList } from "../../components/Admin/Dispatch/RequestList";
import { RequestCard } from "../../components/Admin/Dispatch/RequestCard";
import { RequestDetailsPanel } from "../../components/Admin/Dispatch/RequestDetailsPanel";
import { cn } from "../../components/ui/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../../components/ui/resizable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { LiveTrackingMap } from "../../components/LiveTrackingMap";

import { NotificationBell } from "../../components/Admin/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";

import { isActiveRequest } from "../../utils/statusMapping";
import { buildRequestAccounting, getAccountingBucket } from '../../utils/requestAccounting';
import { resolveRiderOnlineState } from '../../utils/riderAvailability';

import { EnhancedBatchApproveModal } from "../../components/Admin/EnhancedBatchApproveModal";
import { compareRiderQueue } from "../../utils/dispatchQueue";
import { getActiveRouteSelection, isRouteReorderableTask, toggleActiveRouteSelection as toggleRouteSelection } from "../../utils/activeRouteSelection";
import { DeviationApprovalModal } from "../../components/Admin/DeviationApprovalModal";
import { DispatchStatusTabs } from "./DispatchStatusTabs";

function useMediaQuery(query: string) {
  const getMatches = () => typeof window !== "undefined" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, [query]);

  return matches;
}

export function DispatchConsole({ openRequestId, onOpenRequest, onRequestOpened }: { openRequestId?: string; onOpenRequest?: (requestId: string) => void; onRequestOpened?: (requestId: string) => void }) {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const {
    requests,
    approveRequest,
    disapproveRequest,
    returnForRevision,
    refreshData, requestsLoading, requestsError,
    fetchWithAuth,
  } = useGlobalData();

  const { riderLocations, riderPresence, socket } = useRealTime();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null,
  );
  const [isMobileDetailsOpen, setIsMobileDetailsOpen] = useState(false);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingRequest] =
    useState<DeliveryRequest | null>(null);
  const [filterTab, setFilterTab] = useState<
    "pending" | "active" | "overdue" | "completed" | "all"
  >("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [riders, setRiders] = useState<UserType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState("day-of-week");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [activeSelectedIds, setActiveSelectedIds] = useState<string[]>([]);
  const [activeSelectionMode, setActiveSelectionMode] = useState(false);
  const [activeSelectionMessage, setActiveSelectionMessage] = useState("");

  const activeRouteSelection = useMemo(
    () => getActiveRouteSelection(requests || [], activeSelectedIds),
    [requests, activeSelectedIds],
  );

  useEffect(() => {
    setActiveSelectedIds((current) => current.filter((id) =>
      (requests || []).some((request) => request.request_id === id && isRouteReorderableTask(request)),
    ));
  }, [requests]);

  useEffect(() => {
    if (!openRequestId || !requests?.some((request) => request.request_id === openRequestId)) return;
    setFilterTab('all');
    setSelectedRequestId(openRequestId);
    setIsMobileDetailsOpen(true);
    onRequestOpened?.(openRequestId);
  }, [onRequestOpened, openRequestId, requests]);

  // Batch State
  const [showBatchApprove, setShowBatchApprove] = useState(false);
  const [showBatchReject, setShowBatchReject] = useState(false);
  const [batchRejectType, setBatchRejectType] = useState<"return" | "cancel">("return");
  const [batchNote, setBatchNote] = useState("");

  // Deviation State
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [deviationData, setDeviationData] = useState<any>(null);

  // Intercept State
  const [interceptData, setInterceptData] = useState<{
    riderId: string;
    requests: DeliveryRequest[];
    note: string;
    mode: 'route-review';
  } | null>(null);

  const onlineRiderCount = useMemo(() => {
    const onlineIds = new Set<string>();
    
    // 1. Check socket-based presence
    Object.entries(riderPresence || {}).forEach(([id, status]) => {
      if (status === "online") onlineIds.add(id);
    });

    // 2. Check database-based status from the riders list (fetched on mount)
    riders.forEach(r => {
      if ((r as any).is_online) onlineIds.add(r.id);
    });

    return onlineIds.size;
  }, [riderPresence, riders]);

  // Fetch riders function
  const fetchRiders = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/users/riders/live");
      if (res?.ok) {
        const data = await res.json();
        setRiders(data);
      }
    } catch (err) {
      console.error("Failed to load riders", err);
    }
  }, [fetchWithAuth]);

  // Fetch riders on mount
  useEffect(() => {
    let active = true;
    fetchWithAuth("/api/users/riders/live")
      .then(async res => {
        if (!active || !res) return;
        if (res.ok) {
          const data = await res.json();
          if (active) setRiders(data);
        }
      })
      .catch(err => { if (active) console.error("Failed to load riders", err); });
    return () => { active = false; };
  }, [fetchWithAuth]);

  // Reactive Riders List: Merge DB data with live socket presence
  const reactiveRiders = useMemo(() => {
    return riders.map(r => ({
      ...r,
      is_online: resolveRiderOnlineState(riderPresence[r.id], (r as any).is_online)
    }));
  }, [riders, riderPresence]);

  // Listen for real-time attendance/duty/status changes to refresh the riders list
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('🔄 DispatchConsole: Real-time rider status update detected, refreshing list...');
      fetchRiders();
    };

    socket.on('rider-status-updated', handleUpdate);
    
    socket.on('notification-added', (notif: any) => {
      // Refresh if it's an attendance or duty related notification
      if (notif.type === 'info' || notif.type === 'warning') {
        handleUpdate();
      }

      // LAYER 2: Catch Deviation Requests
      if (notif.type === 'deviation_requested') {
        setDeviationData(notif.metadata);
        setShowDeviationModal(true);
        toast.warning(`SEQUENCE DEVIATION: ${notif.message}`, {
          duration: 10000,
          action: {
            label: "Review Proof",
            onClick: () => setShowDeviationModal(true)
          }
        });
      }
    });

    return () => {
      socket.off('rider-status-updated', handleUpdate);
      socket.off('notification-added');
    };
  }, [socket, fetchRiders]);

  const handleBatchApprove = async (riderId: string, sequence: string[], note: string, overrideTaskIds?: string[]) => {
    setIsSubmitting(true);
    const taskIds = overrideTaskIds || selectedRequestIds;
    try {
      const res = await fetch("/api/requests/mass-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds,
          action: 'approve',
          value: riderId,
          sequence,
          note
        }),
      });

      if (!res.ok) throw new Error("Failed to process batch");

      toast.success(`Successfully enforced sequence and assigned ${taskIds.length} tasks`);
      setSelectedRequestIds([]);
      setShowBatchApprove(false);
      refreshData();
    } catch (err) {
      toast.error("Batch assignment failed");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterceptConfirm = async (riderId: string, sequence: string[], note: string) => {
    if (interceptData?.mode === 'route-review') {
      await handleActiveResequence(riderId, sequence, note);
    }
  };

  const handleActiveResequence = async (riderId: string, sequence: string[], note: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/requests/resequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riderId,
          sequence,
          note: note || "Route re-ordered by Admin"
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409 || body.code === 'QUEUE_CHANGED') {
          await refreshData();
          toast.info("The rider’s queue changed. Review the refreshed route and try again.");
          return;
        }
        throw new Error("Resequence failed");
      }

      toast.success("Route optimized and synchronized");
      setInterceptData(null);
      setSelectedRequestIds([]);
      setActiveSelectedIds([]);
      setActiveSelectionMode(false);
      setActiveSelectionMessage("");
      refreshData();
    } catch (err) {
      toast.error("Failed to update active route");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveDeviation = async (approved: boolean, note: string) => {
    try {
      const res = await fetch(`/api/requests/${deviationData.requestId}/deviation-resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, note })
      });
      if (res.ok) {
        refreshData();
        setShowDeviationModal(false);
      }
    } catch (e) {
      console.error("Deviation resolution failed", e);
    }
  };

  const handleBatchReject = async () => {
    setIsSubmitting(true);
    try {
      if (batchRejectType === "return") {
        await Promise.all(
          selectedRequestIds.map((id) => returnForRevision(id, batchNote)),
        );
        toast.success(`Returned ${selectedRequestIds.length} requests for revision`);
      } else {
        await Promise.all(
          selectedRequestIds.map((id) => disapproveRequest(id, batchNote)),
        );
        toast.error(`Declined ${selectedRequestIds.length} requests`);
      }

      setSelectedRequestIds([]);
      setShowBatchReject(false);
      setBatchNote("");
    } catch (err) {
      toast.error("Action failed for some requests");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleActiveSelection = (id: string) => {
    const nextSelection = toggleRouteSelection(requests || [], activeSelectedIds, id);
    if (nextSelection.blocked) {
      setActiveSelectionMessage("Select tasks for one rider at a time.");
      return;
    }
    setActiveSelectionMessage("");
    setActiveSelectedIds(nextSelection.selectedIds);
  };

  const clearActiveSelection = () => {
    setActiveSelectedIds([]);
    setActiveSelectionMessage("");
  };

  const openSelectedRoute = () => {
    if (!activeRouteSelection) return;
    setInterceptData({
      riderId: activeRouteSelection.riderId,
      requests: activeRouteSelection.requests,
      note: "",
      mode: 'route-review',
    });
    setActiveSelectionMode(false);
  };

  const renderActiveRouteActions = () => {
    if (activeSelectedIds.length === 0 && !activeSelectionMessage) return null;

    return (
      <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-3 py-2 text-white">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold" aria-live="polite">
            {activeSelectedIds.length} task{activeSelectedIds.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={openSelectedRoute}
              disabled={!activeRouteSelection}
              className="min-h-11 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 md:min-h-8"
            >
              Manage route
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearActiveSelection}
              className="min-h-11 rounded-lg px-3 text-xs font-semibold text-white hover:bg-slate-700 md:min-h-8"
            >
              Clear
            </Button>
          </div>
        </div>
        {activeSelectionMessage && (
          <p role="status" className="mt-1 text-xs text-amber-200">{activeSelectionMessage}</p>
        )}
      </div>
    );
  };

  const filteredRequests = useMemo(() => {
    if (!requests) return [];

    let filtered = requests.filter((r) => {
      const bucket = getAccountingBucket(r);
      if (filterTab === "pending") return bucket === 'pending';
      if (filterTab === "overdue") return bucket === 'active' && Boolean(r.is_overdue);
      if (filterTab === "active") return bucket === 'active';
      if (filterTab === "completed") return ['completed', 'failed', 'cancelled', 'declined'].includes(bucket);
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.request_id.toLowerCase().includes(q) ||
          (r.recipient_name || '').toLowerCase().includes(q) ||
          (r.requester_name || '').toLowerCase().includes(q),
      );
    }

    const getUrgencyScore = (urgency: string = 'Medium') => {
      const scores: Record<string, number> = {
        'Urgent': 0,
        'High': 1,
        'Medium': 2,
        'Low': 3
      };
      return scores[urgency] ?? 2;
    };

    return filtered.sort((a, b) => {
      if (sortBy === 'sequence' && (filterTab === 'active' || filterTab === 'overdue')) {
        return compareRiderQueue(a, b);
      }

      if (sortBy === "day-of-week") {
        // For Active tab: follow enforced sequence (queue_order) first
        if (filterTab === 'active') {
          const riderA = a.assigned_rider_id || 'unassigned';
          const riderB = b.assigned_rider_id || 'unassigned';
          if (riderA !== riderB) return riderA.localeCompare(riderB);

          // ENFORCE: Global Sequence Position must override Date for optimized routes
          const orderA = a.queue_order && a.queue_order > 0 ? a.queue_order : 999;
          const orderB = b.queue_order && b.queue_order > 0 ? b.queue_order : 999;
          
          if (orderA !== orderB) return orderA - orderB;
        }

        // Standard date sorting for everything else (or fallback)
        const getDayIndex = (dateStr: string) => {
          const date = new Date(dateStr);
          const day = date.getDay(); // 0 = Sun
          return day === 0 ? 7 : day; // Mon=1, ..., Sun=7
        };
        const dayA = getDayIndex(a.delivery_date);
        const dayB = getDayIndex(b.delivery_date);
        if (dayA !== dayB) return dayA - dayB;

        // Secondary sort by time window
        return (a.time_window || '').localeCompare(b.time_window || '');
      }

      if (filterTab === 'overdue' && !['urgency', 'newest', 'oldest'].includes(sortBy)) {
        const overdueA = a.overdue_minutes || 0;
        const overdueB = b.overdue_minutes || 0;
        if (overdueA !== overdueB) return overdueB - overdueA;
        return getUrgencyScore(a.urgency_level) - getUrgencyScore(b.urgency_level);
      }

      if (sortBy === "urgency") {
        return getUrgencyScore(a.urgency_level) - getUrgencyScore(b.urgency_level);
      }

      const dateA = filterTab === "pending" ? a.created_at : a.updated_at || a.created_at;
      const dateB = filterTab === "pending" ? b.created_at : b.updated_at || b.created_at;

      if (sortBy === "newest")
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      if (sortBy === "oldest")
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      return 0;
    });
  }, [requests, filterTab, searchQuery, sortBy]);

  const selectAll = () => {
    if (selectedRequestIds.length === filteredRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(filteredRequests.map((r) => r.request_id));
    }
  };

  const handleFilterChange = (newTab: "pending" | "active" | "overdue" | "completed" | "all") => {
    setFilterTab(newTab);
    setSelectedRequestId(null);
    if (newTab === 'completed') {
      setSortBy('newest');
    } else if (newTab === 'active' || newTab === 'overdue') {
      setSortBy('sequence');
    } else {
      setSortBy('day-of-week');
    }
    setSelectedRequestIds([]);
    clearActiveSelection();
    setActiveSelectionMode(false);
  };



  const selectedRequest = useMemo(
    () => requests?.find((r) => r.request_id === selectedRequestId) || null,
    [requests, selectedRequestId],
  );

  const stats = useMemo(() => buildRequestAccounting(requests), [requests]);
  const displayStats = stats;

  const handleRefresh = async (showToast = true) => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
    if (showToast) {
      toast.info("Refresh finished. Check the reconciliation status for data verification.");
    }
  };

  const renderRequestDetails = (mobile = false) => (
    <RequestDetailsPanel
      request={selectedRequest}
      riders={reactiveRiders}
      activeRequests={requests || []}
      onBack={mobile ? () => setSelectedRequestId(null) : undefined}
      hideMapOnMobile={mobile}
      mobileLayout={mobile}
      onManageRoute={(riderId) => {
        const activeTasks = (requests || []).filter(r =>
          r.assigned_rider_id === riderId &&
          isActiveRequest(r)
        );
        if (activeTasks.length > 0) {
          setInterceptData({
            riderId,
            requests: activeTasks,
            note: "",
            mode: 'route-review'
          });
        } else {
          toast.info("Rider has no active tasks to re-sequence.");
        }
      }}
      onApprove={async (riderId, remark) => {
        if (!selectedRequest) return;
        setIsSubmitting(true);
        try {
          await approveRequest(selectedRequest.request_id, riderId, remark);
          toast.success("Request approved and assigned");
          setSelectedRequestIds([]);
          refreshData();
        } catch (err) {
          toast.error("Failed to approve request");
        } finally {
          setIsSubmitting(false);
        }
      }}
      onDecline={async (remark) => {
        setIsSubmitting(true);
        try {
          await disapproveRequest(selectedRequestId!, remark);
          toast.error("Request declined");
          setSelectedRequestIds([]);
          refreshData();
        } catch (err) {
          toast.error("Failed to decline request");
        } finally {
          setIsSubmitting(false);
        }
      }}
      isSubmitting={isSubmitting}
      readOnly={Boolean(selectedRequest && !['pending', 'active'].includes(getAccountingBucket(selectedRequest)))}
    />
  );

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="hidden md:flex shrink-0 h-12 bg-white border-b border-slate-100 items-center justify-between px-4 z-30">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-md bg-pink-50 flex items-center justify-center">
                <LayoutDashboard size={14} className="text-pink-500" />
              </div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">
                Dispatch Console
              </h1>
            </div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-7.5 leading-none mt-0.5">
              Real-time Logistics
            </p>
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3 w-3 transition-colors group-focus-within:text-pink-500" />
              <Input
                placeholder="Search..."
                className="w-[220px] h-7 bg-slate-50 border-slate-100 pl-8 rounded-lg font-bold text-[10px] focus:bg-white transition-all shadow-none focus:ring-1 focus:ring-pink-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing}
            className="h-7 w-7 rounded-lg hover:bg-slate-50 transition-all border-none"
          >
            <RefreshCw
              size={13}
              className={cn("text-slate-500", isRefreshing && "animate-spin")}
            />
          </Button>

          <div className="bg-slate-900 text-white px-2.5 h-7 rounded-lg flex items-center gap-1.5 mr-1">
            <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8px] font-black uppercase tracking-widest">
              {onlineRiderCount} Active Riders
            </span>
          </div>

          <NotificationBell onOpenRequest={onOpenRequest} />
        </div>
      </div>

      {/* Main Console Layout */}
      {requestsLoading && <p role="status" className="shrink-0 px-4 py-2 text-sm text-slate-600">Refreshing requests…</p>}
      {requestsError && <p role="alert" className="shrink-0 px-4 py-2 text-sm text-red-700">{requestsError} <button onClick={() => void handleRefresh(false)} className="underline">Retry</button></p>}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!isMobile && <div className="h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col bg-white">
              {/* Batch Actions Bar */}
              {selectedRequestIds.length > 0 && filterTab === "pending" && (
                <div className="shrink-0 p-2 bg-slate-900 border-b border-slate-800 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCheck className="text-white h-3 w-3" />
                      <p className="text-[9px] font-black text-white uppercase tracking-widest">
                        {selectedRequestIds.length}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setBatchRejectType("return");
                          setShowBatchReject(true);
                        }}
                        className="h-6 px-2 rounded-md text-white hover:bg-pink-500 focus-visible:bg-pink-500 active:bg-pink-600 text-[8px] font-black uppercase tracking-widest"
                      >
                        Revision
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setShowBatchApprove(true)}
                        className="h-6 px-3 rounded-md border border-transparent bg-transparent text-white hover:bg-pink-500 hover:border-pink-500 focus-visible:bg-pink-500 focus-visible:border-pink-500 active:bg-pink-600 text-[8px] font-black uppercase tracking-widest"
                      >
                        Approve & Enforce
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setBatchRejectType("cancel");
                          setShowBatchReject(true);
                        }}
                        className="h-6 px-2 rounded-md text-rose-400 hover:bg-pink-500 hover:text-white focus-visible:bg-pink-500 focus-visible:text-white active:bg-pink-600 text-[8px] font-black uppercase tracking-widest"
                      >
                        Batch Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {filterTab === "active" && renderActiveRouteActions()}

              <RequestList
                requests={requests}
                filteredRequests={filteredRequests}
                selectedId={selectedRequestId}
                onSelect={(id) => setSelectedRequestId(id)}
                selectedIds={filterTab === "active" ? activeSelectedIds : selectedRequestIds}
                onToggleSelect={filterTab === "active" ? toggleActiveSelection : toggleSelection}
                activeSelectionEnabled={filterTab === "active" && (!isMobile || activeSelectionMode)}
                onSelectAll={selectAll}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filter={filterTab}
                onFilterChange={handleFilterChange} counts={displayStats}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-0.5 bg-transparent hover:bg-slate-200 transition-colors" />

          <ResizablePanel defaultSize={70}>
            <div className="h-full bg-slate-50/30 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedRequestId || "empty"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="h-full"
                >
                  {renderRequestDetails()}
                </motion.div>
              </AnimatePresence>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        </div>}

        {/* Mobile flow: AdminLayout provides the mobile header, followed by tabs, cards, and details. */}
        {isMobile && <div className="h-full min-h-0 overflow-hidden bg-slate-50/50">
          <div className="h-full min-h-0 flex flex-col">
                <div className="h-full min-h-0 flex flex-col bg-slate-50/50">
                  <div className="shrink-0 px-3 pt-3 pb-2 bg-white border-b border-slate-100">
                    <DispatchStatusTabs
                      selected={filterTab}
                      counts={{
                        all: stats.total,
                        pending: stats.pending,
                        active: stats.active,
                        overdue: displayStats.overdue,
                        completed: stats.done,
                      }}
                      onChange={handleFilterChange}
                    />
                    <div className="mt-2 flex items-center justify-between px-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Scroll to browse requests
                      </p>
                      {filterTab === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          aria-pressed={activeSelectionMode}
                          onClick={() => {
                            if (activeSelectionMode) clearActiveSelection();
                            setActiveSelectionMode((enabled) => !enabled);
                          }}
                          className="min-h-11 rounded-lg px-3 text-xs font-bold focus-visible:ring-2 focus-visible:ring-emerald-600"
                        >
                          {activeSelectionMode ? "Done selecting" : "Select tasks"}
                        </Button>
                      )}
                      <span className="text-[9px] font-bold text-slate-300">
                        {filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {filterTab === "active" && renderActiveRouteActions()}

                  {selectedRequestIds.length > 0 && filterTab === "pending" && (
                    <div className="shrink-0 px-3 py-2 bg-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCheck className="text-white h-3 w-3" />
                          <p className="text-[9px] font-black text-white uppercase tracking-widest">
                            {selectedRequestIds.length} selected
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setBatchRejectType("return");
                              setShowBatchReject(true);
                            }}
                            aria-label="Revision"
                            title="Revision"
                            className="group h-8 w-8 rounded-md p-0 text-white hover:bg-pink-500 focus-visible:bg-pink-500 active:bg-pink-600 text-[8px] font-black uppercase tracking-widest"
                          >
                            <RotateCcw className="h-4 w-4 fill-transparent transition-colors group-hover:fill-current group-focus-visible:fill-current group-active:fill-current" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setShowBatchApprove(true)}
                            aria-label="Approve and Enforce"
                            title="Approve and Enforce"
                            className="group h-8 w-8 rounded-md border border-transparent bg-transparent p-0 text-white hover:bg-pink-500 hover:border-pink-500 focus-visible:bg-pink-500 focus-visible:border-pink-500 active:bg-pink-600 text-[8px] font-black uppercase tracking-widest"
                          >
                            <CheckCheck className="h-4 w-4 fill-transparent transition-colors group-hover:fill-current group-focus-visible:fill-current group-active:fill-current" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setBatchRejectType("cancel");
                              setShowBatchReject(true);
                            }}
                            aria-label="Batch Cancel"
                            title="Batch Cancel"
                            className="group h-8 w-8 rounded-md text-rose-300 hover:bg-pink-500 hover:text-white focus-visible:bg-pink-500 focus-visible:text-white active:bg-pink-600 text-[8px] font-black uppercase tracking-widest"
                          >
                            <Ban className="h-4 w-4 fill-transparent transition-colors group-hover:fill-current group-focus-visible:fill-current group-active:fill-current" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3">
                    {filteredRequests.length === 0 ? (
                      <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                          <LayoutDashboard className="h-5 w-5 text-slate-200" />
                        </div>
                        <p className="text-sm font-black text-slate-400">No {filterTab === "completed" ? "done" : filterTab} requests</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-300">New requests will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredRequests.map((request) => (
                          <div key={request.request_id}>
                            <RequestCard
                              request={request}
                              className="max-w-none"
                              isSelected={selectedRequestId === request.request_id}
                              onClick={() => {
                                setSelectedRequestId(request.request_id);
                                setIsMobileDetailsOpen(true);
                              }}
                              isMultiSelected={filterTab === "active"
                                ? activeSelectedIds.includes(request.request_id)
                                : selectedRequestIds.includes(request.request_id)}
                              onToggleSelection={filterTab === "pending"
                                ? toggleSelection
                                : filterTab === "active" && activeSelectionMode && isRouteReorderableTask(request)
                                  ? toggleActiveSelection
                                  : undefined}
                              isActiveTab={filterTab === "active" || filterTab === "overdue"}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
        </div>}
      </div>

      <Dialog
        open={isMobile && isMobileDetailsOpen && Boolean(selectedRequest)}
        onOpenChange={(open) => {
          setIsMobileDetailsOpen(open);
          if (!open) setSelectedRequestId(null);
        }}
      >
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 pb-[env(safe-area-inset-bottom)] sm:h-[min(92dvh,760px)] sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-2xl sm:border sm:p-0 sm:pb-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Request details</DialogTitle>
            <DialogDescription>
              Review and manage the selected delivery request.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {selectedRequest && renderRequestDetails(true)}
          </div>
        </DialogContent>
      </Dialog>

      {/* Layer 2 Modals */}
      <EnhancedBatchApproveModal
        isOpen={showBatchApprove}
        onClose={() => setShowBatchApprove(false)}
        selectedRequests={requests.filter(r => selectedRequestIds.includes(r.request_id))}
        riders={reactiveRiders}
        onConfirm={handleBatchApprove}
        isSubmitting={isSubmitting}
      />

      {/* Optional route review uses the existing rider and never asks for a second assignment. */}
      <EnhancedBatchApproveModal
        isOpen={!!interceptData}
        onClose={() => {
          setInterceptData(null);
          clearActiveSelection();
          setActiveSelectionMode(false);
        }}
        selectedRequests={interceptData?.requests || []}
        riders={reactiveRiders}
        onConfirm={handleInterceptConfirm}
        isSubmitting={isSubmitting}
        mode="route-review"
        fixedRiderId={interceptData?.riderId}
      />

      {deviationData && (
        <DeviationApprovalModal
          isOpen={showDeviationModal}
          onClose={() => setShowDeviationModal(false)}
          deviationData={deviationData}
          onResolve={handleResolveDeviation}
        />
      )}

      {/* Batch Reject/Return Dialog */}
      <Dialog open={showBatchReject} onOpenChange={setShowBatchReject}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  batchRejectType === "return" ? "bg-indigo-50" : "bg-rose-50",
                )}
              >
                {batchRejectType === "return" ? (
                  <RotateCcw className="text-indigo-500 h-5 w-5" />
                ) : (
                  <Ban className="text-rose-500 h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-[900] text-slate-900 tracking-tight">
                  Batch {batchRejectType === "return" ? "Revision" : "Decline"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Processing {selectedRequestIds.length} requests
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Note to Requesters
              </Label>
              <Textarea
                placeholder="Explain your decision..."
                className="rounded-xl border-slate-100 bg-slate-50 font-bold text-xs min-h-[80px] resize-none p-3 shadow-none focus-visible:ring-0"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowBatchReject(false);
                setBatchNote("");
              }}
              className="rounded-xl h-11 px-6 font-black uppercase tracking-widest text-[9px] text-slate-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBatchReject}
              disabled={isSubmitting || !batchNote}
              className={cn(
                "flex-1 h-11 rounded-xl text-white font-black uppercase tracking-widest text-[9px] shadow-lg transition-all active:scale-95",
                batchRejectType === "return"
                  ? "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/10"
                  : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/10",
              )}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              Confirm {batchRejectType === "return" ? "Revision" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GLOBAL LIVE TRACKING MODAL */}
      <Dialog open={isTrackingModalOpen} onOpenChange={setIsTrackingModalOpen}>
        <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] p-0 overflow-hidden border-none bg-white rounded-[2.5rem] shadow-2xl">
          <div className="h-full flex flex-col">
            {/* Modal Header */}
            <div className="shrink-0 px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10">
                  <BikeIcon size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-[900] text-slate-900 tracking-tight flex items-center gap-3">
                    {trackingRequest?.assigned_rider_name || "Rider Location"}
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100 animate-pulse">
                      Live
                    </span>
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    {trackingRequest?.request_id === "IDLE"
                      ? "Offline / Waiting for Job"
                      : `Transaction: #${trackingRequest?.request_id.slice(-8).toUpperCase()}`}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsTrackingModalOpen(false)}
                className="rounded-full hover:bg-slate-50 h-10 w-10"
              >
                <X size={20} className="text-slate-400" />
              </Button>
            </div>

            {/* Modal Map Body */}
            <div className="flex-1 relative bg-slate-50">
              {trackingRequest && (
                <LiveTrackingMap
                  requestId={trackingRequest.request_id}
                  pickup={trackingRequest.pickup_location}
                  dropoff={trackingRequest.dropoff_location}
                  current={
                    trackingRequest.assigned_rider_id && riderLocations[trackingRequest.assigned_rider_id]
                      ? {
                          lat: Number(riderLocations[trackingRequest.assigned_rider_id].lat),
                          lng: Number(riderLocations[trackingRequest.assigned_rider_id].lng),
                        }
                      : trackingRequest.current_lat && trackingRequest.current_lng
                      ? {
                          lat: Number(trackingRequest.current_lat),
                          lng: Number(trackingRequest.current_lng),
                        }
                      : null
                  }
                  riderName={trackingRequest.assigned_rider_name}
                  status={trackingRequest.delivery_status}
                  timeWindow={trackingRequest.time_window}
                  hideSearch={false}
                  containerClassName="h-full w-full rounded-none border-none shadow-none"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
