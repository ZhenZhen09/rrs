import React from "react";
import { Badge } from "../../ui/badge";
import { Card } from "../../ui/card";
import {
  Clock,
  Truck,
  User,
  Check,
  Building2,
  Calendar,
  AlertCircle,
  Ban,
  CheckCircle2,
} from "lucide-react";
import { cn } from "../../ui/utils";
import { DeliveryRequest } from "../../../types";
import { formatDateTime } from "../../../utils/dateUtils";
import { motion } from "framer-motion";

import { getGroupedStatus } from "../../../utils/statusMapping";
import { getAccountingBucket } from '../../../utils/requestAccounting';
import { formatOverdueDuration } from '../../../utils/eta';

interface RequestCardProps {
  request: DeliveryRequest;
  className?: string;
  isSelected: boolean;
  onClick: () => void;
  isMultiSelected?: boolean;
  onToggleSelection?: (requestId: string) => void;
  isActiveTab?: boolean;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
  className,
  isSelected,
  onClick,
  isMultiSelected = false,
  onToggleSelection,
  isActiveTab = false,
}) => {
  const getStatusConfig = (
    status: string,
    deliveryStatus?: string,
    isOptimistic?: boolean,
  ) => {
    if (isOptimistic) {
      return {
        label: "PROCESSING",
        color: "text-amber-500",
        dot: "bg-amber-500",
        pulse: true,
        icon: <Clock size={10} className="text-amber-500" />
      };
    }

    const group = getGroupedStatus(status, deliveryStatus);
    const bucket = getAccountingBucket({ status, delivery_status: deliveryStatus });
    const isAdminOverride = request.rider_remark?.includes('[Admin update by');
    const riderName = request.assigned_rider_name?.split(" ")[0] || "RIDER";
    const displayName = isAdminOverride ? "ADMIN" : riderName;
    const remark = request.rider_remark ? `: ${request.rider_remark.substring(0, 15)}${request.rider_remark.length > 15 ? '...' : ''}` : "";

    switch (group) {
      case 'done':
        return {
          label: (request.assigned_rider_id && !isAdminOverride) ? `COMPLETE (${riderName})` : `COMPLETE (${displayName})`,
          color: "text-emerald-500",
          dot: "bg-emerald-500",
          pulse: false,
          icon: <CheckCircle2 size={10} className="text-emerald-500" />
        };
      case 'failed':
        return {
          label: bucket === 'cancelled' ? 'CANCELLED' : (request.assigned_rider_id && !isAdminOverride) ? `FAILED (${riderName})${remark}` : `FAILED (${displayName})${remark}`,
          color: "text-rose-500",
          dot: "bg-rose-500",
          pulse: false,
          icon: <AlertCircle size={10} className="text-rose-500" />
        };
      case 'declined':
        return {
          label: "DECLINED",
          color: "text-red-600",
          dot: "bg-red-600",
          pulse: false,
          icon: <Ban size={10} className="text-red-600" />
        };
      case 'active':
        if (deliveryStatus === 'pending_review') {
          return {
            label: "REVIEW",
            color: "text-purple-600",
            dot: "bg-purple-500",
            pulse: true,
            icon: <AlertCircle size={10} className="text-purple-500" />
          };
        }
        return {
          label: deliveryStatus === 'in_progress' ? "ON ROUTE" : "ACTIVE",
          color: "text-sky-500",
          dot: "bg-sky-500",
          pulse: true,
          icon: <Truck size={10} className="text-sky-500" />
        };
      default:
        return {
          label: bucket === 'revision' ? 'FOR REVISION' : bucket === 'other' ? 'UNCLASSIFIED' : "PENDING",
          color: "text-amber-500",
          dot: "bg-amber-500",
          pulse: bucket === 'pending',
          icon: <Clock size={10} className="text-amber-500" />
        };
    }
  };

  const statusConfig = getStatusConfig(
    request.status,
    request.delivery_status,
    request.is_optimistic,
  );

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn("w-full max-w-[350px] relative", className, isActiveTab && "mt-3")}
    >
      {/* Rank Indicator - Top Left (Active Tab Only) */}
      {isActiveTab && request.queue_order && (
        <div className={cn(
          "absolute -top-2.5 -left-2.5 w-6 h-6 rounded-lg text-white text-[10px] font-black flex items-center justify-center shadow-md z-[60] border-2 border-white",
          request.queue_order === 1 ? "bg-emerald-500" : "bg-slate-900"
        )} aria-label={`Queue position ${request.queue_order} for ${request.assigned_rider_name || 'assigned rider'}`} title={`Queue position ${request.queue_order} for ${request.assigned_rider_name || 'assigned rider'}`}>
          {request.queue_order}
        </div>
      )}

      <Card
        className={cn(
          "rounded-lg border border-slate-100 transition-all duration-200 cursor-pointer group mb-1.5 relative overflow-hidden flex flex-col bg-white w-full",
          isSelected
            ? "shadow-md ring-1 ring-slate-200"
            : "shadow-sm hover:shadow-md",
          request.is_optimistic && request.status !== "submitted_waiting"
            ? "opacity-70 grayscale-[0.3] pointer-events-none"
            : "",
        )}
        onClick={onClick}
      >
        {/* Magic Selection Highlight */}
        {isSelected && (
          <motion.div 
            layoutId="active-highlight"
            className="absolute inset-0 border-2 border-emerald-500/30 bg-emerald-500/5 pointer-events-none rounded-lg z-50"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        {/* 1. Header Section */}
        <div className="p-2.5 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#F0FDF4] flex items-center justify-center shrink-0">
              <Truck size={16} className="text-[#22C55E]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">
                Delivery
              </span>
              <h2 className="text-sm font-black text-slate-900 tracking-tighter mt-0.5 leading-none">
                #{request.request_id.slice(-8).toUpperCase()}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleSelection && (
              <button
                type="button"
                aria-label={`${isMultiSelected ? 'Deselect' : 'Select'} request ${request.request_id}`}
                aria-pressed={isMultiSelected}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-md border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95 md:h-6 md:w-6",
                  isMultiSelected
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                    : "border-slate-400 bg-white text-transparent hover:border-emerald-500 hover:bg-emerald-50",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection(request.request_id);
                }}
              >
                {isMultiSelected && <Check data-checkbox-check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />}
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Divider */}
        <div className="px-2.5 mt-2">
          <div className="h-[1px] bg-slate-100 w-full" />
        </div>

        {/* 2. Content Rows Section */}
        <div className="p-2.5 py-2.5 space-y-2.5">
          {/* Row 1: Who */}
          <div className="flex items-center gap-3">
            <div className="w-4 flex justify-center shrink-0">
              <User size={14} className="text-[#581C87]" />
            </div>
            <span className="text-[11px] font-[900] text-slate-900 truncate leading-none">
              {request.recipient_name}
            </span>
          </div>

          {/* Row 2: Where */}
          <div className="flex items-start gap-3">
            <div className="w-4 flex justify-center shrink-0 mt-0.5">
              <Building2 size={14} className="text-slate-400" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate leading-none">
                {(() => {
                  const name =
                    request.dropoff_location.businessName || "General Pickup";
                  return name.length > 30 ? name.substring(0, 30) + "..." : name;
                })()}
              </span>
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-1 leading-none">
                BY:{" "}
                {(request.on_behalf_of || request.requester_name || 'Unknown requester').toUpperCase()}
                {request.on_behalf_of &&
                  request.requester_name &&
                  request.on_behalf_of !== request.requester_name && (
                    <span className="opacity-60 ml-1 italic">
                      ({request.requester_name.split(" ")[0]})
                    </span>
                  )}
              </span>
            </div>
          </div>

          {/* Row 3: Time */}
          <div className="flex items-center gap-3">
            <div className="w-4 flex justify-center shrink-0">
              <Clock size={14} className="text-[#3B82F6]" />
            </div>
            <span className="text-[10px] font-black text-slate-900 truncate tracking-tight leading-none">
              {request.time_window}
            </span>
          </div>

          {(request.state === 'At Risk' || request.state === 'Overdue' || request.is_overdue) && (
            <div className={cn("flex items-center gap-3 rounded-md px-2 py-1.5 border", request.state === 'At Risk' ? 'bg-amber-50 border-amber-100' : 'bg-rose-50 border-rose-100')}>
              <div className="w-4 flex justify-center shrink-0">
                <AlertCircle size={14} className={request.state === 'At Risk' ? 'text-amber-600' : 'text-rose-600'} />
              </div>
              <span className={cn("text-[10px] font-black uppercase tracking-tight", request.state === 'At Risk' ? 'text-amber-700' : 'text-rose-700')}>
                {request.state === 'At Risk' ? 'AT RISK' : 'OVERDUE'}
                {request.scheduled_end_at && ` · Due ${formatDateTime(request.scheduled_end_at, 'h:mm a')}`}
                {request.state === 'At Risk' ? ` · ${request.remaining_minutes ?? 0} min remaining` : ` · ${request.overdue_label || `${formatOverdueDuration(request.overdue_minutes ?? 0)} overdue`}`}
              </span>
            </div>
          )}

          {/* Row 4: Approved At (Active/Done only) */}
          {(isActiveTab ||
            request.status === "approved" ||
            request.delivery_status === "completed") && (
            <div className="flex items-center gap-3">
              <div className="w-4 flex justify-center shrink-0">
                <Calendar size={14} className="text-[#22C55E]" />
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  Approved:
                </span>
                <span className="text-[10px] font-black text-slate-900 truncate tracking-tight leading-none">
                  {formatDateTime(request.approved_at || request.updated_at, "MMM d, h:mm a")}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Horizontal Divider */}
        <div className="px-2.5">
          <div className="h-[1px] bg-slate-100 w-full" />
        </div>

        {/* 3. Footer Section */}
        <div className="px-2.5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                statusConfig.dot,
                statusConfig.pulse && "animate-pulse",
              )}
            />
            <div className="flex items-center gap-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                STATUS
              </span>
              <div className="flex items-center gap-1">
                {statusConfig.icon}
                <span
                  className={cn(
                    "text-[8px] font-black uppercase tracking-widest",
                    statusConfig.color,
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>

          {request.assigned_rider_name && (
            <Badge
              variant="outline"
              className="h-4 border-slate-100 font-black text-[6px] uppercase tracking-tighter bg-slate-50 text-slate-400 px-1 rounded"
            >
              {request.assigned_rider_name.split(" ")[0]}
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
};
