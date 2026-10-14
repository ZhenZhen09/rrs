import React, { useState } from 'react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../ui/accordion';
import { 
  MapPin, 
  User, 
  FileText, 
  Check, 
  ChevronLeft,
  RotateCcw,
  LayoutDashboard,
  ShieldCheck,
  Loader2,
  Bike,
  AlertOctagon,
  Activity,
  Sparkles,
} from 'lucide-react';
import { DispatchMapView } from './DispatchMapView';
import { RiderSelectionList } from './RiderSelectionList';
import { DeliveryRequest, User as UserType } from '../../../types';
import { formatLocalDate, formatDateTime } from '../../../utils/dateUtils';
import { cn } from '../../ui/utils';
import { useData } from '../../../context/DataContext';
import { toast } from 'sonner';
import { LiveTrackingDashboard } from '../../../pages/LiveTrackingDashboard';
import { getTrackingOpenMode } from '../../../utils/trackingNavigation';
import { getAccountingBucket } from '../../../utils/requestAccounting';
import { getRiderAvailability, isScheduledForToday, type RiderAvailabilityInput } from '../../../utils/riderAvailability';

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
  onManageRoute?: (riderId: string) => void;
  readOnly?: boolean;
  hideMapOnMobile?: boolean;
  mobileLayout?: boolean;
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { TimelineComponent } from './TimelineComponent';
import { Settings } from 'lucide-react';

