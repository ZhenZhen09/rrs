import React from "react";
import { Badge } from "../../ui/badge";
import { Card } from "../../ui/card";
import {
  Clock,
  Truck,
  User,
  CheckCheck,
  Building2,
  Calendar,
} from "lucide-react";
import { cn } from "../../ui/utils";
import { DeliveryRequest } from "../../../types";
import { formatDateTime } from "../../../utils/dateUtils";

interface RequestCardProps {
  request: DeliveryRequest;
  isSelected: boolean;
  onClick: () => void;
  isMultiSelected?: boolean;
  onToggleSelection?: (requestId: string) => void;
  isActiveTab?: boolean;
}

export const RequestCard: React.FC<RequestCardProps> = ({
  request,
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
      };
    }
    if (deliveryStatus === "completed") {
      return {
        label: "COMPLETED",
        color: "text-emerald-500",
        dot: "bg-emerald-500",
        pulse: false,
      };
    }
    if (deliveryStatus === "failed") {
      return {
        label: "FAILED",
        color: "text-rose-500",
        dot: "bg-rose-500",
        pulse: false,
      };
    }
    if (status === "approved" && deliveryStatus === "in_progress") {
      return {
        label: "ON ROUTE",
        color: "text-sky-500",
        dot: "bg-sky-500",
        pulse: true,
      };
    }
    switch (status) {
      case "pending":
      case "submitted_waiting":
        return {
          label: "PENDING",
          color: "text-blue-500",
          dot: "bg-blue-500",
          pulse: true,
        };
      case "returned_for_revision":
        return {
          label: "REVISION",
          color: "text-indigo-500",
          dot: "bg-indigo-500",
          pulse: true,
        };
      case "approved":
        return {
          label: "ACTIVE",
          color: "text-emerald-500",
          dot: "bg-emerald-500",
          pulse: true,
        };
      case "disapproved":
        return {
          label: "DECLINED",
          color: "text-rose-500",
          dot: "bg-rose-500",
          pulse: false,
        };
      default:
        return {
          label: status.toUpperCase(),
          color: "text-slate-500",
          dot: "bg-slate-500",
          pulse: false,
        };
    }
  };

  const statusConfig = getStatusConfig(
    request.status,
    request.delivery_status,
    request.is_optimistic,
  );

  return (
    <Card
      className={cn(
        "rounded-lg border border-slate-100 transition-all duration-200 cursor-pointer group mb-1.5 relative overflow-hidden flex flex-col bg-white max-w-[350px]",
        isSelected
          ? "shadow-md ring-1 ring-slate-200"
          : "shadow-sm hover:shadow-md",
        request.is_optimistic && request.status !== "submitted_waiting"
          ? "opacity-70 grayscale-[0.3] pointer-events-none"
          : "",
      )}
      onClick={onClick}
    >
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
              className={cn(
                "w-6 h-6 rounded border flex items-center justify-center transition-all",
                isMultiSelected
                  ? "bg-slate-900 border-slate-900"
                  : "bg-white border-slate-100 hover:border-slate-200",
              )}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelection(request.request_id);
              }}
            >
              {isMultiSelected ? (
                <CheckCheck className="h-3 w-3 text-white" strokeWidth={4} />
              ) : (
                <div className="w-2 h-2 rounded-full border border-slate-100" />
              )}
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
              {(request.on_behalf_of || request.requester_name).toUpperCase()}
              {request.on_behalf_of &&
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
                {formatDateTime(request.updated_at, "MMM d, h:mm a")}
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

        {request.assigned_rider_name && (
          <Badge
            variant="outline"
            className="h-4 border-slate-100 font-black text-[6px] uppercase tracking-tighter bg-slate-50 text-slate-400 px-1 rounded"
          >
            {request.assigned_rider_name.split(" ")[0]}
          </Badge>
        )}
      </div>

      {isSelected && (
        <div className="absolute inset-0 border ring-1 ring-emerald-500 pointer-events-none rounded-lg z-50 opacity-10" />
      )}
    </Card>
  );
};
