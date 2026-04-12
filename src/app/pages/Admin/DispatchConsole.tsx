import React, { useState, useMemo, useEffect } from "react";
import { useData as useGlobalData } from "../../context/DataContext";
import { type User as UserType, DeliveryRequest } from "../../types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";
import { 
  Search, 
  RefreshCw, 
  LayoutDashboard, 
  Loader2, 
  CheckCheck, 
  RotateCcw, 
  X, 
  User, 
  AlertCircle, 
  Ban,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  Bike as BikeIcon
} from "lucide-react";
import { toast } from "sonner";
import { RequestList } from "../../components/Admin/Dispatch/RequestList";
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
  DialogFooter
} from "../../components/ui/dialog";
import { LiveTrackingMap } from "../../components/LiveTrackingMap";

export function DispatchConsole() {
  const { 
    requests, 
    riderLocations,
    approveRequest, 
    disapproveRequest,
    returnForRevision,
    cancelRequest, 
    refreshData
  } = useGlobalData();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);
  const [trackingRequest, setTrackingRequest] = useState<DeliveryRequest | null>(null);
  const [filterTab, setFilterTab] = useState<"pending" | "active" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [riders, setRiders] = useState<UserType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);

  // Fetch riders on mount
  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          const allUsers = Array.isArray(data) ? data : (data.data || []);
          setRiders(allUsers.filter((u: any) => u.role === "rider"));
        }
      } catch (err) {
        console.error("Failed to load riders", err);
      }
    };
    fetchRiders();
  }, []);

  // Batch Modal States
  const [showBatchApprove, setShowBatchApprove] = useState(false);
  const [showBatchReject, setShowBatchReject] = useState(false);
  const [batchRejectType, setBatchRejectType] = useState<'return' | 'decline'>('return');
  const [batchRiderId, setBatchRiderId] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);

  const REJECTION_REASONS = [
    "Incomplete Address Information",
    "Outside of Delivery Hours",
    "Insufficient Personnel Documentation",
    "Invalid Item Category",
    "No Available Riders for this Route",
    "Requested Time Window is Full"
  ];

  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    
    let filtered = requests.filter(r => {
      if (filterTab === "pending") return r.status === "pending";
      if (filterTab === "active") return r.status === "approved" && !["completed", "failed", "disapproved"].includes(r.delivery_status || "");
      if (filterTab === "completed") return ["completed", "failed", "disapproved"].includes(r.delivery_status || "") || r.status === "disapproved";
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.request_id.toLowerCase().includes(q) || 
        r.recipient_name.toLowerCase().includes(q) ||
        r.requester_name.toLowerCase().includes(q)
      );
    }

    return filtered.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "priority") {
        const priorityMap: Record<string, number> = { "Urgent": 3, "High": 2, "Medium": 1, "Low": 0 };
        return (priorityMap[b.urgency_level] || 0) - (priorityMap[a.urgency_level] || 0);
      }
      return 0;
    });
  }, [requests, filterTab, searchQuery, sortBy]);

  const selectedRequest = useMemo(() => 
    requests?.find(r => r.request_id === selectedRequestId) || null
  , [requests, selectedRequestId]);

  const stats = useMemo(() => {
    if (!requests) return { pending: 0, active: 0, done: 0 };
    return {
      pending: requests.filter(r => r.status === "pending").length,
      active: requests.filter(r => r.status === "approved" && !["completed", "failed", "disapproved"].includes(r.delivery_status || "")).length,
      done: requests.filter(r => ["completed", "failed", "disapproved"].includes(r.delivery_status || "") || r.status === "disapproved").length
    };
  }, [requests]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setIsRefreshing(false);
    toast.success("Dashboard data synchronized");
  };

  const handleBatchApprove = async () => {
    if (!batchRiderId) {
      toast.error("Please select a rider first");
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.all(selectedRequestIds.map(id => approveRequest(id, batchRiderId, batchNote)));
      toast.success(`Successfully assigned ${selectedRequestIds.length} requests`);
      setSelectedRequestIds([]);
      setShowBatchApprove(false);
      setBatchRiderId("");
      setBatchNote("");
    } catch (err) {
      toast.error("Some assignments failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchReject = async () => {
    setIsSubmitting(true);
    try {
      const fullNote = selectedReasons.length > 0 
        ? `${batchNote}\nReasons: ${selectedReasons.join(", ")}`
        : batchNote;

      if (batchRejectType === 'return') {
        await Promise.all(selectedRequestIds.map(id => returnForRevision(id, fullNote)));
        toast.success(`Returned ${selectedRequestIds.length} requests for revision`);
      } else {
        await Promise.all(selectedRequestIds.map(id => disapproveRequest(id, fullNote)));
        toast.error(`Declined ${selectedRequestIds.length} requests`);
      }
      
      setSelectedRequestIds([]);
      setShowBatchReject(false);
      setBatchNote("");
      setSelectedReasons([]);
    } catch (err) {
      toast.error("Action failed for some requests");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedRequestIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedRequestIds.length === filteredRequests.length) {
      setSelectedRequestIds([]);
    } else {
      setSelectedRequestIds(filteredRequests.map(r => r.request_id));
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50/50">
      {/* Dynamic Header */}
      <div className="shrink-0 h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 z-30">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                <LayoutDashboard size={18} className="text-pink-500" />
              </div>
              <h1 className="text-xl font-[1000] text-slate-900 tracking-tight">Dispatch Console</h1>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-10">Real-time Logistics</p>
          </div>

          <div className="hidden lg:flex items-center gap-2 ml-4">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 transition-colors group-focus-within:text-pink-500" />
              <Input 
                placeholder="Search request ID or name..." 
                className="w-[320px] h-11 bg-slate-50/50 border-slate-100 pl-11 rounded-2xl font-bold text-xs focus:bg-white focus:ring-2 focus:ring-pink-500/10 transition-all border-none shadow-inner"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {false && (
            <div className="flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-100/50">
              <button
                onClick={() => { setFilterTab("pending"); setSelectedRequestId(null); }}
                className={cn(
                  "px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  filterTab === "pending" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => { setFilterTab("active"); setSelectedRequestId(null); }}
                className={cn(
                  "px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  filterTab === "active" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Active ({stats.active})
              </button>
              <button
                onClick={() => { setFilterTab("completed"); setSelectedRequestId(null); }}
                className={cn(
                  "px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                  filterTab === "completed" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Done ({stats.done})
              </button>
            </div>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-11 w-11 rounded-2xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100"
          >
            <RefreshCw size={18} className={cn("text-slate-600", isRefreshing && "animate-spin")} />
          </Button>

          <div className="bg-slate-900 text-white px-4 h-11 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-slate-900/10">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">{stats.active} Active Rider</span>
          </div>
        </div>
      </div>

      {/* Main Console Layout */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
            <div className="h-full flex flex-col bg-white">
              {/* Batch Actions Bar */}
              {selectedRequestIds.length > 0 && filterTab === "pending" && (
                <div className="shrink-0 p-4 bg-slate-900 border-b border-slate-800 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                        <CheckCheck className="text-white h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{selectedRequestIds.length} Selected</p>
                        <button onClick={() => setSelectedRequestIds([])} className="text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-tighter transition-colors">Clear All</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => { setBatchRejectType('return'); setShowBatchReject(true); }}
                        className="h-9 px-4 rounded-xl text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest"
                      >
                        Revision
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => setShowBatchApprove(true)}
                        className="h-9 px-5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-pink-500/20"
                      >
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <RequestList 
                requests={requests || []}
                filteredRequests={filteredRequests}
                selectedId={selectedRequestId}
                onSelect={(id) => setSelectedRequestId(id)}
                selectedIds={selectedRequestIds}
                onToggleSelect={toggleSelection}
                onSelectAll={selectAll}
                sortBy={sortBy}
                onSortChange={setSortBy}
                filter={filterTab}
                onFilterChange={setFilterTab}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-1 bg-transparent hover:bg-slate-200 transition-colors" />

          <ResizablePanel defaultSize={70}>
            <div className="h-full bg-slate-50/30">
              <RequestDetailsPanel 
                request={selectedRequest}
                riders={riders}
                activeRequests={requests || []}
                onApprove={async (riderId, remark) => {
                  setIsSubmitting(true);
                  try {
                    await approveRequest(selectedRequestId!, riderId, remark);
                    toast.success("Request approved and assigned");
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
                  } catch (err) {
                    toast.error("Failed to decline request");
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                isSubmitting={isSubmitting}
                readOnly={filterTab === "completed"}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Batch Approval Dialog */}
      <Dialog open={showBatchApprove} onOpenChange={setShowBatchApprove}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCheck className="text-emerald-500 h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-[900] text-slate-900 tracking-tight">Batch Approval</h3>
                <p className="text-sm font-bold text-slate-400">Assigning {selectedRequestIds.length} requests</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select Rider</Label>
                <div className="grid grid-cols-1 gap-2">
                  {riders.map(rider => (
                    <button
                      key={rider.id}
                      onClick={() => setBatchRiderId(rider.id)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                        batchRiderId === rider.id 
                          ? "border-emerald-500 bg-emerald-50/50 shadow-sm" 
                          : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[10px] font-black">
                          {rider.name.charAt(0)}
                        </div>
                        <span className="text-sm font-black text-slate-700">{rider.name}</span>
                      </div>
                      {batchRiderId === rider.id && <CheckCircle2 className="text-emerald-500 h-5 w-5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Admin Remark (Optional)</Label>
                <Textarea 
                  placeholder="Additional instructions..."
                  className="rounded-2xl border-slate-100 bg-slate-50 font-bold text-sm min-h-[100px] resize-none"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 gap-3">
            <Button variant="ghost" onClick={() => setShowBatchApprove(false)} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs text-slate-400">Cancel</Button>
            <Button 
              onClick={handleBatchApprove} 
              disabled={!batchRiderId || isSubmitting}
              className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm & Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Reject/Return Dialog */}
      <Dialog open={showBatchReject} onOpenChange={setShowBatchReject}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", batchRejectType === 'return' ? "bg-indigo-50" : "bg-rose-50")}>
                {batchRejectType === 'return' ? <RotateCcw className="text-indigo-500 h-6 w-6" /> : <Ban className="text-rose-500 h-6 w-6" />}
              </div>
              <div>
                <h3 className="text-xl font-[900] text-slate-900 tracking-tight">Batch {batchRejectType === 'return' ? 'Revision' : 'Decline'}</h3>
                <p className="text-sm font-bold text-slate-400">Processing {selectedRequestIds.length} requests</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for {batchRejectType === 'return' ? 'Revision' : 'Rejection'}</Label>
                <div className="grid grid-cols-1 gap-2">
                  {REJECTION_REASONS.map(reason => (
                    <div 
                      key={reason}
                      onClick={() => {
                        setSelectedReasons(prev => 
                          prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                        selectedReasons.includes(reason)
                          ? "border-slate-900 bg-slate-900 text-white shadow-md"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center", selectedReasons.includes(reason) ? "bg-white border-white" : "border-slate-300")}>
                        {selectedReasons.includes(reason) && <div className="w-2 h-2 rounded-sm bg-slate-900" />}
                      </div>
                      <span className="text-xs font-bold">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Additional Note</Label>
                <Textarea 
                  placeholder="Explain your decision..."
                  className="rounded-2xl border-slate-100 bg-slate-50 font-bold text-sm min-h-[100px] resize-none"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 gap-3">
            <Button variant="ghost" onClick={() => setShowBatchReject(false)} className="rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs text-slate-400">Cancel</Button>
            <Button 
              onClick={handleBatchReject} 
              disabled={isSubmitting || (selectedReasons.length === 0 && !batchNote)}
              className={cn(
                "flex-1 h-14 rounded-2xl text-white font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95",
                batchRejectType === 'return' ? "bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20" : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20"
              )}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm {batchRejectType === 'return' ? 'Revision' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GLOBAL FLOATING DRIVER LOCATOR BUTTON (MATCHING CONCEPT) */}
      {false && (
        <div className="fixed bottom-8 right-8 z-[1000] flex items-center gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-50 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-[11px] font-[900] text-slate-800 uppercase tracking-widest whitespace-nowrap">Track Driver Location</p>
            <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-white border-r border-t border-slate-50 rotate-45" />
          </div>

          <div className="relative group">
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes sonar-ping {
                0% { transform: scale(1); opacity: 0.6; }
                100% { transform: scale(2.2); opacity: 0; }
              }
              .sonar-ripple::before {
                content: "";
                position: absolute;
                inset: 0;
                background: linear-gradient(to bottom right, #ec4899, #9333ea);
                border-radius: 9999px;
                animation: sonar-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                z-index: -1;
              }
            `}} />
            
            <Button
              onClick={() => {
                // Priority 1: Job-based tracking
                const jobTracking = requests.find(r => 
                  r.delivery_status === 'in_progress' && 
                  r.current_lat !== null
                );
                
                if (jobTracking) {
                  setTrackingRequest(jobTracking);
                  setIsTrackingModalOpen(true);
                  toast.success(`Tracking Rider: ${jobTracking.assigned_rider_name}`);
                  return;
                }

                // Priority 2: Global/Idle tracking
                const onlineRiderIds = Object.keys(riderLocations);
                if (onlineRiderIds.length > 0) {
                  const firstRiderId = onlineRiderIds[0];
                  const loc = riderLocations[firstRiderId];
                  
                  // Find any job assigned to this rider to provide context to the map
                  const assignedJob = requests.find(r => r.assigned_rider_id === firstRiderId && r.status === 'approved');
                  
                  if (assignedJob) {
                    setTrackingRequest(assignedJob);
                  } else {
                    // Fallback: Create a dummy request object just for the map view
                    setTrackingRequest({
                      request_id: 'IDLE',
                      assigned_rider_name: loc.name,
                      assigned_rider_id: firstRiderId,
                      current_lat: loc.lat,
                      current_lng: loc.lng,
                      pickup_location: { lat: loc.lat, lng: loc.lng, address: 'Current Location' },
                      dropoff_location: { lat: loc.lat, lng: loc.lng, address: 'Current Location' },
                      delivery_status: 'online' as any
                    } as any);
                  }
                  setIsTrackingModalOpen(true);
                  return;
                }

                toast.info("No active GPS signals detected from riders.");
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-[0_10px_40px_rgba(236,72,153,0.4)] border-none p-0 flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 sonar-ripple group-hover:shadow-[0_15px_50px_rgba(236,72,153,0.6)]"
            >
              <MapPin size={32} className="drop-shadow-md text-white" strokeWidth={2.5} fill="white" />
            </Button>
          </div>
        </div>
      )}

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
                    {trackingRequest?.assigned_rider_name || 'Rider Location'}
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100 animate-pulse">
                      Live
                    </span>
                  </h2>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    {trackingRequest?.request_id === 'IDLE' ? 'Offline / Waiting for Job' : `Transaction: #${trackingRequest?.request_id.slice(-8).toUpperCase()}`}
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
                  current={trackingRequest.current_lat && trackingRequest.current_lng ? { lat: Number(trackingRequest.current_lat), lng: Number(trackingRequest.current_lng) } : null}
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
