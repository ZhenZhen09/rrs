import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { CheckCheck, Loader2, GripVertical, Info, UserRound } from 'lucide-react';
import { cn } from "../ui/utils";
import { DeliveryRequest, User } from "../../types";
import { formatLocalDate } from "../../utils/dateUtils";
import { Reorder } from "framer-motion";
import { getRiderAvailability, isScheduledForToday, type RiderAvailabilityInput } from '../../utils/riderAvailability';

interface EnhancedBatchApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRequests: DeliveryRequest[];
  riders: User[];
  onConfirm: (riderId: string, sequence: string[], note: string) => Promise<void>;
  isSubmitting: boolean;
  mode?: 'batch-assign' | 'route-review';
  fixedRiderId?: string;
}

export const EnhancedBatchApproveModal: React.FC<EnhancedBatchApproveModalProps> = ({
  ...props
}) => {
  const [batchRiderId, setBatchRiderId] = useState("");
  const [batchNote, setBatchNote] = useState("");
  return <BatchApprovalSequence key={JSON.stringify(props.selectedRequests)} {...props}
    batchRiderId={batchRiderId} setBatchRiderId={setBatchRiderId}
    batchNote={batchNote} setBatchNote={setBatchNote} />;
};

const BatchApprovalSequence = ({
  isOpen,
  onClose,
  selectedRequests,
  riders,
  onConfirm,
  isSubmitting,
  mode = 'batch-assign',
  fixedRiderId,
  batchRiderId, setBatchRiderId, batchNote, setBatchNote,
}: EnhancedBatchApproveModalProps & {
  batchRiderId: string; setBatchRiderId: (id: string) => void;
  batchNote: string; setBatchNote: (note: string) => void;
}) => {

  /**
   * LAYER 3: SLA SHIELD (Multi-Factor Scoring Engine)
   * Formula: Score = (SLA * 50%) + (Urgency * 30%) + (Time * 15%) + (Route * 5%)
   */
  const calculatePriorityScore = (request: DeliveryRequest) => {
    let score = 0;

    // 1. SLA Weight (50%)
    const dept = request.requester_department;
    if (dept === 'Finance') score += 50;
    else if (dept === 'Regulatory') score += 40;
    else if (dept === 'Operations') score += 20;
    else if (dept === 'HR') score += 10;
    else score += 5;

    // 2. Urgency Level (30%)
    const urgency = request.urgency_level;
    if (urgency === 'Urgent') score += 30;
    else if (urgency === 'High') score += 20;
    else if (urgency === 'Medium') score += 10;

    // 3. Time-to-Expiry (15%)
    // Logic: If we are nearing or past the pickup window start
    try {
      const now = new Date();
      const windowStart = request.time_window?.split(' - ')[0]; // e.g. "10:00"
      if (windowStart) {
        const [hours, minutes] = windowStart.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(hours, minutes, 0, 0);
        
        const diffMins = (startTime.getTime() - now.getTime()) / 60000;
        
        if (diffMins <= 0) score += 15; // Past due or starting now
        else if (diffMins <= 60) score += 10; // Within the hour
        else score += 5;
      }
    } catch (e) { score += 5; }

    // 4. Route Optimization (5%) - Simple Distance Simulation
    // (In a real app, this would use rider's current coords)
    const seed = request.request_id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const simulatedDist = (seed % 10);
    score += Math.max(0, (5 - simulatedDist * 0.5));

    return score;
  };

  // Run the SLA Shield on selection
  const startedStatuses = new Set(['in_progress', 'arrived', 'picked_up', 'arrived_at_pickup', 'arrived_at_dropoff']);
  const missionItems = selectedRequests
    .filter((request) => startedStatuses.has(request.delivery_status || ''))
    .sort((a, b) => (a.queue_order || Number.MAX_SAFE_INTEGER) - (b.queue_order || Number.MAX_SAFE_INTEGER));
  const [reorderableItems, setReorderableItems] = useState<DeliveryRequest[]>(() => {
      const others = selectedRequests.filter(r => !startedStatuses.has(r.delivery_status || ''));

      // Check if items already have a valid queue_order (persisted by Admin)
      const hasExistingOrder = others.some(r => r.queue_order && r.queue_order > 0);
      const hasNewPending = others.some(r => r.delivery_status === 'pending');

      if (hasExistingOrder && !hasNewPending) {
        // Respect existing order ONLY if no new pending tasks are being added
        const sorted = [...others].sort((a, b) => {
          const orderA = a.queue_order || 999;
          const orderB = b.queue_order || 999;
          return orderA - orderB;
        });
        return sorted;
      } else {
        // Use SLA Scoring engine for initial ordering or when adding new pending tasks
        // to intelligently interleave the route.
        const scored = others.map(r => ({
          ...r,
          priorityScore: calculatePriorityScore(r)
        }));
        const sorted = scored.sort((a, b) => (b as any).priorityScore - (a as any).priorityScore);
        return sorted;
      }
      
  });

  const batchRequiresTodayAvailability = selectedRequests.some((request) => isScheduledForToday(request.delivery_date));
  const availabilityForRider = (rider: User) =>
    getRiderAvailability(rider as User & RiderAvailabilityInput, batchRequiresTodayAvailability);
  const selectedBatchRider = riders.find((rider) => rider.id === batchRiderId);
  const canAssignBatch = Boolean(selectedBatchRider && availabilityForRider(selectedBatchRider).eligible);
  const canConfirm = mode === 'route-review' ? Boolean(fixedRiderId) : canAssignBatch;

  const handleConfirm = async () => {
    const riderId = mode === 'route-review' ? fixedRiderId : batchRiderId;
    if (!riderId) return;
    if (mode === 'batch-assign' && !canAssignBatch) return;
    const sequence = [...missionItems, ...reorderableItems].map(item => item.request_id);
    try {
      await onConfirm(riderId, sequence, batchNote);
      onClose();
    } catch {
      // The caller shows the failure; keep the order open so it can be retried.
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-1rem)] rounded-2xl p-0 overflow-hidden border-none shadow-2xl sm:max-w-md sm:rounded-[2rem]">
        <div className="flex flex-col max-h-[calc(100vh-1rem)] sm:max-h-[85vh]">
          {/* Header - Scaled Down */}
          <div className="p-3.5 bg-white border-b border-slate-50 shrink-0 sm:p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                <CheckCheck className="text-pink-500 h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-[900] text-slate-900 tracking-tight">
                  {mode === 'route-review' ? 'Manage rider route' : 'Assign selected tasks'}
                </DialogTitle>
                <DialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {mode === 'route-review' ? 'Review the rider’s current queue' : `Assign ${selectedRequests.length} selected tasks`}
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Scrollable Body - Compressed */}
          <div className="flex-1 overflow-y-auto p-3.5 pt-0 space-y-4 custom-scrollbar sm:space-y-6 sm:p-5 sm:pt-0">
            {/* Batch assignment chooses a rider once; route review keeps the current rider fixed. */}
            {mode === 'batch-assign' ? <div className="space-y-3 mt-3 sm:mt-4">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-0.5">
                  1. Designate Rider
                </Label>
              <div className="space-y-2">
                {riders.map((rider) => {
                  const availability = availabilityForRider(rider);
                  const isUnavailable = !availability.eligible;
                  const online = (rider as User & RiderAvailabilityInput).is_online === true;
                  return (
                    <button
                      key={rider.id}
                      disabled={isUnavailable}
                      aria-label={`${rider.name}, ${online ? 'online' : 'offline'}${isUnavailable ? `, unavailable: ${availability.blockReason?.toLowerCase()}` : ''}`}
                      onClick={() => setBatchRiderId(rider.id)}
                      className={cn(
                        "flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2",
                        batchRiderId === rider.id
                          ? "border-pink-500 bg-pink-50/50 shadow-sm"
                          : (isUnavailable ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
                      )}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", batchRiderId === rider.id ? "bg-pink-500 text-white" : "bg-slate-100 text-slate-500")}>
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                        {rider.name}
                      </p>
                      <span className={cn(
                        "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                        online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                      )}>
                        {online ? 'Online' : 'Offline'}
                      </span>
                      {batchRiderId === rider.id && <div className="h-2 w-2 shrink-0 rounded-full bg-pink-500" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div> : <div className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 sm:mt-4">
              Rider: {riders.find((rider) => rider.id === fixedRiderId)?.name || fixedRiderId || 'Unknown'}
            </div>}

            {/* Step 2: Sequence Enforcement */}
            <div className="space-y-3">
              <div className="flex items-center justify-between ml-0.5">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  2. Execution Order
                </Label>
                <div className="flex items-center gap-1 text-[7px] font-black text-slate-400 uppercase tracking-widest">
                  <Info size={8} />
                  Drag to sort
                </div>
              </div>
              
              <div className="space-y-1.5">
                {/* Mission Anchor (Pinned in_progress tasks) */}
                {missionItems.map((request, index) => (
                  <div key={request.request_id} className="relative flex items-center gap-2 p-2 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 shadow-sm transition-all group mt-3 sm:gap-3 sm:p-2.5">
                    {/* Rank Indicator - Top Left */}
                    <div className="absolute -top-3 -left-3 w-7 h-7 rounded-lg bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center shadow-md z-10 border-[3px] border-white">
                      {index + 1}
                    </div>

                    <div className="w-1 shrink-0" /> {/* Spacer */}
                    
                    <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                      <div className="min-w-0">
                        <p className="text-[7px] font-black uppercase tracking-tighter text-slate-400">Building Name</p>
                        <p className="truncate text-[10px] font-black text-slate-900">{request.dropoff_location.businessName || "General Pickup"}</p>
                      </div>
                      <div className="row-span-4 text-right">
                        <Badge className="border-none bg-emerald-100 text-[7px] font-black uppercase text-emerald-700">IN PROGRESS</Badge>
                        <p className="mt-1 text-[7px] font-black uppercase tracking-tighter text-slate-400">Urgency</p>
                        <p className="text-[8px] font-black uppercase tracking-tighter text-slate-700">{request.urgency_level}</p>
                        <p className="mt-1 text-[7px] font-black uppercase tracking-tighter text-slate-400">Transaction</p>
                        <p className="text-[8px] font-black uppercase tracking-tighter text-slate-700">#{request.request_id.slice(-6).toUpperCase()}</p>
                      </div>
                      <p className="min-w-0 truncate text-[8px] font-bold text-slate-500"><span className="font-black uppercase tracking-tighter text-slate-400">Date to complete / Time:</span>{" "}{formatLocalDate(request.delivery_date, "MMM d, yyyy")} / {request.time_window}</p>
                      <p className="min-w-0 truncate text-[8px] font-bold text-slate-500"><span className="font-black uppercase tracking-tighter text-slate-400">Requestor:</span>{" "}{request.requester_name || "Unknown"}</p>
                      <p className="min-w-0 truncate text-[8px] font-bold text-slate-500"><span className="font-black uppercase tracking-tighter text-slate-400">Department:</span>{" "}{request.requester_department || "OPS"}</p>
                    </div>
                  </div>
                ))}

                <Reorder.Group axis="y" values={reorderableItems} onReorder={setReorderableItems} className="space-y-2.5 mt-3 sm:space-y-4 sm:mt-4">
                  {reorderableItems.map((request, index) => {
                    const isNew = request.delivery_status === 'pending';

                    // Adjust visual index to account for mission items
                    const visualIndex = index + missionItems.length + 1;

                    return (
                      <Reorder.Item
                        key={request.request_id}
                        value={request}
                        className="cursor-grab active:cursor-grabbing relative"
                      >
                        {/* Rank Indicator - Top Left */}
                        <div className={cn(
                          "absolute -top-3 -left-3 w-7 h-7 rounded-lg text-white text-[11px] font-black flex items-center justify-center shadow-md z-10 border-[3px] border-white",
                          visualIndex === 1 ? "bg-emerald-500" : "bg-slate-900"
                        )}>
                          {visualIndex}
                        </div>

                        <div className={cn(
                          "flex items-center gap-2 p-2 rounded-xl border-2 transition-all group sm:gap-3 sm:p-2.5",
                          isNew ? "border-pink-200 bg-pink-50/10 shadow-sm" : 
                          (visualIndex === 1 ? "border-emerald-100 bg-emerald-50/10 shadow-sm" : "border-slate-100 bg-white")
                        )}>
                          <GripVertical className="text-slate-200 h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                          
                          <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                            <div className="min-w-0">
                              <p className="text-[7px] font-black uppercase tracking-tighter text-slate-400">Building Name</p>
                              <p className="truncate text-[10px] font-black text-slate-900">{request.dropoff_location.businessName || "General Pickup"}</p>
                            </div>
                              
                              <div className="row-span-4 text-right">
                                {isNew && <Badge className="border-none bg-pink-500 text-[7px] font-black uppercase text-white shadow-sm animate-pulse">NEW</Badge>}
                                <p className="mt-1 text-[7px] font-black uppercase tracking-tighter text-slate-400">Urgency</p>
                                <p className="text-[8px] font-black uppercase tracking-tighter text-slate-700">{request.urgency_level}</p>
                                <p className="mt-1 text-[7px] font-black uppercase tracking-tighter text-slate-400">Transaction</p>
                                <p className="text-[8px] font-black uppercase tracking-tighter text-slate-700">#{request.request_id.slice(-6).toUpperCase()}</p>
                              </div>
                            
                            <p className="min-w-0 truncate text-[8px] font-bold text-slate-500"><span className="font-black uppercase tracking-tighter text-slate-400">Date to complete / Time:</span>{" "}
                              {formatLocalDate(request.delivery_date, "MMM d, yyyy")} · {request.time_window}
                            </p>
                            <p className="min-w-0 truncate text-[8px] font-bold text-slate-500"><span className="font-black uppercase tracking-tighter text-slate-400">Requestor:</span>{" "}{request.requester_name || "Unknown"}</p>
                            <p className="min-w-0 truncate text-[8px] font-bold text-slate-500"><span className="font-black uppercase tracking-tighter text-slate-400">Department:</span>{" "}{request.requester_department || "OPS"}</p>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              </div>
            </div>

            {/* Step 3: Instructions */}
            <div className="space-y-3">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-0.5">
                {mode === 'route-review' ? 'Route note' : 'Admin remark'}
              </Label>
              <Textarea
                placeholder="Optional notes..."
                className="rounded-xl border-slate-100 bg-slate-50 font-bold text-[11px] min-h-[60px] resize-none py-2 px-3 shadow-none focus-visible:ring-0"
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
              />
            </div>
          </div>

          {/* Footer - Centered Buttons */}
          <DialogFooter className="bg-slate-50 p-4 flex items-center justify-center sm:justify-center gap-3 shrink-0">
            <Button
              variant="ghost"
              onClick={onClose}
              className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[9px] text-slate-400 hover:bg-slate-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm || isSubmitting}
              className="h-10 px-8 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              {mode === 'route-review' ? 'Save route order' : 'Assign tasks'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