export const RequestDetailsPanel: React.FC<RequestDetailsPanelProps> = ({
  request,
  riders,
  onApprove,
  isSubmitting,
  onBack,
  onManageRoute,
  readOnly = false,
  hideMapOnMobile = false,
}) => {
  const { updateDeliveryStatus, returnForRevision } = useData();
  const navigate = useNavigate();
  const [selectedRiderId, setSelectedRiderId] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [selectedCommonReasons, setSelectedCommonReasons] = useState<string[]>([]);
  const [timelineResult, setTimelineResult] = useState<{ requestId: string; items: any[] } | null>(null);
  const requestId = request?.request_id;
  const timeline = timelineResult && timelineResult.requestId === requestId ? timelineResult.items : [];
  const loadingTimeline = Boolean(requestId && timelineResult?.requestId !== requestId);
  const [mobileTrackingRequestId, setMobileTrackingRequestId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean, status: string | null }>({
    open: false,
    status: null
  });

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;
    fetch(`/api/requests/${requestId}/timeline`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setTimelineResult({ requestId, items: Array.isArray(data) ? data : [] });
      })
      .catch(error => {
        console.error('Failed to fetch timeline', error);
        if (!cancelled) setTimelineResult({ requestId, items: [] });
      });
    return () => { cancelled = true; };
  }, [requestId]);

  const COMMON_REASONS = [
    "Rider forgot to click complete",
    "Rider phone battery died",
    "Completed via manual verification",
    "Rider has no internet signal",
    "Incorrect status update by rider"
  ];

  const handleToggleCommonReason = (reason: string) => {
    setSelectedCommonReasons(prev => {
      const next = prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason];
      // Update text area automatically
      setClosureReason(next.join(", "));
      return next;
    });
  };

  const openTracking = (requestId: string) => {
    const isMobileViewport = window.matchMedia?.('(max-width: 767px)').matches ?? false;
    if (getTrackingOpenMode(isMobileViewport) === 'embedded') {
      setMobileTrackingRequestId(requestId);
      return;
    }

    navigate(`/admin/tracking/${encodeURIComponent(requestId)}`);
  };

  if (!request) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50/30 p-6 text-center">
        <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6">
          <LayoutDashboard className="h-7 w-7 text-slate-200" />
        </div>
        <h3 className="text-xl font-[900] text-slate-400 tracking-tight">Select a request</h3>
        <p className="text-slate-400 text-xs font-medium max-w-xs mt-1.5 italic">Choose a delivery task from the left list.</p>
      </div>
    );
  }

  const selectedRider = riders.find((rider) => rider.id === selectedRiderId);
  const isSameDay = isScheduledForToday(request.delivery_date);
  const canAssignSelectedRider = Boolean(
    selectedRider && getRiderAvailability(selectedRider as UserType & RiderAvailabilityInput, isSameDay).eligible,
  );
  const assignSelectedRider = () => {
    if (!selectedRider || !canAssignSelectedRider) return;
    onApprove(selectedRider.id, adminNote);
  };

  const bucket = getAccountingBucket(request);
  const isPending = bucket === 'pending' || (bucket === 'active' && request.status === 'pending' && request.delivery_status === 'pending_review');
  const isApproved = request.status === 'approved';
  const isDisapproved = bucket === 'declined';
  const isReturned = bucket === 'revision';
  const isCancelled = bucket === 'cancelled';
  const isCompleted = bucket === 'completed';
  const isFailed = bucket === 'failed';
  const isTerminal = ['completed', 'failed', 'cancelled', 'declined'].includes(bucket);
  const canTrackAssignedRider = bucket === 'active' && Boolean(request.assigned_rider_id);

  const handleReturnForRevision = async () => {
    if (!adminNote) {
      toast.error("Please provide a reason in the Admin Note field.");
      return;
    }
    
    setUpdatingStatus(true);
    try {
      await returnForRevision(request.request_id, adminNote);
      toast.success("Request returned for revision.");
      if (onBack) onBack();
    } catch (err) {
      toast.error("Failed to return request.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (closureReason.length < 10) {
      toast.error("Please provide a more detailed reason (min 10 chars).");
      return;
    }
    setUpdatingStatus(true);
    try {
      await updateDeliveryStatus(request.request_id, newStatus as any, closureReason);
      setConfirmModal({ open: false, status: null });
      setClosureReason('');
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
      case 'cancelled': return 'text-slate-600 bg-slate-50 border-slate-100';
      default: return 'text-slate-600 bg-slate-50 border-slate-100';
    }
  };

  const renderStatusBadge = () => {
    if (isPending) {
      if (request.delivery_status === 'pending_review') {
        return (
          <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-purple-50 text-purple-600 border-purple-100">
            REVIEW
          </Badge>
        );
      }
      return (
        <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-amber-50 text-amber-600 border-amber-100">
          PENDING
        </Badge>
      );
    }
    if (isReturned) {
      return (
        <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-indigo-50 text-indigo-600 border-indigo-100">
          REVISION
        </Badge>
      );
    }
    if (isCancelled) {
      return (
        <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-slate-50 text-slate-600 border-slate-100">
          CANCELLED
        </Badge>
      );
    }
    if (isDisapproved) {
      return (
        <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-rose-50 text-rose-600 border-rose-100">
          DECLINED
        </Badge>
      );
    }
    if (isCompleted) {
      return (
        <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-emerald-50 text-emerald-600 border-emerald-100">
          COMPLETED
        </Badge>
      );
    }
    if (isFailed) {
      return (
        <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-rose-50 text-rose-600 border-rose-100">
          FAILED
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-black text-[8px] tracking-widest px-2 shrink-0 bg-blue-50 text-blue-600 border-blue-100">
        {bucket === 'other' ? 'UNCLASSIFIED' : 'APPROVED'}
      </Badge>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden relative">
      {/* Fixed Header */}
      <div className="shrink-0 px-4 md:px-6 py-2 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3 overflow-hidden">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden rounded-full shrink-0 h-8 w-8 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4 text-slate-600" />
            </Button>
          )}
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-[900] text-slate-900 tracking-tight flex items-center gap-2 text-nowrap leading-none">
              <span className="truncate">#{request.request_id.slice(-6).toUpperCase()}</span>
              {renderStatusBadge()}
            </h2>
            <p className="text-[7px] font-black text-slate-400 mt-1 truncate uppercase tracking-widest">
              {formatLocalDate(request.delivery_date, 'MMM d')} • {request.time_window}
            </p>
          </div>
        </div>

      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto min-h-0 pb-16">
        <div className="p-3 md:p-5 space-y-3 md:space-y-5">
          {request.is_overdue && !isTerminal && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-start gap-3">
              <div className="h-8 w-8 shrink-0 rounded-lg bg-rose-100 flex items-center justify-center">
                <AlertOctagon className="h-4 w-4 text-rose-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-700">Overdue · {request.overdue_label || 'Needs attention'}</p>
                <p className="mt-1 text-[10px] font-bold text-rose-800">
                  Recommended next step: {(request.recommended_action || 'contact_rider').replace('_', ' ')}.
                </p>
              </div>
            </div>
          )}

          {/* Map Section */}
          {!hideMapOnMobile && (
            <div className="h-[180px] md:h-[220px] w-full shrink-0 rounded-lg overflow-hidden border border-slate-100">
              <DispatchMapView
                requestId={request.request_id}
                origin={request.pickup_location}
                destination={request.dropoff_location}
                current={request.current_lat && request.current_lng ? { lat: request.current_lat, lng: request.current_lng } : null}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-5">
            {/* Logistics Left Side */}
            <div className="lg:col-span-3 space-y-4 md:space-y-5">
              <Card className="p-3 md:p-5 rounded-lg border-none shadow-sm bg-white space-y-4 md:space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="h-0.5 w-3 bg-primary rounded-full" />
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">Logistics Details</span>
                  </div>
                  
                  <Badge className="bg-rose-50 text-rose-500 border border-rose-100/50 rounded-full px-2 py-0.5 font-black text-[7px] uppercase tracking-widest flex items-center gap-1">
                    <Sparkles size={8} className="fill-rose-500" />
                    {request.request_type.toUpperCase().replace('TRANSACTION', 'SERVICE')}
                  </Badge>
                </div>

                <div className="space-y-3 md:space-y-4">
                  {/* Origin */}
                  <div className="flex gap-2.5 md:gap-3">
                    <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Origin</p>
                      <p className="text-[10px] font-black text-slate-900 leading-tight break-words">{request.pickup_location.address}</p>
                      <p className="text-[8px] font-bold text-[#5a5a5a] mt-0.5 italic break-words leading-none">
                        {request.pickup_location.businessName || 'N/A'} • {request.pickup_location.landmarks || 'None'}
                      </p>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="flex gap-2.5 md:gap-3">
                    <div className="w-7 h-7 rounded-md bg-rose-50 flex items-center justify-center shrink-0">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Destination</p>
                      <p className="text-[10px] font-black text-slate-900 leading-tight break-words">{request.dropoff_location.address}</p>
                      <p className="text-[8px] font-bold text-[#5a5a5a] mt-0.5 italic break-words leading-none">
                        {request.dropoff_location.businessName || 'N/A'} • {request.dropoff_location.landmarks || 'None'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-blue-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Requester</p>
                        <p className="text-[9px] font-black text-slate-800 truncate leading-none mt-0.5">
                          {request.on_behalf_of || request.requester_name}
                        </p>
                        {request.on_behalf_of && request.on_behalf_of !== request.requester_name && (
                          <p className="text-[7px] font-bold text-slate-400 mt-1 italic truncate">Account: {request.requester_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded bg-purple-50 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-purple-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Recipient</p>
                        <p className="text-[9px] font-black text-slate-800 truncate leading-none mt-0.5">{request.recipient_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Personnel Instructions */}
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex gap-2">
                    <div className="w-5 h-5 rounded bg-white flex items-center justify-center shrink-0">
                      <FileText className="h-2.5 w-2.5 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Task Instructions</p>
                      <p className="text-[9px] font-bold text-slate-700 leading-tight italic break-words">
                        {request.personnel_instructions || 'No specific task instructions provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Admin Feedback / Reason */}
                  {(isCancelled || isDisapproved || isReturned) && request.admin_remark && (
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100 space-y-1">
                      <p className="text-[7px] font-black text-rose-400 uppercase tracking-widest">Admin Reason</p>
                      <p className="text-[9px] font-bold text-rose-800 leading-tight italic">
                        &quot;{request.admin_remark}&quot;
                      </p>
                    </div>
                  )}

                  {/* Rider Feedback */}
                  {isTerminal && (request.rider_remark || request.completed_at) && (
                    <div className="p-3 bg-slate-900 rounded-lg text-white space-y-2 shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                            {request.rider_remark?.includes('[Admin update by') ? (
                              <ShieldCheck className="h-5 w-5 text-emerald-400" />
                            ) : (
                              <Bike className="h-5 w-5 text-white" />
                            )}
                          </div>
                          <div>
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">
                              {request.rider_remark?.includes('[Admin update by') ? 'ADMIN CLOSURE' : 'RIDER REPORT'}
                            </p>
                            <h4 className="text-[9px] font-black text-white uppercase tracking-tight leading-none mt-1.5">
                              {(() => {
                                if (request.rider_remark?.includes('[Admin update by')) {
                                  const match = request.rider_remark.match(/\[Admin update by (.*?)\]/);
                                  // Extract name/email before @ if present, otherwise raw ID
                                  return match ? match[1].split('@')[0].toUpperCase() : 'ADMIN';
                                }
                                return request.assigned_rider_name?.toUpperCase() || 'SYSTEM';
                              })()}
                            </h4>
                          </div>
                        </div>
                        {request.completed_at && (
                          <div className="text-right leading-none">
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">
                               {isCompleted ? 'Completed' : isFailed ? 'Failed' : 'Finalized'}
                             </p>
                             <p className="text-[8px] font-bold text-white/90 mt-1">{formatDateTime(request.completed_at, 'MMM d, h:mm a')}</p>
                          </div>
                        )}
                      </div>
                      
                      {request.rider_remark && (
                        <div className="bg-white/5 p-2.5 rounded border border-white/10 mt-1">
                           <p className="text-[10px] font-bold text-white/95 leading-tight italic break-words">
                             &quot;{request.rider_remark.replace(/\[Admin update by.*?\]\s*/, '')}&quot;
                           </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tracking Timeline */}
                  <div className="pt-2">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="timeline" className="border-none">
                        <AccordionTrigger className="py-2 hover:no-underline group">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center group-data-[state=open]:bg-primary/10 transition-colors">
                              <Activity className={cn("h-3 w-3 text-slate-400 group-data-[state=open]:text-primary")} />
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 group-data-[state=open]:text-primary">Movement Timeline</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 pb-1">
                          {loadingTimeline ? (
                            <div className="py-4 flex justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                            </div>
                          ) : (
                            <TimelineComponent events={timeline} />
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </div>
              </Card>

              {!readOnly && (isPending || isApproved) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[8px] font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-widest">
                      <FileText className="h-2.5 w-2.5 text-primary" />
                      Action Reason / Admin Note
                    </h3>
                    {isPending && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleReturnForRevision}
                        disabled={updatingStatus || !adminNote}
                        className="h-7 px-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-md text-[8px] font-black uppercase tracking-widest shadow-sm"
                      >
                        <RotateCcw className="h-2.5 w-2.5 mr-1" />
                        Request Revision
                      </Button>
                    )}
                  </div>
                  <Card className="p-2 rounded-lg border-none shadow-sm bg-white">
                    <Textarea 
                      placeholder={isApproved ? "No additional notes provided." : "Explain cancellation, revision, or provide rider instructions..."}
                      value={isApproved ? (request.admin_remark || '') : adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      readOnly={isApproved}
                      className={cn(
                        "min-h-[60px] rounded border-slate-100 bg-slate-50/50 text-[10px] resize-none p-2 shadow-none focus:ring-0",
                        isApproved && "opacity-70 cursor-default bg-slate-100/50 select-none"
                      )}
                    />
                  </Card>
                </div>
              )}
            </div>

            {/* Rider Assignment / Status Section */}
            <div className="lg:col-span-2 space-y-4">
              {!readOnly && isPending ? (
                <>
                  <RiderSelectionList 
                    riders={riders}
                    selectedRiderId={selectedRiderId}
                    onSelect={setSelectedRiderId}
                    deliveryDate={request.delivery_date}
                  />

                  {selectedRiderId && (
                    <div className="pt-1 animate-in slide-in-from-bottom-2 duration-300">
                      <Button
                        onClick={assignSelectedRider}
                        disabled={isSubmitting || !canAssignSelectedRider}
                        className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-white font-black text-[9px] uppercase tracking-widest shadow-md"
                      >
                        {isSubmitting ? 'Assigning...' : `Assign to ${selectedRider?.name.split(' ')[0] ?? 'Rider'}`}
                      </Button>
                    </div>
                  )}
                </>
              ) : isApproved && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[8px] font-black text-slate-900 tracking-widest flex items-center gap-1.5 uppercase">
                      <Bike className="h-2.5 w-2.5 text-primary" />
                      Assignment
                    </h3>

                    {/* LAYER 2: Re-sequence Trigger (Only for Queued Active Tasks) */}
                    {!readOnly && onManageRoute && request.assigned_rider_id && bucket === 'active' && request.delivery_status !== 'in_progress' && (
                      <Button
                        size="sm"
                        onClick={() => onManageRoute(request.assigned_rider_id!)}
                        className="h-6 px-2 bg-pink-500 hover:bg-pink-600 text-white text-[7px] font-black uppercase tracking-widest rounded shadow-sm flex items-center gap-1 border-none"
                      >
                        <Settings size={10} strokeWidth={3} />
                        Manage Route
                      </Button>
                    )}
                  </div>
                  
                  <Card className="p-3 rounded-lg border-none shadow-sm bg-white overflow-hidden relative group transition-all hover:shadow-md">
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-black shadow-md">
                        {request.assigned_rider_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none">Rider</p>
                        <h4 className="text-[11px] font-[900] text-slate-900 leading-tight mt-1">{request.assigned_rider_name}</h4>
                        <Badge variant="outline" className={cn("mt-1 border font-black text-[6px] uppercase tracking-wider px-1.5 py-0", getStatusColor(request.delivery_status))}>
                          {request.delivery_status?.replace('_', ' ') || 'ASSIGNED'}
                        </Badge>
                      </div>
                    </div>

                    {!readOnly && !isTerminal && (
                      <div className="mt-4 space-y-2 relative z-10">
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={updatingStatus}
                            onClick={() => setConfirmModal({ open: true, status: 'completed' })}
                            className={cn("h-7 rounded text-[7px] uppercase tracking-widest border-slate-100", request.delivery_status === 'completed' && "bg-emerald-50 border-emerald-200 text-emerald-600")}
                          >
                            Complete
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={updatingStatus}
                            onClick={() => setConfirmModal({ open: true, status: 'failed' })}
                            className={cn("h-7 rounded text-[7px] uppercase tracking-widest border-slate-100", request.delivery_status === 'failed' && "bg-rose-50 border-rose-200 text-rose-600")}
                          >
                            Failed
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>

                  {canTrackAssignedRider && (
                    <Button 
                      onClick={() => openTracking(request.request_id)}
                      className="w-full h-10 rounded-lg bg-[#00B14F] hover:bg-[#009e46] text-white font-[900] text-[7px] uppercase tracking-[0.2em] shadow-md flex items-center justify-center gap-1.5"
                    >
                      <Bike className="h-3 w-3" strokeWidth={3} />
                      {request.delivery_status === 'in_progress' ? 'Track' : 'Track Rider'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog 
        open={confirmModal.open} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmModal({ open: false, status: null });
            setClosureReason('');
            setSelectedCommonReasons([]);
          }
        }}
      >
        <AlertDialogContent className="rounded-xl border-none shadow-2xl max-w-sm w-[95vw] max-h-[90vh] overflow-y-auto scale-95 md:scale-100 transition-transform">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-[900] text-slate-900">Confirm Update</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs font-bold">
              Mark this delivery as <span className={cn("uppercase", confirmModal.status === 'completed' ? "text-emerald-600" : "text-rose-600")}>{confirmModal.status}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 text-slate-500 text-xs font-bold">
            <div className="space-y-3 text-left bg-slate-50/50 p-3 rounded-lg border border-slate-100">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Common Reasons</p>
              <div className="grid grid-cols-1 gap-2">
                {COMMON_REASONS.map(reason => (
                  <button
                    key={reason}
                    type="button"
                    aria-pressed={selectedCommonReasons.includes(reason)}
                    onClick={() => handleToggleCommonReason(reason)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2 rounded-md border p-2 text-left transition-all",
                      selectedCommonReasons.includes(reason)
                        ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                        : "bg-white border-slate-100 hover:border-slate-200 text-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-3 h-3 rounded border flex items-center justify-center shrink-0",
                      selectedCommonReasons.includes(reason) ? "bg-white border-white" : "border-slate-300"
                    )}>
                      {selectedCommonReasons.includes(reason) && <Check size={8} className="text-slate-900" strokeWidth={5} />}
                    </div>
                    <span className="text-[9px] font-bold leading-none">{reason}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2 text-left">
              <label htmlFor="closure-reason" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Custom Reason / Adjust Text
              </label>
              <Textarea
                id="closure-reason"
                placeholder="Explain why this transaction is being closed..."
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                className="min-h-[70px] rounded-lg border-slate-100 bg-slate-50 font-bold text-xs resize-none p-3 shadow-none focus-visible:ring-1 focus-visible:ring-slate-200 text-slate-900"
              />
              <p className={cn(
                "text-[8px] font-black uppercase tracking-tighter px-1 transition-colors",
                closureReason.length >= 10 ? "text-emerald-500" : "text-slate-400"
              )}>
                {closureReason.length}/10 characters minimum
              </p>
            </div>
          </div>
          <AlertDialogFooter className="mt-2 gap-2 pb-2">
            <AlertDialogCancel className="min-h-11 rounded-lg border-slate-100 font-black text-[9px] uppercase tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmModal.status && handleStatusChange(confirmModal.status)}
              disabled={updatingStatus || closureReason.length < 10}
              className={cn(
                "min-h-11 rounded-lg border-none text-white font-black text-[9px] uppercase tracking-widest shadow-md",
                confirmModal.status === 'completed' ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600",
                (updatingStatus || closureReason.length < 10) && "opacity-50 cursor-not-allowed"
              )}
            >
              {updatingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mobileTrackingRequestId && (
        <LiveTrackingDashboard
          requestId={mobileTrackingRequestId}
          embedded
          onClose={() => setMobileTrackingRequestId(null)}
        />
      )}
    </div>
  );
};
