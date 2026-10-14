import React from 'react';
import { Card } from '../../ui/card';
import { User } from 'lucide-react';
import { cn } from '../../ui/utils';
import { User as UserType } from '../../../types';
import { getRiderAvailability, isScheduledForToday } from '../../../utils/riderAvailability';
import { getDefaultRiderAvatarUrl } from '../../../utils/riderAvatar';

interface RiderType extends UserType {
  attendance_status?: 'present' | 'absent' | 'on_leave' | null;
  is_on_duty?: boolean;
  is_online?: boolean;
}

interface RiderSelectionListProps {
  riders: RiderType[];
  selectedRiderId: string;
  onSelect: (riderId: string) => void;
  deliveryDate?: string;
}

export const RiderSelectionList: React.FC<RiderSelectionListProps> = ({
  riders,
  selectedRiderId,
  onSelect,
  deliveryDate,
}) => {
  const isAssigningForToday = isScheduledForToday(deliveryDate);
  const getAvailability = (rider: RiderType) => getRiderAvailability(rider, isAssigningForToday);

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
            Schedule for {new Date(`${deliveryDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
      </div>
    </div>

      <div className="space-y-3">
        {riders.map((rider) => {
          const isSelected = selectedRiderId === rider.id;
          const availability = getAvailability(rider);
          const unavailReason = availability.blockReason;
          const unavailable = !availability.eligible;
          const selectRider = () => {
            if (unavailable) return;
            onSelect(rider.id);
          };

          return (
            <Card
              key={rider.id}
              role="button"
              aria-disabled={unavailable}
              aria-label={`${rider.name}, ${rider.is_online ? 'online' : 'offline'}${unavailable && unavailReason ? `, unavailable: ${unavailReason.toLowerCase()}` : ''}`}
              tabIndex={unavailable ? -1 : 0}
              onClick={selectRider}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                selectRider();
              }}
              className={cn(
                "p-3 rounded-xl border transition-colors cursor-pointer relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : (unavailable 
                      ? "border-slate-100 bg-slate-50 opacity-60 grayscale cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")
              )}
            >
              <div className="flex min-h-10 items-center gap-3">
                <img
                  src={getDefaultRiderAvatarUrl(rider.avatar_id || rider.id)}
                  alt={`${rider.name} avatar`}
                  className="h-9 w-9 shrink-0 rounded-full object-cover"
                  loading="lazy"
                />

                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-bold", unavailable ? "text-slate-500" : "text-slate-900")}>
                    {rider.name}
                  </p>
                </div>

                <span className={cn(
                  "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                  rider.is_online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                )}>
                  {rider.is_online ? 'Online' : 'Offline'}
                </span>

                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                  isSelected ? "border-primary bg-primary" : "border-slate-300 bg-white",
                )} aria-hidden="true">
                  {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
