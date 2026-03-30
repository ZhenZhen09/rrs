import { useParams, useNavigate } from "react-router";
import { useData } from "../context/DataContext";
import { LiveTrackingMap } from "../components/LiveTrackingMap";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Clock, User as UserIcon, Bike, ChevronLeft, MapPin, XCircle, CheckCircle2 } from "lucide-react";
import { formatLocalDate } from "../utils/dateUtils";

export function LiveTrackingDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { requests, refreshData } = useData();

  const trackingRequest = requests.find((r) => r.request_id === id);

  if (!trackingRequest) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 text-slate-200">
          <Bike size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Tracking not found</h2>
        <p className="text-slate-500 mb-8 max-w-xs">This request might be completed or the link has expired.</p>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
          Go Back
        </Button>
      </div>
    );
  }

  const isCompleted = trackingRequest.delivery_status === 'completed';
  const isFailed = trackingRequest.delivery_status === 'failed';
  const isFinished = isCompleted || isFailed;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dynamic Floating Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.close()} 
              className="rounded-xl hover:bg-slate-100 h-10 w-10"
            >
              <ChevronLeft size={20} />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Track Delivery</h1>
                <Badge variant="outline" className={`${isFinished ? 'bg-slate-100 text-slate-500' : 'bg-[#00B14F]/10 text-[#009e46]'} border-none font-bold text-[10px] uppercase px-2 py-0`}>
                  {isFinished ? 'Offline' : 'Live'}
                </Badge>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                ID: {trackingRequest.request_id}
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-left ml-auto">Estimated Arrival</p>
              <p className="text-sm font-black text-slate-900">{trackingRequest.time_window}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-100" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/10">
                <UserIcon size={18} className="text-white" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rider Assigned</p>
                <p className="text-sm font-black text-slate-900">{trackingRequest.assigned_rider_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row h-full">
        {/* Main Map View */}
        <div className="flex-1 relative bg-slate-200">
           <LiveTrackingMap 
             pickup={trackingRequest.pickup_location}
             dropoff={trackingRequest.dropoff_location}
             current={trackingRequest.current_lat && trackingRequest.current_lng ? { lat: Number(trackingRequest.current_lat), lng: Number(trackingRequest.current_lng) } : undefined}
             riderName={trackingRequest.assigned_rider_name}
             status={trackingRequest.delivery_status}
             timeWindow={trackingRequest.time_window}
             remark={trackingRequest.rider_remark}
             hideSearch={true}
             containerClassName="h-full w-full"
           />
           
           {isFinished && (
             <div className="absolute inset-0 z-[1000] bg-white/60 backdrop-blur-[2px] flex items-center justify-center p-6">
                <Card className="max-w-sm w-full rounded-[2.5rem] border-none shadow-2xl p-10 text-center animate-in zoom-in-95 duration-300">
                   <div className={`w-20 h-20 ${isCompleted ? 'bg-[#00B14F]' : 'bg-rose-500'} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl ${isCompleted ? 'shadow-[#00B14F]/20' : 'shadow-rose-500/20'} text-white`}>
                      {isCompleted ? <CheckCircle2 size={40} /> : <XCircle size={40} />}
                   </div>
                   <h2 className="text-2xl font-black text-slate-900 mb-2">
                     {isCompleted ? 'Delivery Complete!' : 'Delivery Failed'}
                   </h2>
                   <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                     {isCompleted 
                       ? 'This task has been successfully delivered and tracking is now offline.' 
                       : 'This delivery attempt has failed. Please contact support for more information.'}
                   </p>
                   <Button onClick={() => window.close()} className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black font-black uppercase tracking-widest text-xs">
                     Close Window
                   </Button>
                </Card>
             </div>
           )}
        </div>

        {/* Info Sidebar (Mobile: Bottom Sheet style) */}
        <div className="w-full lg:w-[400px] bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col p-8 space-y-8 z-10 lg:h-[calc(100vh-73px)] overflow-y-auto">
            {/* Status Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-[900] text-slate-900 tracking-tight text-xl uppercase">Delivery Status</h3>
                <Badge className={`${isFailed ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#00B14F] hover:bg-[#00B14F]'} text-white px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase`}>
                  {trackingRequest.delivery_status?.replace('_', ' ')}
                </Badge>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm"><Clock className="h-5 w-5 text-amber-500" /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rider's Update</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                      "{trackingRequest.rider_remark || 'Preparing for your delivery...'}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">
                  Window
                </p>
                <div className="flex items-center gap-2">
                  <Clock size={12} className="text-slate-400" />
                  <p className="font-black text-slate-800 text-sm">
                    {trackingRequest.time_window}
                  </p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Date
                </p>
                <p className="font-black text-slate-800 text-sm">
                  {formatLocalDate(trackingRequest.delivery_date, "MMM d")}
                </p>
              </div>
            </div>

            {/* Rider Remark */}
            <div className="space-y-4">
               <h3 className="font-[900] text-slate-900 tracking-tight text-xl text-left">Rider</h3>
               <div className="flex items-center gap-4 p-5 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                    {trackingRequest.assigned_rider_name?.substring(0,1)}
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black text-slate-900">{trackingRequest.assigned_rider_name}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {trackingRequest.assigned_rider_id}</p>
                  </div>
               </div>
            </div>

            {/* Route Details */}
            <div className="space-y-4 flex-1">
              <h3 className="font-[900] text-slate-900 tracking-tight text-xl text-left">Route Details</h3>
              <div className="space-y-6 relative pl-8 text-left">
                <div className="absolute left-3 top-2 bottom-2 w-[2px] bg-slate-100 border-l-2 border-dashed" />
                
                <div className="relative">
                  <div className="absolute -left-[26px] top-1 w-4 h-4 bg-[#00B14F] rounded-full border-4 border-white shadow-sm" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup From</p>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{trackingRequest.pickup_location.address}</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute -left-[26px] top-1 w-4 h-4 bg-rose-500 rounded-full border-4 border-white shadow-sm" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Deliver To</p>
                    <p className="text-sm font-[900] text-slate-900 leading-tight mb-1">{trackingRequest.recipient_name}</p>
                    <p className="text-xs font-bold text-slate-600">{trackingRequest.dropoff_location.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              onClick={() => refreshData()}
              variant="outline" 
              className="w-full h-14 rounded-2xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all"
            >
              Refresh Info
            </Button>
        </div>
      </div>
    </div>
  );
}
