import React, { useState, useMemo, useEffect } from "react";
import { useData as useGlobalData } from "../../context/DataContext";
import { type User as UserType, DeliveryRequest } from "../../types";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
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
  ArrowRight
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
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Checkbox } from "../../components/ui/checkbox";

export function DispatchConsole() {
  const { 
    requests, 
    approveRequest, 
    disapproveRequest, 
    returnForRevision, 
    refreshData 
  } = useGlobalData();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
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

  const handleToggleReason = (reason: string) => {
    setSelectedReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const selectedRequest = useMemo(() => 
    requests.find(r => r.request_id === selectedRequestId),
    [requests, selectedRequestId]
  );

  // Clear multi-selection when switching tabs
  useEffect(() => {
    setSelectedRequestIds([]);
  }, [filterTab]);

  const toggleRequestSelection = (id: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const filteredRequests = useMemo(() => {
    let result = requests;

    // Search Filtering
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.request_id.toLowerCase().includes(query) ||
          (r.requester_name?.toLowerCase() || "").includes(query) ||
          (r.recipient_name?.toLowerCase() || "").includes(query) ||
          r.pickup_location.address.toLowerCase().includes(query) ||
          r.dropoff_location.address.toLowerCase().includes(query),
      );
    }

    // Tab Filtering
    if (filterTab === "pending") {
      result = result.filter((r) => r.status === "pending" || r.status === "returned_for_revision");
    } else if (filterTab === "active") {
      result = result.filter(
        (r) =>
          (r.status === "approved" || r.status === "assigned") &&
          r.delivery_status !== "completed" &&
          r.delivery_status !== "failed",
      );
    } else if (filterTab === "completed") {
      result = result.filter(
        (r) =>
          r.delivery_status === "completed" ||
          r.delivery_status === "failed" ||
          r.status === "disapproved" ||
          r.status === "cancelled",
      );
    }

    // Sorting
    return [...result].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [requests, searchQuery, filterTab, sortBy]);

  const activeRiderAssignments = useMemo(() => {
    return requests.filter(
      (r) =>
        r.status === "approved" &&
        r.delivery_status !== "completed" &&
        r.delivery_status !== "failed",
    );
  }, [requests]);

  // ESCROW/OPTIMISTIC BATCH ACTIONS
  const processBatchApprove = async () => {
    if (!batchRiderId) {
      toast.error("Please select a rider.");
      return;
    }

    const count = selectedRequestIds.length;
    setIsSubmitting(true);
    setShowBatchApprove(false);

    // UI Escrow feedback
    const toastId = toast.loading(`Assigning and approving ${count} requests...`);
    
    try {
      // Execute all in parallel for speed
      const note = batchNote || "Bulk approved by admin";
      await Promise.all(
        selectedRequestIds.map((id) =>
          approveRequest(id, batchRiderId, note)
        )
      );
      
      toast.success(`Successfully assigned ${count} requests to ${batchRiderId}`, { id: toastId });
      setSelectedRequestIds([]);
      setBatchRiderId("");
      setBatchNote("");
      refreshData();
    } catch (error) {
      toast.error("Failed to process some requests. Please refresh.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const processBatchReject = async () => {
    const count = selectedRequestIds.length;
    const finalNote = [
      ...selectedReasons,
      batchNote
    ].filter(Boolean).join(". ");

    if (selectedReasons.length === 0 && !batchNote) {
      toast.error("Please provide a reason.");
      return;
    }

    setIsSubmitting(true);
    setShowBatchReject(false);
    
    const actionLabel = batchRejectType === 'return' ? "Returning" : "Declining";
    const toastId = toast.loading(`${actionLabel} ${count} requests...`);

    try {
      await Promise.all(
        selectedRequestIds.map((id) => {
          if (batchRejectType === 'return') {
            return returnForRevision(id, finalNote);
          } else {
            return disapproveRequest(id, finalNote);
          }
        })
      );

      toast.success(`Successfully ${batchRejectType === 'return' ? 'returned' : 'declined'} ${count} requests.`, { id: toastId });
      setSelectedRequestIds([]);
      setBatchNote("");
      setSelectedReasons([]);
      refreshData();
    } catch (error) {
      toast.error("Failed to process some requests.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const processBatchStatusUpdate = async (newStatus: 'completed' | 'cancelled') => {
    const count = selectedRequestIds.length;
    setIsSubmitting(true);
    const actionLabel = newStatus === 'completed' ? "Completing" : "Cancelling";
    const toastId = toast.loading(`${actionLabel} ${count} requests...`);

    try {
      // In a real app, we'd use useData's updateDeliveryStatus or cancelRequest
      // For now, we'll simulate the parallel update
      await Promise.all(
        selectedRequestIds.map((id) => {
          if (newStatus === 'completed') {
            return fetch(`/api/requests/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'completed', remark: 'Batch completed by admin' })
            });
          } else {
            // Disapprove/Decline effectively cancels it from the admin's perspective if it's already active
            return disapproveRequest(id, 'Batch cancelled by admin');
          }
        })
      );

      toast.success(`Successfully updated ${count} requests.`, { id: toastId });
      setSelectedRequestIds([]);
      refreshData();
    } catch (error) {
      toast.error("Failed to update some requests.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (riderId: string, note: string) => {
    if (!selectedRequestId) return;
    setIsSubmitting(true);
    try {
      await approveRequest(selectedRequestId, riderId, note || "Approved by admin");
      toast.success("Request approved and assigned.");
      setSelectedRequestId(null);
    } catch (error) {
      toast.error("Failed to approve request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (reason: string) => {
    if (!selectedRequestId) return;
    setIsSubmitting(true);
    try {
      await disapproveRequest(selectedRequestId, reason);
      toast.success("Request declined.");
      setSelectedRequestId(null);
    } catch (error) {
      toast.error("Failed to decline request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasRevisionSelected = useMemo(() => {
    return selectedRequestIds.some(id => {
      const req = requests.find(r => r.request_id === id);
      return req?.status === 'returned_for_revision';
    });
  }, [selectedRequestIds, requests]);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
      {/* Top Control Bar */}
      <header className="h-auto md:h-20 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-8 py-4 md:py-0 shrink-0 z-30 gap-4 shadow-sm">
        <div className="flex items-center gap-4 md:gap-8 flex-1 w-full">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 md:p-2.5 bg-primary/10 rounded-xl">
              <LayoutDashboard className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base md:text-xl font-[900] text-slate-900 tracking-tight leading-none">
                Dispatch Console
              </h1>
              <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 md:mt-1.5">
                Real-time Logistics
              </p>
            </div>
          </div>

          <div className="relative w-full max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search request ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 md:h-11 w-full bg-slate-50 border-none rounded-2xl font-bold text-xs md:text-sm focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none pl-11"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4 shrink-0 self-end sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setIsRefreshing(true);
              refreshData().finally(() => setIsRefreshing(false));
            }}
            disabled={isRefreshing}
            className="h-10 w-10 md:h-11 md:w-11 rounded-2xl border-slate-100 bg-white shadow-sm shrink-0 active:scale-95 transition-transform"
          >
            <RefreshCw className={cn("h-4 w-4 md:h-5 md:w-5 text-slate-600", isRefreshing && "animate-spin")} />
          </Button>
          <div className="hidden md:block h-8 w-[1px] bg-slate-100 mx-1" />
          <div className="flex items-center gap-2 md:gap-3 bg-slate-100/50 px-3 md:px-4 py-1.5 md:py-2 rounded-2xl border border-slate-100 shrink-0">
            <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest">
              {riders.length} active riders
            </span>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        <ResizablePanelGroup direction="horizontal" className="h-full w-full">
          {/* Left List Panel */}
          <ResizablePanel
            defaultSize={30}
            minSize={25}
            maxSize={45}
            className={cn(
              "h-full transition-all duration-300 bg-white",
              selectedRequestId ? "hidden lg:block" : "block",
            )}
          >
            <RequestList
              requests={requests}
              filteredRequests={filteredRequests}
              selectedId={selectedRequestId}
              onSelect={(req) => setSelectedRequestId(req.request_id)}
              filter={filterTab}
              onFilterChange={setFilterTab}
              sortBy={sortBy}
              onSortChange={setSortBy}
              selectedRequestIds={selectedRequestIds}
              onToggleSelection={toggleRequestSelection}
            />
          </ResizablePanel>

          <ResizableHandle withHandle className="hidden lg:flex" />

          {/* Right Detail Panel */}
          <ResizablePanel 
            defaultSize={70}
            className={cn(
              "h-full bg-slate-50/50 relative overflow-hidden transition-all duration-300",
              !selectedRequestId ? "hidden lg:block" : "block"
            )}
          >
            <RequestDetailsPanel 
              request={selectedRequest || null}
              riders={riders}
              activeRequests={activeRiderAssignments}
              onApprove={handleApprove}
              onDecline={handleDecline}
              isSubmitting={isSubmitting}
              onBack={() => setSelectedRequestId(null)}
              readOnly={selectedRequest?.status === 'returned_for_revision'}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Floating Multi-Action Bar */}
      {selectedRequestIds.length > 0 && !hasRevisionSelected && (
        <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-[2.5rem] border border-slate-800 bg-slate-900/95 p-2 px-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col pr-4 border-r border-slate-800">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Selected</span>
            <span className="text-lg font-black text-white leading-none mt-1">
              {selectedRequestIds.length} <span className="text-xs font-bold text-slate-400">items</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            {filterTab === 'pending' ? (
              <>
                <Button
                  size="sm"
                  onClick={() => setShowBatchApprove(true)}
                  className="h-12 gap-2 rounded-2xl bg-emerald-500 px-6 font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  <CheckCheck className="h-4 w-4" />
                  Approve
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBatchRejectType('return');
                    setShowBatchReject(true);
                  }}
                  className="h-12 gap-2 rounded-2xl text-orange-400 hover:text-white hover:bg-orange-500/10 px-6 font-black uppercase tracking-widest transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Revision
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBatchRejectType('decline');
                    setShowBatchReject(true);
                  }}
                  className="h-12 gap-2 rounded-2xl text-red-400 hover:text-white hover:bg-red-500/10 px-6 font-black uppercase tracking-widest transition-all"
                >
                  <Ban className="h-4 w-4" />
                  Decline
                </Button>
              </>
            ) : filterTab === 'active' ? (
              <>
                <Button
                  size="sm"
                  onClick={() => processBatchStatusUpdate('completed')}
                  className="h-12 gap-2 rounded-2xl bg-emerald-500 px-6 font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all active:scale-95"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark Done
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => processBatchStatusUpdate('cancelled')}
                  className="h-12 gap-2 rounded-2xl text-red-400 hover:text-white hover:bg-red-500/10 px-6 font-black uppercase tracking-widest transition-all"
                >
                  <Ban className="h-4 w-4" />
                  Cancel
                </Button>
              </>
            ) : null}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedRequestIds([])}
              className="h-12 w-12 rounded-2xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      )}

      {/* Batch Approve Modal */}
      <Dialog open={showBatchApprove} onOpenChange={setShowBatchApprove}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none bg-white p-0 overflow-hidden shadow-2xl">
          <div className="bg-primary/5 p-8 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white mb-4 shadow-lg shadow-primary/20">
              <User className="h-7 w-7" />
            </div>
            <DialogTitle className="text-2xl font-[950] tracking-tight text-slate-900">Assign & Approve</DialogTitle>
            <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
              Selecting rider for {selectedRequestIds.length} requests
            </DialogDescription>
          </div>
          
          <div className="p-8 pt-0 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Available Riders</Label>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                {riders.map((rider) => (
                  <div
                    key={rider.id}
                    onClick={() => setBatchRiderId(rider.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-all hover:border-primary/20",
                      batchRiderId === rider.id 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-slate-50 bg-slate-50/50"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm text-slate-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{rider.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{rider.id}</p>
                    </div>
                    {batchRiderId === rider.id && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/20">
                        <CheckCheck className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Admin Instructions (Optional)</Label>
              <Input
                placeholder="Bulk approved by admin"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                className="h-12 rounded-xl border-slate-100 bg-slate-50 font-bold focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 gap-3 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setShowBatchApprove(false)}
              className="rounded-2xl font-black uppercase tracking-widest text-slate-400 h-14 px-8"
            >
              Cancel
            </Button>
            <Button 
              onClick={processBatchApprove}
              disabled={!batchRiderId || isSubmitting}
              className="flex-1 rounded-2xl bg-primary h-14 px-8 font-black uppercase tracking-widest text-white shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Confirm Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Reject Modal */}
      <Dialog open={showBatchReject} onOpenChange={setShowBatchReject}>
        <DialogContent className="max-w-md rounded-[2.5rem] border-none bg-white p-0 overflow-hidden shadow-2xl">
          <div className={cn(
            "p-8 pb-6",
            batchRejectType === 'return' ? "bg-orange-50" : "bg-red-50"
          )}>
            <div className={cn(
              "flex h-14 w-14 items-center justify-center rounded-2xl mb-4 shadow-lg",
              batchRejectType === 'return' ? "bg-orange-500 text-white shadow-orange-500/20" : "bg-red-500 text-white shadow-red-500/20"
            )}>
              {batchRejectType === 'return' ? <RotateCcw className="h-7 w-7" /> : <Ban className="h-7 w-7" />}
            </div>
            <DialogTitle className="text-2xl font-[950] tracking-tight text-slate-900">
              {batchRejectType === 'return' ? 'Return Revision' : 'Decline Requests'}
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">
              Processing {selectedRequestIds.length} items
            </DialogDescription>
          </div>

          <div className="p-8 pt-0 space-y-6">
            <div className="space-y-3">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Common Reasons</Label>
              <div className="grid grid-cols-1 gap-2">
                {REJECTION_REASONS.map((reason) => (
                  <div 
                    key={reason}
                    onClick={() => handleToggleReason(reason)}
                    className={cn(
                      "flex items-center space-x-3 rounded-2xl border-2 p-4 transition-all cursor-pointer",
                      selectedReasons.includes(reason) 
                        ? (batchRejectType === 'return' ? "border-orange-500/20 bg-orange-50/50" : "border-red-500/20 bg-red-50/50")
                        : "border-slate-50 bg-slate-50/50 hover:border-slate-100"
                    )}
                  >
                    <Checkbox 
                      id={reason} 
                      checked={selectedReasons.includes(reason)}
                      onCheckedChange={() => handleToggleReason(reason)}
                      className={cn(
                        "rounded-md h-5 w-5",
                        batchRejectType === 'return' ? "data-[state=checked]:bg-orange-500" : "data-[state=checked]:bg-red-500"
                      )}
                    />
                    <Label 
                      htmlFor={reason} 
                      className="flex-1 cursor-pointer text-sm font-bold text-slate-600"
                    >
                      {reason}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Additional Notes</Label>
              <Textarea
                placeholder="Specific instructions for the personnel..."
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                className="min-h-[100px] rounded-2xl border-slate-100 bg-slate-50 font-bold focus-visible:ring-primary/20"
              />
            </div>
          </div>

          <DialogFooter className="p-8 pt-0 gap-3 sm:gap-0">
            <Button 
              variant="ghost" 
              onClick={() => setShowBatchReject(false)}
              className="rounded-2xl font-black uppercase tracking-widest text-slate-400 h-14 px-8"
            >
              Cancel
            </Button>
            <Button 
              onClick={processBatchReject}
              disabled={isSubmitting || (selectedReasons.length === 0 && !batchNote)}
              className={cn(
                "flex-1 rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-95",
                batchRejectType === 'return' 
                  ? "bg-orange-500 shadow-orange-500/20 hover:bg-orange-600" 
                  : "bg-red-500 shadow-red-500/20 hover:bg-red-600"
              )}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm {batchRejectType === 'return' ? 'Revision' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
