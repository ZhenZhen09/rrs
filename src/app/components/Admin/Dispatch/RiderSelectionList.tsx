import React from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { User, MapPin, Package, Star, AlertCircle, UserX, Clock } from 'lucide-react';
import { cn } from '../../ui/utils';
import { User as UserType, DeliveryRequest } from '../../../types';
import { format } from 'date-fns';

interface RiderType extends UserType {
  attendance_status?: 'present' | 'absent' | 'on_leave' | null;
  is_on_duty?: boolean;
  is_online?: boolean;
}

interface RiderSelectionListProps {
  riders: RiderType[];
  activeRequests: DeliveryRequest[];
  selectedRiderId: string;
  onSelect: (riderId: string) => void;
  pickupLocation: { lat: number; lng: number };
  sortBy: string;
  onSortChange: (sort: string) => void;
  deliveryDate?: string;
  timeWindow?: string;
  currentRequestId?: string;
}

export const RiderSelectionList: React.FC<RiderSelectionListProps> = ({
  riders,
  activeRequests,
  selectedRiderId,
  onSelect,
  pickupLocation,
  sortBy,
  onSortChange,
  deliveryDate,
  timeWindow,
  currentRequestId
}) => {
  // 1. Context Detection: Is this task for Today?
  const todayStr = new Date().toISOString().split('T')[0];
  const isAssigningForToday = deliveryDate === todayStr;

  // Helper to calculate distance (Simulated for UI)
  const getSimulatedDistance = (riderId: string) => {
    const seed = riderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (seed % 10) + (seed % 100) / 100;
  };

  const getWorkload = (riderId: string) => {
    return activeRequests.filter(r => r.assigned_rider_id === riderId && r.delivery_status !== 'completed' && r.delivery_status !== 'failed').length;
  };

  const getConflictingRequest = (riderId: string) => {
    if (!deliveryDate || !timeWindow) return null;
    return activeRequests.find(r => 
      r.request_id !== currentRequestId &&
      r.assigned_rider_id === riderId && 
      r.delivery_date === deliveryDate && 
      r.time_window === timeWindow &&
      r.delivery_status !== 'completed' &&
      r.delivery_status !== 'failed'
    );
  };

  /**
   * Enterprise Logic: Context-Aware Availability Reason
   * Provides clear feedback on why a rider is greyed out.
   */
  const getUnavailabilityReason = (rider: RiderType) => {
    // ALWAYS unavailable if on leave for the specific delivery date
    if (rider.attendance_status === 'on_leave') return 'ON LEAVE';

    // STRICT RULES for Today's assignments only
    if (isAssigningForToday) {
      if (rider.attendance_status === 'absent') return 'ABSENT';
      if (!rider.attendance_status) return 'NO REPORT';
      if (!rider.is_on_duty) return 'OFF-DUTY';
      if (!rider.is_online) return 'OFFLINE';
    }

    return null;
  };

  const isUnavailable = (rider: RiderType) => !!getUnavailabilityReason(rider);

const sortedRiders = [...riders].sort((a, b) => {
  // Layer 1: Unavailability Shield - Riders who can't work today go to bottom
  const unavailA = isUnavailable(a) ? 1 : 0;
  const unavailB = isUnavailable(b) ? 1 : 0;
  if (unavailA !== unavailB) return unavailA - unavailB;

  if (sortBy === 'smart') {
    const conflictA = getConflictingRequest(a.id) ? 1 : 0;
    const conflictB = getConflictingRequest(b.id) ? 1 : 0;
    if (conflictA !== conflictB) return conflictA - conflictB;

    const workloadA = getWorkload(a.id);
    const workloadB = getWorkload(b.id);
    if (workloadA !== workloadB) return workloadA - workloadB;

    return getSimulatedDistance(a.id) - getSimulatedDistance(b.id);
  }
  if (sortBy === 'nearest') {
    return getSimulatedDistance(a.id) - getSimulatedDistance(b.id);
  }
  if (sortBy === 'availability') {
    return getWorkload(a.id) - getWorkload(b.id);
  }
  return 0;
});

const bestMatchId = sortedRiders[0]?.id && !getConflictingRequest(sortedRiders[0].id) && !isUnavailable(sortedRiders[0])
  ? sortedRiders[0].id 
  : null;

return (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <h3 className="text-sm font-[900] text-slate-900 tracking-tight flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          Assign Rider
        </h3>
        {deliveryDate && (
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-6">
            Schedule for {format(new Date(deliveryDate), 'MMM d, yyyy')}
          </p>
        )}
      </div>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="h-8 w-32 border-none shadow-none text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100/50 rounded-lg focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-100 shadow-xl">
          <SelectItem value="smart" className="font-bold text-xs uppercase tracking-wider">Smart (AI)</SelectItem>
          <SelectItem value="nearest" className="font-bold text-xs uppercase tracking-wider">Nearest</SelectItem>
          <SelectItem value="availability" className="font-bold text-xs uppercase tracking-wider">Availability</SelectItem>
        </SelectContent>
      </Select>
    </div>

      <div className="space-y-3">
        {sortedRiders.map((rider) => {
          const distance = getSimulatedDistance(rider.id);
          const workload = getWorkload(rider.id);
          const isSelected = selectedRiderId === rider.id;
          const isBestMatch = rider.id === bestMatchId;
          const conflictingReq = getConflictingRequest(rider.id);
          const unavailReason = getUnavailabilityReason(rider);
          const unavailable = !!unavailReason;

          return (
            <Card
              key={rider.id}
              onClick={() => onSelect(rider.id)}
              className={cn(
                "p-4 rounded-2xl border-2 transition-all cursor-pointer relative group",
                isSelected
                  ? "border-primary bg-white shadow-lg ring-4 ring-primary/5"
                  : (unavailable 
                      ? "border-slate-50 bg-slate-100/50 opacity-60 grayscale cursor-not-allowed" 
                      : "border-slate-50 bg-slate-50/30 hover:bg-white hover:border-slate-200")
              )}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg transition-colors",
                    isSelected ? "bg-primary text-white" : (unavailable ? "bg-slate-200 text-slate-400" : "bg-white text-slate-400 shadow-sm")
                  )}>
                    {rider.name.charAt(0)}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                    unavailable ? "bg-slate-400" : (workload >= 3 ? "bg-rose-500" : "bg-emerald-500")
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={cn(
                        "text-sm font-[900] truncate tracking-tight",
                        unavailable ? "text-slate-400" : "text-slate-900"
                      )}>{rider.name}</p>
                      {unavailable && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded-md border border-slate-300 shrink-0">
                          <UserX size={10} strokeWidth={3} />
                          <span className="text-[8px] font-black uppercase tracking-tighter">
                            [{unavailReason}]
                          </span>
                        </div>
                      )}
                      {conflictingReq && !unavailable && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-md border border-rose-200 shrink-0">
                          <AlertCircle size={10} strokeWidth={3} />
                          <span className="text-[8px] font-black uppercase tracking-tighter">
                            Conflict: #{conflictingReq.request_id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    {isBestMatch && !isSelected && !unavailable && (
                      <Badge className="bg-blue-500 text-white text-[8px] font-black uppercase tracking-tighter border-none px-1.5 py-0">Best Match</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Star className={cn("h-3 w-3", unavailable ? "text-slate-300 fill-slate-300" : "text-amber-400 fill-amber-400")} />
                      <span className={cn("text-[10px] font-black", unavailable ? "text-slate-300" : "text-slate-600")}>4.9</span>
                    </div>
                    {!unavailable && (
                      <>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500">{distance.toFixed(1)} km away</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-slate-400" />
                          <span className="text-[10px] font-bold text-slate-500">{workload}/3 jobs</span>
                        </div>
                      </>
                    )}
                    {unavailable && (
                      <span className="text-[10px] font-bold text-slate-400 italic">
                        {unavailReason === 'OFF-DUTY' ? 'Rider has finished their shift' : 
                         unavailReason === 'OFFLINE' ? 'Rider app is currently disconnected' :
                         unavailReason === 'NO REPORT' ? 'Awaiting morning check-in' :
                         `Reported ${rider.attendance_status} today`}
                      </span>
                    )}
                  </div>
                </div>

                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected ? "border-primary bg-primary" : "border-slate-200 bg-white"
                )}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
