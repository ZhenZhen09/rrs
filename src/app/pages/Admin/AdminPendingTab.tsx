import { Card } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Package, MapPin, FileText, Banknote, Info, Hash, User, Loader2, Clock } from "lucide-react";
import { formatLocalDate } from "../../utils/dateUtils";
import { DeliveryRequest } from "../../types";
import { cn } from "../../components/ui/utils";

interface AdminPendingTabProps {
  pendingRequests: DeliveryRequest[];
  onApprove: (req: DeliveryRequest) => void;
  onDecline: (req: DeliveryRequest) => void;
  onReview: (req: DeliveryRequest) => void;
}

export function AdminPendingTab({ 
  pendingRequests, 
  onApprove, 
  onDecline, 
  onReview 
}: AdminPendingTabProps) {
  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "Bank Transaction":
        return <Banknote className="h-3 w-3" />;
      case "Countering":
        return <FileText className="h-3 w-3" />;
      case "Delivery/Pickup":
        return <Package className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case "Bank Transaction": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Countering": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Delivery/Pickup": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {!Array.isArray(pendingRequests) || pendingRequests.length === 0 ? (
        <div className="col-span-full py-40 flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
          <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
            <Package className="h-10 w-10 text-slate-200" />
          </div>
          <p className="text-slate-400 font-black text-xl tracking-tight">
            No pending tasks
          </p>
          <p className="text-slate-400 text-sm mt-1">
            New requests will appear here for review.
          </p>
        </div>
      ) : (
        pendingRequests.map((req) => (
          <Card
            key={req.request_id}
            className={cn(
              "border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white transition-all hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] hover:-translate-y-1.5 group flex flex-col relative",
              (req.urgency_level === 'High' || req.urgency_level === 'Urgent') ? "ring-2 ring-orange-500/20 border-orange-100 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "",
              (req.is_optimistic || req.status === 'returned_for_revision') ? "opacity-60 grayscale-[0.5] pointer-events-none select-none" : ""
            )}
          >
            {/* Urgency Pulsing Dot for High Urgency */}
            {(req.urgency_level === 'High' || req.urgency_level === 'Urgent') && !req.is_optimistic && req.status !== 'returned_for_revision' && (
              <div className="absolute top-6 right-6">
                <div className="h-2 w-2 rounded-full bg-orange-500 animate-ping absolute" />
                <div className="h-2 w-2 rounded-full bg-orange-500 relative" />
              </div>
            )}
            
            {(req.is_optimistic || req.status === 'returned_for_revision') && (
              <div className="absolute top-6 right-6">
                <Badge variant="secondary" className={cn(
                  "font-black text-[9px] uppercase tracking-wider",
                  req.status === 'returned_for_revision' ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-blue-100 text-blue-700 border-blue-200 animate-pulse"
                )}>
                  {req.status === 'returned_for_revision' ? (
                    <>
                      <Clock className="h-2 w-2 mr-1" />
                      Awaiting Revision
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-2 w-2 mr-1 animate-spin" />
                      Processing
                    </>
                  )}
                </Badge>
              </div>
            )}

            {/* Header Section */}
            <div className="p-8 pb-0">
              <div className="flex items-center justify-between mb-6">
                <Badge
                  variant="outline"
                  className="bg-amber-50/50 text-amber-600 border-amber-100 font-black uppercase text-[10px] tracking-[0.1em] px-4 py-1.5 rounded-full"
                >
                  {req.time_window}
                </Badge>
                <span className="text-[11px] font-black text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full uppercase tracking-tighter">
                  {formatLocalDate(req.delivery_date, "MMM d, yyyy")}
                </span>
              </div>

              {/* Redesigned Admin Info Area */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50">
                    <Hash size={10} className="text-slate-400" />
                    <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-tighter">
                      {req.request_id.replace('req_', '')}
                    </span>
                  </div>
                  <Badge className={cn(`border ${getTypeColor(req.request_type)} flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none`)}>
                    {getTypeIcon(req.request_type)}
                    {req.request_type}
                  </Badge>
                </div>

                <div className="bg-slate-50/80 p-5 rounded-[1.5rem] border border-slate-100 group-hover:bg-slate-50 transition-colors">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 opacity-70">
                    Requester Name
                  </p>
                  <h4 className="font-[900] text-slate-900 text-lg leading-none tracking-tight">
                    {req.requester_name}
                  </h4>
                  <p className="text-[10px] text-primary font-black mt-2 uppercase tracking-widest flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                    {req.requester_department}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="px-8 pb-8 space-y-6 flex-1">
              <div className="space-y-3">
                <div className="bg-slate-50/30 p-4 rounded-2xl border border-dashed border-slate-200 group-hover:bg-white transition-colors">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <MapPin size={10} className="text-[#00B14F]" />{" "}
                    Origin
                  </p>
                  <h4 className="font-bold text-slate-700 text-[11px] leading-tight line-clamp-1">
                    {req.pickup_location.address}
                  </h4>
                  {req.pickup_contact_name && (
                    <p className="text-[9px] font-bold text-[#00B14F] mt-1 flex items-center gap-1">
                      <User size={8} /> {req.pickup_contact_name}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50/30 p-4 rounded-2xl border border-dashed border-slate-200 group-hover:bg-white transition-colors">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <MapPin size={10} className="text-rose-500" />{" "}
                    Destination
                  </p>
                  <h4 className="font-bold text-slate-700 text-[11px] leading-tight line-clamp-1">
                    {req.dropoff_location.address}
                  </h4>
                  <p className="text-[9px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                    <User size={8} /> {req.recipient_name}
                  </p>
                </div>
              </div>

              {req.status === 'returned_for_revision' ? (
                <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100/50 text-center">
                   <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center justify-center gap-2">
                     <Clock size={12} /> Pending User Correction
                   </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => onReview(req)}
                    variant="outline"
                    className="w-full rounded-2xl border-slate-200 text-slate-700 font-[900] text-[10px] uppercase tracking-widest h-12 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <FileText size={14} className="mr-2 text-blue-500" /> Review Request
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => onApprove(req)}
                      className="flex-1 rounded-2xl bg-[#00B14F] hover:bg-[#009e46] text-white font-[900] text-[10px] uppercase tracking-widest h-14 shadow-lg shadow-[#00B14F]/20 transition-all active:scale-95"
                    >
                      Approve & Assign
                    </Button>
                    <Button
                      onClick={() => onDecline(req)}
                      variant="ghost"
                      className="flex-1 rounded-2xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 font-[900] text-[10px] uppercase tracking-widest h-14 transition-all active:scale-95 border border-transparent hover:border-rose-100"
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
