import React, { useState } from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  Check, 
  X, 
  ChevronRight, 
  ChevronLeft,
  RotateCcw,
  Box, 
  Info, 
  Clock,
  LayoutDashboard,
  ShieldCheck,
  Package,
  Loader2,
  Bike,
  MessageSquare,
  AlertOctagon,
  WifiOff
} from 'lucide-react';
import { DispatchMapView } from './DispatchMapView';
import { RiderSelectionList } from './RiderSelectionList';
import { DeliveryRequest, User as UserType } from '../../../types';
import { formatLocalDate, formatDateTime } from '../../../utils/dateUtils';
import { cn } from '../../ui/utils';
import { useData } from '../../../context/DataContext';

import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';

interface RequestDetailsPanelProps {
  request: DeliveryRequest | null;
  riders: UserType[];
  activeRequests: DeliveryRequest[];
  onApprove: (riderId: string, remark: string) => void;
  onDecline: (remark: string) => void;
  isSubmitting: boolean;
  onBack?: () => void;
  readOnly?: boolean;
}

export const RequestDetailsPanel: React.FC<RequestDetailsPanelProps> = ({
  request,
  riders,
  activeRequests,
  onApprove,
  onDecline,
  isSubmitting,
  onBack,
  readOnly = false
}) => {
  const { updateDeliveryStatus } = useData();
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [riderSortBy, setRiderSortBy] = useState('nearest');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean, status: string | null }>({
    open: false,
    status: null
  });

  if (!request) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50/30 p-10 text-center">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-sm flex items-center justify-center mb-8">
          <LayoutDashboard className="h-10 w-10 text-slate-200" />
        </div>
        <h3 className="text-2xl font-[900] text-slate-400 tracking-tight">Select a request</h3>
        <p className="text-slate-400 font-medium max-w-xs mt-2 italic">Choose a delivery task from the left list to view details.</p>
      </div>
    );
  }

  const isPending = request.status === 'pending' || request.status === 'submitted_waiting';
  const isApproved = request.status === 'approved';
  const isDisapproved = request.status === 'disapproved';
  const isReturned = request.status === 'returned_for_revision';
  const isCompleted = request.delivery_status === 'completed';
  const isFailed = request.delivery_status === 'failed';
  const isTerminal = isDisapproved || isCompleted || isFailed;

  const handleReturnForRevision = async () => {
    if (!adminNote) {
      toast.error("Please provide a reason in the Admin Note field.");
      return;
    }
    
    // We need to add returnForRevision to the context
    const { returnForRevision } = useData();
    
    try {
      await returnForRevision(request.request_id, adminNote);
      toast.success("Request returned for revision.");
      if (onBack) onBack();
    } catch (err) {
      toast.error("Failed to return request.");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await updateDeliveryStatus(request.request_id, newStatus as any);
      setConfirmModal({ open: false, status: null });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'assigned': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'in_progress': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'failed': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const renderStatusBadge = () => {
    if (isPending) {
      return (
        <Badge variant="outline" className="font-black text-[8px] md:text-[10px] tracking-widest px-2 md:px-3 shrink-0 bg-amber-50 text-amber-600 border-amber-100">
          PENDING
        </Badge>
      );
    }
    if (isReturned) {
      return (
        <Badge variant="outline" className="font-black text-[8px] md:text-[10px] tracking-widest px-2 md:px-3 shrink-0 bg-indigo-50 text-indigo-600 border-indigo-100">
          REVISION
        </Badge>
      );
    }
    if (isDisapproved) {
      return (
        <Badge variant="outline" className="font-black text-[8px] md:text-[10px] tracking-widest px-2 md:px-3 shrink-0 bg-rose-50 text-rose-600 border-rose-100">
          DECLINED
        </Badge>
      );
    }
    if (isCompleted) {
      return (
        <Badge variant="outline" className="font-black text-[8px] md:text-[10px] tracking-widest px-2 md:px-3 shrink-0 bg-emerald-50 text-emerald-600 border-emerald-100">
          COMPLETED
        </Badge>
      );
    }
    if (isFailed) {
      return (
        <Badge variant="outline" className="font-black text-[8px] md:text-[10px] tracking-widest px-2 md:px-3 shrink-0 bg-rose-50 text-rose-600 border-rose-100">
          FAILED
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-black text-[8px] md:text-[10px] tracking-widest px-2 md:px-3 shrink-0 bg-blue-50 text-blue-600 border-blue-100">
        APPROVED
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      {/* Fixed Header (shrink-0) */}
      <div className="shrink-0 px-4 md:px-8 py-4 md:py-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden rounded-full shrink-0 h-10 w-10 hover:bg-slate-50">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </Button>
          )}
          <div className="flex flex-col min-w-0">
            <h2 className="text-lg md:text-xl font-[900] text-slate-900 tracking-tight flex items-center gap-2 md:gap-3 text-nowrap">
              <span className="truncate">#{request.request_id.slice(-6).toUpperCase()}</span>
              {renderStatusBadge()}
            </h2>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-0.5 truncate">
              {formatLocalDate(request.delivery_date, 'MMM d')} • {request.time_window}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {!readOnly && isPending ? (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleReturnForRevision}
                disabled={isSubmitting}
                className="hidden sm:flex h-10 md:h-12 px-4 md:px-6 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-2"
              >
                <RotateCcw size={14} />
                Return
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onDecline(adminNote)}
                disabled={isSubmitting}
                className="hidden sm:flex h-10 md:h-12 px-4 md:px-6 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest text-rose-500 hover:bg-rose-50 transition-all"
              >
                Decline
              </Button>
              <Button 
                size="sm"
                disabled={!selectedRiderId || isSubmitting}
                onClick={() => onApprove(selectedRiderId, adminNote)}
                className="h-10 md:h-12 px-4 md:px-8 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" /> : <Check className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={3} />}
                <span className="hidden xs:inline">Approve & Assign</span>
                <span className="inline xs:hidden">Assign</span>
              </Button>
            </>
          ) : isApproved && !isTerminal ? (
            <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 animate-in fade-in duration-500">
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Confirmed</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Scrollable Content (flex-1 overflow-auto min-h-0) */}
      <div className="flex-1 overflow-auto min-h-0">
        {request.exceptions && request.exceptions.length > 0 && (
          <div className={cn(
            "mx-4 md:mx-8 mt-4 p-3 pr-4 rounded-[1.25rem] flex items-center gap-3 animate-in slide-in-from-top-4 duration-500",
            request.exception_severity === 'critical' ? "bg-rose-50 border border-rose-100/50" : "bg-amber-50 border border-amber-100/50"
          )}>
            <div className="relative flex h-3 w-3 ml-2">
              {request.exception_severity === 'critical' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              )}
              <span className={cn(
                "relative inline-flex rounded-full h-3 w-3 shadow-sm",
                request.exception_severity === 'critical' ? "bg-rose-500" : "bg-amber-500"
              )}></span>
            </div>
            
            <div className="flex-1">
              <p className={cn("text-[11px] font-black uppercase tracking-tight", request.exception_severity === 'critical' ? "text-rose-900" : "text-amber-900")}>
                {request.exceptions.includes('signal_lost') ? "SIGNAL LOST" : "RIDER STAGNANT"}
              </p>
            </div>

            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.open(`tel:${request.recipient_contact}`)}
              className={cn("h-7 px-3 rounded-lg font-black text-[9px] uppercase tracking-widest", request.exception_severity === 'critical' ? "text-rose-600 hover:bg-rose-100 hover:text-rose-700" : "text-amber-600 hover:bg-amber-100 hover:text-amber-700")}
            >
              Call Rider
            </Button>
          </div>
        )}

        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {/* Map Section */}
          <div className="h-[250px] md:h-[350px] w-full shrink-0">
            <DispatchMapView 
              origin={request.pickup_location} 
              destination={request.dropoff_location} 
              current={request.current_lat && request.current_lng ? { lat: request.current_lat, lng: request.current_lng } : null}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 md:gap-8">
            {/* Logistics Left Side (3/5) */}
            <div className="lg:col-span-3 space-y-6 md:space-y-8">
              {/* Logistics Details Card */}
              <Card className="p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border-none shadow-[0_15px_50px_rgba(0,0,0,0.03)] bg-white space-y-6 md:space-y-8">
                <div className="flex items-center gap-2">
                  <div className="h-1 w-6 md:h-1.5 md:w-8 bg-primary rounded-full" />
                  <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Logistics Details</span>
                </div>

                <div className="space-y-6 md:space-y-8">
                  {/* Origin */}
                  <div className="flex gap-4 md:gap-5">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-4.5 w-4.5 md:h-5 md:w-5 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Origin (Pickup)</p>
                      <p className="text-xs md:text-sm font-[900] text-slate-900 leading-relaxed break-words">{request.pickup_location.address}</p>
                      <p className="text-[10px] md:text-[11px] font-bold text-[#5a5a5a] mt-0.5 md:mt-1 italic break-words">
                        {request.pickup_location.businessName || 'N/A'} • {request.pickup_location.landmarks || 'None'}
                      </p>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex gap-4 md:gap-5">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-4.5 w-4.5 md:h-5 md:w-5 text-rose-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Destination (Drop-off)</p>
                      <p className="text-xs md:text-sm font-[900] text-slate-900 leading-relaxed break-words">{request.dropoff_location.address}</p>
                      <p className="text-[10px] md:text-[11px] font-bold text-[#5a5a5a] mt-0.5 md:mt-1 italic break-words">
                        {request.dropoff_location.businessName || 'N/A'} • {request.dropoff_location.landmarks || 'None'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 pt-4 md:pt-6 border-t border-slate-50">
                    {/* Contact Person */}
                    <div className="flex gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 md:h-4.5 md:w-4.5 text-blue-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Person</p>
                        <p className="text-[11px] md:text-xs font-black text-slate-800 truncate">{request.pickup_contact_name || request.requester_name}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-500 truncate">{request.pickup_contact_mobile || 'No phone'}</p>
                      </div>
                    </div>

                    {/* Recipient */}
                    <div className="flex gap-3 md:gap-4">
                      <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 md:h-4.5 md:w-4.5 text-purple-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Recipient</p>
                        <p className="text-[11px] md:text-xs font-black text-slate-800 truncate">{request.recipient_name}</p>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-500 truncate">{request.recipient_contact || 'No phone'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Personnel Instructions */}
                  <div className="p-4 md:p-6 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 md:gap-4">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                      <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Task Instructions</p>
                      <p className="text-[11px] md:text-xs font-bold text-slate-700 leading-relaxed italic break-words">
                        {request.personnel_instructions || (request.admin_remark?.startsWith('Instructions: ') ? request.admin_remark.replace('Instructions: ', '') : 'No specific task instructions provided.')}
                      </p>
                    </div>
                  </div>

                  {/* Admin Remark (Existing) */}
                  {request.admin_remark && !request.admin_remark.startsWith('Instructions: ') && (
                    <div className="p-4 md:p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-3 md:gap-4">
                      <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                        <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Admin Remark</p>
                        <p className="text-[11px] md:text-xs font-black text-blue-700 leading-relaxed break-words">
                          {request.admin_remark}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rider Feedback / Outcome - NEW SECTION */}
                  {isTerminal && (request.rider_remark || request.completed_at) && (
                    <div className="p-6 md:p-8 bg-slate-900 rounded-[2rem] text-white space-y-5 md:space-y-6 shadow-xl shadow-slate-200/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="h-4.5 w-4.5 md:h-5 md:w-5 text-white" />
                          </div>
                          <div>
                            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Rider Feedback / Outcome</p>
                            <h4 className="text-xs md:text-sm font-black text-white uppercase tracking-tight">Delivery Final Report</h4>
                          </div>
                        </div>
                        {request.completed_at && (
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed At</p>
                             <p className="text-xs font-bold text-white/90">{formatLocalDate(request.completed_at, 'MMM d, h:mm a')}</p>
                          </div>
                        )}
                      </div>
                      
                      {request.rider_remark && (
                        <div className="bg-white/5 p-5 md:p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-3 opacity-20">
                              <MessageSquare className="h-10 w-10 text-white" />
                           </div>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Rider's Remarks
                           </p>
                           <p className="text-xs md:text-sm font-bold text-white/95 leading-relaxed italic relative z-10 break-words">
                             "{request.rider_remark}"
                           </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {!readOnly && isPending && (
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-xs md:text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                    Admin Note
                  </h3>
                  <Card className="p-4 md:p-6 rounded-[1.5rem] border-none shadow-sm bg-white">
                    <Textarea 
                      placeholder="Instructions for the rider..."
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      className="min-h-[100px] md:min-h-[120px] rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold text-xs md:text-sm resize-none transition-all p-3 md:p-4 shadow-none focus:ring-0"
                    />
                  </Card>
                </div>
              )}
            </div>

            {/* Rider Assignment / Status Section */}
            <div className="lg:col-span-2 space-y-6">
              {!readOnly && isPending ? (
                <>
                  <RiderSelectionList 
                    riders={riders}
                    activeRequests={activeRequests}
                    selectedRiderId={selectedRiderId}
                    onSelect={setSelectedRiderId}
                    pickupLocation={{ lat: request.pickup_location.lat, lng: request.pickup_location.lng }}
                    sortBy={riderSortBy}
                    onSortChange={setRiderSortBy}
                    deliveryDate={request.delivery_date}
                    timeWindow={request.time_window}
                    currentRequestId={request.request_id}
                  />

                  {selectedRiderId && (
                    <div className="pt-2 md:pt-4 animate-in slide-in-from-bottom-2 duration-300">
                      <Button
                        onClick={() => onApprove(selectedRiderId, adminNote)}
                        disabled={isSubmitting}
                        className="w-full h-14 md:h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs md:text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                            <span>Assigning...</span>
                          </div>
                        ) : (
                          `Assign to ${riders.find(r => r.id === selectedRiderId)?.name.split(' ')[0]}`
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : isApproved && (
                <div className="space-y-6">
                  <h3 className="text-sm font-[900] text-slate-900 tracking-tight flex items-center gap-2">
                    <Bike className="h-4 w-4 text-primary" />
                    Current Assignment
                  </h3>
                  
                  <Card className="p-6 rounded-[2rem] border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-all group-hover:scale-110" />
                    
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20">
                        {request.assigned_rider_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Rider</p>
                        <h4 className="text-lg font-[900] text-slate-900 leading-tight">{request.assigned_rider_name}</h4>
                        <Badge variant="outline" className={cn("mt-2 border font-black text-[9px] uppercase tracking-wider px-2.5", getStatusColor(request.delivery_status))}>
                          {request.delivery_status?.replace('_', ' ') || 'ASSIGNED'}
                        </Badge>
                      </div>
                    </div>

                    {!readOnly && !isTerminal && (
                      <div className="mt-8 space-y-4 relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Admin Status Controls</p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={true}
                            onClick={() => handleStatusChange('assigned')}
                            className={cn("h-11 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-100 opacity-50 cursor-not-allowed", request.delivery_status === 'assigned' && "bg-blue-50 border-blue-200 text-blue-600")}
                          >
                            Assigned
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={true}
                            onClick={() => handleStatusChange('in_progress')}
                            className={cn("h-11 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-100 opacity-50 cursor-not-allowed", request.delivery_status === 'in_progress' && "bg-amber-50 border-amber-200 text-amber-600")}
                          >
                            In Progress
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={updatingStatus}
                            onClick={() => setConfirmModal({ open: true, status: 'completed' })}
                            className={cn("h-11 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-100", request.delivery_status === 'completed' && "bg-emerald-50 border-emerald-200 text-emerald-600")}
                          >
                            Complete
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={updatingStatus}
                            onClick={() => setConfirmModal({ open: true, status: 'failed' })}
                            className={cn("h-11 rounded-xl font-bold text-[10px] uppercase tracking-widest border-slate-100", request.delivery_status === 'failed' && "bg-rose-50 border-rose-200 text-rose-600")}
                          >
                            Failed
                          </Button>
                        </div>

                        <AlertDialog open={confirmModal.open} onOpenChange={(open) => !open && setConfirmModal({ open: false, status: null })}>
                          <AlertDialogContent className="rounded-[1.5rem] border-none shadow-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-[900] text-slate-900">
                                Confirm Status Update
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-500 font-bold">
                                Are you sure you want to manually mark this delivery as <span className={cn("uppercase", confirmModal.status === 'completed' ? "text-emerald-600" : "text-rose-600")}>{confirmModal.status}</span>? This action will notify the requester and cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-4 gap-3">
                              <AlertDialogCancel className="rounded-xl font-black text-[10px] uppercase tracking-widest border-slate-100 h-12">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => confirmModal.status && handleStatusChange(confirmModal.status)}
                                className={cn(
                                  "rounded-xl font-black text-[10px] uppercase tracking-widest h-12 text-white border-none shadow-lg transition-all active:scale-95",
                                  confirmModal.status === 'completed' ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200" : "bg-rose-500 hover:bg-rose-600 shadow-rose-200"
                                )}
                              >
                                {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Update"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {updatingStatus && (
                          <div className="flex items-center justify-center py-2 animate-in fade-in">
                            <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                            <span className="text-[10px] font-bold text-slate-400">Updating system...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>

                  {request.delivery_status === 'in_progress' && (
                    <Button 
                      onClick={() => window.open(`/admin/tracking/${request.request_id}`, '_blank')}
                      className="w-full h-14 rounded-2xl bg-[#00B14F] hover:bg-[#009e46] text-white font-[900] text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-[#00B14F]/20 flex items-center justify-center gap-3 animate-pulse"
                    >
                      <Bike className="h-4 w-4" strokeWidth={3} />
                      Open Live Tracking
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
