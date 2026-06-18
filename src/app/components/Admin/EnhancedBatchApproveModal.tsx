import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { CheckCheck, Loader2, GripVertical, Info, Zap, Clock, MapPin } from 'lucide-react';
import { cn } from "../ui/utils";
import { DeliveryRequest, User } from "../../../types";
import { Reorder, useDragControls } from "framer-motion";

interface EnhancedBatchApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedRequests: DeliveryRequest[];
  riders: User[];
  onConfirm: (riderId: string, sequence: string[], note: string) => Promise<void>;
  isSubmitting: boolean;
}

export const EnhancedBatchApproveModal: React.FC<EnhancedBatchApproveModalProps> = ({
  isOpen,
  onClose,
  selectedRequests,
  riders,
  onConfirm,
  isSubmitting
}) => {
  const [batchRiderId, setBatchRiderId] = useState("");
  const [batchNote, setBatchNote] = useState("");
  const [reorderableItems, setReorderableItems] = useState<DeliveryRequest[]>([]);
  const [missionItems, setMissionItems] = useState<DeliveryRequest[]>([]);

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
  useEffect(() => {
    if (selectedRequests.length > 0) {
      // Mission Anchor: Pin in_progress tasks at the top
      const missions = selectedRequests.filter(r => r.delivery_status === 'in_progress');
      const others = selectedRequests.filter(r => r.delivery_status !== 'in_progress');

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
        setReorderableItems(sorted);
      } else {
        // Use SLA Scoring engine for initial ordering or when adding new pending tasks
        // to intelligently interleave the route.
        const scored = others.map(r => ({
          ...r,
          priorityScore: calculatePriorityScore(r)
        }));
        const sorted = scored.sort((a, b) => (b as any).priorityScore - (a as any).priorityScore);
        setReorderableItems(sorted);
      }
      
      setMissionItems(missions);
    }
  }, [selectedRequests]);

  const handleConfirm = async () => {
    if (!batchRiderId) return;
    const sequence = [...missionItems, ...reorderableItems].map(item => item.request_id);
    await onConfirm(batchRiderId, sequence, batchNote);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="flex flex-col max-h-[85vh]">
          {/* Header - Scaled Down */}
          <div className="p-5 bg-white border-b border-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
                <CheckCheck className="text-pink-500 h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-[900] text-slate-900 tracking-tight">
                  The Interceptor <span className="text-slate-400 font-bold ml-1 text-[10px]">(Layer 2)</span>
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Enforcing sequence: {selectedRequests.length} tasks
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Body - Compressed */}
          <div className="flex-1 overflow-y-auto p-5 pt-0 space-y-6 custom-scrollbar">
            {/* Step 1: Rider Selection */}
            <div className="space-y-3 mt-4">
              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-0.5">
                1. Designate Rider
              </Label>
              <div className="grid grid-cols-1 gap-1.5">
                {riders.map((rider) => {
                  const isUnavailable = (rider as any).attendance_status === 'absent' || !(rider as any).is_on_duty;
                  return (
                    <button
                      key={rider.id}
                      disabled={isUnavailable}
                      onClick={() => setBatchRiderId(rider.id)}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-xl border-2 transition-all text-left",
                        batchRiderId === rider.id
                          ? "border-pink-500 bg-pink-50/30 shadow-sm"
                          : (isUnavailable ? "opacity-30 grayscale cursor-not-allowed border-slate-50" : "border-slate-100 hover:border-slate-200")
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-900 flex items-center justify-center text-white text-[9px] font-black">
                          {rider.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-700 truncate">{rider.name}</p>
                          <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                            {isUnavailable ? 'Offline' : 'Active'}
                          </p>
                        </div>
                      </div>
                      {batchRiderId === rider.id && <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mr-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

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
                  <div key={request.request_id} className="relative flex items-center gap-3 p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 shadow-sm transition-all group mt-3">
                    {/* Rank Indicator - Top Left */}
                    <div className="absolute -top-3 -left-3 w-7 h-7 rounded-lg bg-emerald-500 text-white text-[11px] font-black flex items-center justify-center shadow-md z-10 border-[3px] border-white">
                      {index + 1}
                    </div>

                    <div className="w-1 shrink-0" /> {/* Spacer */}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-[10px] font-black text-slate-900 truncate">#{request.request_id.slice(-6).toUpperCase()}</p>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[7px] h-3.5 px-1 font-black uppercase border-none shrink-0">
                            IN PROGRESS
                          </Badge>
                        </div>
                        <div className="px-1 py-0.5 bg-slate-900 rounded-md">
                          <span className="text-[7px] font-black text-white">PINNED</span>
                        </div>
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 truncate">
                        {request.pickup_address}
                      </p>
                    </div>
                  </div>
                ))}

                <Reorder.Group axis="y" values={reorderableItems} onReorder={setReorderableItems} className="space-y-4 mt-4">
                  {reorderableItems.map((request, index) => {
                    const score = (request as any).priorityScore || 0;
                    const isUrgent = request.urgency_level === 'Urgent';
                    const isTimePressed = score > 60;
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
                          "flex items-center gap-3 p-2.5 rounded-xl border-2 transition-all group",
                          isNew ? "border-pink-200 bg-pink-50/10 shadow-sm" : 
                          (visualIndex === 1 ? "border-emerald-100 bg-emerald-50/10 shadow-sm" : "border-slate-100 bg-white")
                        )}>
                          <GripVertical className="text-slate-200 h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-[10px] font-black text-slate-900 truncate">#{request.request_id.slice(-6).toUpperCase()}</p>
                                {isNew && (
                                  <Badge className="bg-pink-500 text-white text-[7px] h-3.5 px-1 font-black uppercase border-none shrink-0 shadow-sm animate-pulse">
                                    NEW
                                  </Badge>
                                )}
                                <Badge className={cn(
                                  "text-[7px] h-3.5 px-1 font-black uppercase border-none shrink-0",
                                  request.requester_department === 'Finance' ? "bg-amber-100 text-amber-700" :
                                  request.requester_department === 'Regulatory' ? "bg-indigo-100 text-indigo-700" :
                                  "bg-slate-100 text-slate-600"
                                )}>
                                  {request.requester_department || 'OPS'}
                                </Badge>
                              </div>
                              
                              {/* LAYER 3: Score Visualization */}
                              <div className="flex items-center gap-1 shrink-0">
                                {isUrgent && <Zap size={10} className="text-amber-500 fill-amber-500" />}
                                {isTimePressed && <Clock size={10} className="text-rose-500" />}
                                <div className="px-1 py-0.5 bg-slate-900 rounded-md">
                                  <span className="text-[7px] font-black text-white">{score}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-[8px] font-bold text-slate-400 truncate pr-4">
                                {request.pickup_address}
                              </p>
                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter shrink-0">
                                {request.urgency_level}
                              </span>
                            </div>
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
                3. Admin Remark
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
              disabled={!batchRiderId || isSubmitting}
              className="h-10 px-8 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[9px] shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              Enforce & Approve
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
