import React from 'react';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Clock, MapPin, Package, Truck, Bike, Loader2, AlertTriangle, WifiOff, User, CheckCheck } from 'lucide-react';
import { cn } from '../../ui/utils';
import { DeliveryRequest } from '../../../types';
import { formatLocalDate } from '../../../utils/dateUtils';
import { getTypeIcon, getTypeColor } from '../../../utils/categoryUtils';

interface RequestCardProps {
  request: DeliveryRequest;
  isSelected: boolean;
  onClick: () => void;
  isMultiSelected?: boolean;
  onToggleSelection?: (requestId: string) => void;
}

export const RequestCard: React.FC<RequestCardProps> = ({ 
  request, 
  isSelected, 
  onClick,
  isMultiSelected = false,
  onToggleSelection
}) => {
  const getStatusConfig = (status: string, deliveryStatus?: string, isOptimistic?: boolean) => {
    if (isOptimistic) {
      return { label: 'PROCESSING', color: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500 animate-pulse' };
    }
    if (status === 'approved' && deliveryStatus === 'in_progress') {
      return { label: 'ON THE WAY', color: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' };
    }
    switch (status) {
      case 'pending':
      case 'submitted_waiting':
        return { label: 'PENDING', color: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' };
      case 'returned_for_revision':
        return { label: 'REVISION', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' };
      case 'approved':
        return { label: 'ACTIVE', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' };
      case 'disapproved':
        return { label: 'DECLINED', color: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' };
      default:
        return { label: status.toUpperCase(), color: 'bg-slate-50 text-slate-700 border-slate-100', dot: 'bg-slate-500' };
    }
  };

  const statusConfig = getStatusConfig(request.status, request.delivery_status, request.is_optimistic);
  const isRevision = request.status === 'returned_for_revision';
  const isResubmitted = request.status === 'submitted_waiting';

  const hasException = request.exceptions && request.exceptions.length > 0;
  const isCritical = request.exception_severity === 'critical';

  return (
    <Card 
      className={cn(
        "rounded-[1.5rem] border-2 transition-all cursor-pointer group mb-4 relative overflow-hidden flex",
        isSelected 
          ? "border-primary bg-white shadow-xl shadow-primary/10 ring-4 ring-primary/5" 
          : "border-transparent bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-lg",
        // Senior UX: Resubmitted items (submitted_waiting) get full opacity immediately to signal restoration,
        // while other optimistic states (like initial submission or approval) stay dimmed during sync.
        request.is_optimistic && !isResubmitted ? "opacity-70 grayscale-[0.3] pointer-events-none" : "",
        isRevision ? "opacity-50 grayscale-[0.2]" : "",
        hasException && isCritical ? "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse" : "",
        hasException && !isCritical ? "border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)]" : ""
      )}
      onClick={onClick}
    >
      {/* Selection Strip (Fixed Width) */}
      {onToggleSelection && (
        <div 
          className={cn(
            "w-12 shrink-0 flex items-center justify-center border-r transition-all",
            isMultiSelected ? "bg-primary/10 border-primary/20" : "bg-slate-100/30 border-slate-100 hover:bg-slate-100/50"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(request.request_id);
          }}
        >
          <div className={cn(
            "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm",
            isMultiSelected 
              ? "bg-primary border-primary scale-110" 
              : "bg-white border-slate-200 group-hover:border-slate-300"
          )}>
            {isMultiSelected && <CheckCheck className="h-3.5 w-3.5 text-white" strokeWidth={4} />}
          </div>
        </div>
      )}

      <div className="p-5 flex-1 min-w-0">
        {/* Transaction ID Header */}
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-[900] text-slate-900 tracking-tight">
              #{request.request_id.slice(-8)}
            </h2>
            {isRevision && (
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50/50 text-indigo-600 font-black text-[8px] uppercase tracking-widest px-2 py-0">
                For Revision
              </Badge>
            )}
          </div>
        
        {/* Minimalist Status Pip (Watchdog Indicator) */}
        {hasException && (
          <div className="flex items-center gap-2">
            <div className="relative flex h-3 w-3">
              {isCritical && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              )}
              <span 
                className={cn(
                  "relative inline-flex rounded-full h-3 w-3 shadow-sm border border-white",
                  isCritical ? "bg-rose-500" : "bg-amber-500"
                )}
                title={Array.isArray(request.exceptions) ? request.exceptions.map(e => e.replace('_', ' ')).join(' & ') : 'Exception detected'}
              />
            </div>
          </div>
        )}
      </div>

      {/* Time & Type Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <span className="text-[11px] font-black text-slate-600 tracking-tight">{request.time_window}</span>
        </div>
        <div className="flex items-center gap-2">
          {request.is_optimistic && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse font-black text-[9px] uppercase tracking-wider px-2 py-0.5">
              <Loader2 className="h-2 w-2 mr-1 animate-spin" />
              Syncing
            </Badge>
          )}
          <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider border", getTypeColor(request.request_type))}>
            <span className="mr-1.5">{getTypeIcon(request.request_type)}</span>
            {request.request_type === 'Delivery/Pickup' ? 'PICKUP' : request.request_type}
          </Badge>
        </div>
      </div>

      {/* Requester Info */}
      <div className="mb-4">
        <h4 className="text-base font-[900] text-slate-900 tracking-tight group-hover:text-primary transition-colors">
          {request.requester_name}
        </h4>
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-1 h-1 rounded-full bg-slate-300" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{request.requester_department}</p>
        </div>
      </div>

      {/* Location Route - Updated to match design */}
      <div className="space-y-4 relative py-1">
        <div className="absolute left-[7px] top-[12px] bottom-[12px] w-[1px] border-l border-dashed border-slate-200" />
        
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white z-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-500 line-clamp-1 leading-none">
              {request.pickup_location.address}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-rose-500 bg-white z-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-slate-800 line-clamp-1 leading-none">
              {request.dropoff_location.address}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusConfig.dot)} />
          <span className="text-[9px] font-black text-slate-400 tracking-[0.1em] uppercase">{statusConfig.label}</span>
        </div>
        {request.delivery_status === 'in_progress' && (
          <Button 
            size="sm" 
            onClick={(e) => {
              e.stopPropagation();
              window.open(`/admin/tracking/${request.request_id}`, '_blank');
            }}
            className="h-8 px-3 rounded-xl bg-[#00B14F] hover:bg-[#009e46] text-white font-black text-[9px] uppercase tracking-widest animate-pulse"
          >
            <Bike className="h-3 w-3 mr-1.5" />
            Track
          </Button>
        )}
      </div>
    </div>

      {/* Active Indicator Bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
      )}
    </Card>
  );
};
