import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Plus, Calendar, MapPin, Clock, User as UserIcon, Package, CheckCircle2, XCircle, Loader2, Bike, ListFilter, History as HistoryIcon, Search, ChevronLeft, ChevronRight, AlertTriangle, Banknote, FileText, Building2, Info, Check, ShieldCheck, ShoppingCart, Briefcase, FileSignature, Wallet, ClipboardCheck, Truck, MoveRight, Landmark, RotateCcw, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { formatLocalDate } from '../utils/dateUtils';
import { TIME_SLOTS, type Location, DeliveryRequest, RequestType, REQUEST_CATEGORIES } from '../types';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command';
import { cn } from '../components/ui/utils';
import { CategoryPicker } from '../components/ui/CategoryPicker';
import { getTypeIcon, getTypeColor } from '../utils/categoryUtils';

const CountdownTimer = ({ createdAt, onCancel }: { createdAt: string, onCancel: () => void }) => {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    const parseDate = (str: string) => {
      if (!str) return new Date().getTime();
      if (str.includes(' ') && !str.includes('T') && !str.includes('Z')) {
        return new Date(str.replace(' ', 'T') + 'Z').getTime();
      }
      return new Date(str).getTime();
    };

    const created = parseDate(createdAt);
    const updateTimer = () => {
      const now = new Date().getTime();
      const secondsPast = Math.floor((now - created) / 1000);
      const newTimeLeft = Math.max(0, 60 - secondsPast);
      const cappedTimeLeft = Math.min(newTimeLeft, 60);
      setTimeLeft(cappedTimeLeft);
      return cappedTimeLeft;
    };

    updateTimer();
    const interval = setInterval(() => {
      const currentDiff = updateTimer();
      if (currentDiff === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  if (timeLeft === 0) return null;

  return (
    <div className="flex flex-col gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
          <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Processing in {timeLeft}s</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest"
        >
          Cancel Now
        </Button>
      </div>
      <div className="w-full bg-amber-200/50 h-1 rounded-full overflow-hidden">
        <div
          className="bg-amber-500 h-full transition-width duration-200 ease-linear"
          style={{ width: `${(timeLeft / 60) * 100}%` }}
        />
      </div>
    </div>
  );
};

export function PersonnelDashboard() {
  const { user } = useAuth();
  const { requests, submitRequest, resubmitRequest, cancelRequest } = useData();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  // Logs Modal State
  const [selectedRequestForLogs, setSelectedRequestForLogs] = useState<DeliveryRequest | null>(null);
  const [statusLogs, setStatusLogs] = useState<{ timestamp: string; status: string; remark?: string }[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);

  // Pagination & Display State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState('20');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // Form state
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [timeWindow, setTimeWindow] = useState('');
  const [pickupLocation, setPickupLocation] = useState<Location | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [pickupContactName, setPickupContactName] = useState('');
  const [pickupContactMobile, setPickupContactMobile] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [requestType, setRequestType] = useState<RequestType>('Delivery/Pickup');
  const [urgencyLevel, setUrgencyLevel] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
  const [onBehalfOf, setOnBehalfOf] = useState(user?.name || '');
  const [taskInstructions, setTaskInstructions] = useState('');

  // Availability Intelligence State
  const [slotAvailability, setSlotAvailability] = useState<Record<string, number>>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Fetch availability when date changes
  useEffect(() => {
    if (!deliveryDate) {
      setSlotAvailability({});
      return;
    }

    const fetchAvailability = async () => {
      setIsLoadingAvailability(true);
      try {
        const res = await fetch(`/api/requests/availability?date=${deliveryDate}`);
        if (res.ok) {
          const data = await res.json();
          const mapping: Record<string, number> = {};
          data.forEach((item: any) => {
            mapping[item.time_window] = item.count;
          });
          setSlotAvailability(mapping);
        }
      } catch (err) {
        console.error('Failed to fetch availability:', err);
      } finally {
        setIsLoadingAvailability(false);
      }
    };

    fetchAvailability();
  }, [deliveryDate]);

  const resetForm = () => {
    setEditingRequestId(null);
    setDeliveryDate('');
    setTimeWindow('');
    setPickupLocation(null);
    setDropoffLocation(null);
    setPickupContactName('');
    setPickupContactMobile('');
    setRecipientName('');
    setRecipientContact('');
    setRequestType('Delivery/Pickup');
    setUrgencyLevel('Medium');
    setOnBehalfOf(user?.name || '');
    setTaskInstructions('');
  };

  const handleEditRequest = (req: DeliveryRequest) => {
    setEditingRequestId(req.request_id);
    setDeliveryDate(req.delivery_date);
    setTimeWindow(req.time_window);
    setPickupLocation(req.pickup_location);
    setDropoffLocation(req.dropoff_location);
    setPickupContactName(req.pickup_contact_name || '');
    setPickupContactMobile(req.pickup_contact_mobile || '');
    setRecipientName(req.recipient_name);
    setRecipientContact(req.recipient_contact);
    setRequestType(req.request_type as RequestType);
    setUrgencyLevel(req.urgency_level as any);
    setOnBehalfOf(req.on_behalf_of || user?.name || '');
    setTaskInstructions(req.personnel_instructions || '');
    setShowNewRequest(true);
  };

  // Handle cross-tab messages from the MapPickerPage
  useEffect(() => {
    const handleMapMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "MAP_LOCATION_SELECTED") {
        const { location, pickerType } = event.data.payload;
        if (pickerType === "pickup") {
          setPickupLocation(location);
          toast.success("Pickup location updated from map");
        } else if (pickerType === "dropoff") {
          setDropoffLocation(location);
          toast.success("Destination updated from map");
        }
      }
    };
    window.addEventListener("message", handleMapMessage);
    return () => window.removeEventListener("message", handleMapMessage);
  }, []);

  const openMapPicker = (type: 'pickup' | 'dropoff') => {
    const title = type === 'pickup' ? "Select Pickup Address" : "Select Destination Address";
    const initial = type === 'pickup' ? pickupLocation : dropoffLocation;
    const initialParam = initial ? `&initial=${encodeURIComponent(JSON.stringify(initial))}` : '';
    window.open(`/map-picker?type=${type}&title=${encodeURIComponent(title)}${initialParam}`, '_blank');
  };

  const myRequests = (Array.isArray(requests) ? requests : []).filter(req => req.requester_id === user?.id);
  
  const activeRequests = myRequests.filter(req => 
    (req.status === 'pending' || req.status === 'approved' || req.status === 'submitted_waiting') && 
    req.delivery_status !== 'completed' && 
    req.delivery_status !== 'failed' &&
    req.status !== 'disapproved' &&
    req.status !== 'returned_for_revision'
  );

  const revisionRequests = myRequests.filter(req => req.status === 'returned_for_revision');
  
  const historyRequests = useMemo(() => {
    return myRequests
      .filter(req => req.status === 'disapproved' || req.status === 'cancelled' || req.delivery_status === 'completed' || req.delivery_status === 'failed')
      .filter(req => 
        req.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.dropoff_location.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
  }, [myRequests, searchQuery]);

  const totalPages = Math.ceil(historyRequests.length / parseInt(itemsPerPage));
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * parseInt(itemsPerPage);
    return historyRequests.slice(start, start + parseInt(itemsPerPage));
  }, [historyRequests, currentPage, itemsPerPage]);

  const handlePreSubmit = () => {
    if (!deliveryDate || !timeWindow || !pickupLocation || !dropoffLocation || !recipientName) {
      toast.error('Please fill in all required fields');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleSubmitRequest = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const requestData = {
      delivery_date: deliveryDate,
      time_window: timeWindow,
      pickup_location: pickupLocation!,
      dropoff_location: dropoffLocation!,
      pickup_contact_name: pickupContactName,
      pickup_contact_mobile: pickupContactMobile,
      recipient_name: recipientName,
      recipient_contact: recipientContact,
      request_type: requestType,
      urgency_level: urgencyLevel,
      on_behalf_of: onBehalfOf === user?.name ? undefined : onBehalfOf,
      requester_name: user?.name || '',
      requester_department: user?.department || '',
      personnel_instructions: taskInstructions || undefined,
    };

    try {
      if (editingRequestId) {
        await resubmitRequest(editingRequestId, requestData);
        toast.success('Request updated and resubmitted for review.');
        setActiveTab('active');
      } else {
        await submitRequest(requestData);
        toast.success('Delivery request submitted. You have 60 seconds to cancel.');
      }
      setShowConfirmModal(false);
      setShowNewRequest(false);
      resetForm();
    } catch (err) {
      toast.error('Failed to process request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLogsDialog = async (request: DeliveryRequest) => {
    setSelectedRequestForLogs(request);
    try {
      const res = await fetch(`/api/requests/${request.request_id}/status-history`);
      if (res.ok) {
        const data = await res.json();
        setStatusLogs(data);
        setShowLogsModal(true);
      }
    } catch (err) {
      toast.error('Failed to load history logs');
    }
  };

  const getStatusBadge = (status: string, delivery_status?: string) => {
    if (status === 'approved' && delivery_status === 'in_progress') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1.5 animate-pulse px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider">
          <Bike className="h-3 w-3" />
          On The Way
        </Badge>
      );
    }
    switch (status) {
      case 'submitted_waiting': return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-100 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider">Queueing</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider">Pending Review</Badge>;
      case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider">Approved</Badge>;
      case 'disapproved': return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider">Declined</Badge>;
      default: return <Badge variant="outline" className="px-3 py-1 rounded-full font-bold text-[10px] tracking-wider uppercase">{status}</Badge>;
    }
  };

  const getHistoryStatusBadge = (request: DeliveryRequest) => {
    if (request.status === 'disapproved') return <Badge className="bg-slate-100 text-slate-500 border-none px-3 py-1 rounded-full font-bold text-[10px] tracking-wider">DISAPPROVED</Badge>;
    if (request.status === 'cancelled') return <Badge className="bg-rose-50 text-rose-500 border-none px-3 py-1 rounded-full font-bold text-[10px] tracking-wider">CANCELLED</Badge>;
    if (request.delivery_status === 'completed') return <Badge className="bg-[#00B14F]/10 text-[#009e46] border-none px-3 py-1 rounded-full font-bold text-[10px] tracking-wider">COMPLETED</Badge>;
    if (request.delivery_status === 'failed') return <Badge className="bg-rose-100 text-rose-700 border-none px-3 py-1 rounded-full font-bold text-[10px] tracking-wider">FAILED</Badge>;
    return <Badge variant="outline" className="px-3 py-1 rounded-full font-bold text-[10px] tracking-wider uppercase">{request.delivery_status}</Badge>;
  };

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'Urgent': return <Badge className="bg-rose-500 text-white border-none flex items-center gap-1 px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-tighter shadow-sm shadow-rose-500/20"><AlertTriangle className="h-2.5 w-2.5" /> Urgent</Badge>;
      case 'High': return <Badge className="bg-orange-500 text-white border-none px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-tighter shadow-sm shadow-orange-500/20">High</Badge>;
      case 'Medium': return <Badge className="bg-blue-500 text-white border-none px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-tighter">Medium</Badge>;
      case 'Low': return <Badge className="bg-slate-400 text-white border-none px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-tighter">Low</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-10 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      {/* Sleek Grab-inspired Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-slate-100">
        <div className="space-y-2 text-left">
          <h1 className="text-4xl font-[900] text-slate-900 tracking-tight">Delivery Center</h1>
          <p className="text-slate-500 font-medium text-base">Welcome back, <span className="text-slate-900 font-black">{user?.name}</span>. Manage your logistics operations.</p>
        </div>

        <Dialog open={showNewRequest} onOpenChange={(open) => {
          setShowNewRequest(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="h-16 px-10 rounded-[1.5rem] bg-[#00B14F] hover:bg-[#009e46] text-white font-[900] text-sm uppercase tracking-widest shadow-[0_10px_30px_rgb(0,177,79,0.25)] transition-all active:scale-95 flex items-center gap-3 group">
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
              New Delivery Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[95vw] lg:max-w-[60vw] max-h-[92vh] overflow-y-auto rounded-[3rem] border-none p-0 bg-white shadow-2xl">
            <div className="relative">
              {/* Header Banner */}
              <div className="bg-slate-900 p-10 pb-20 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#00B14F]/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-[#00B14F] rounded-2xl shadow-xl shadow-[#00B14F]/20">
                      <Plus className="text-white w-7 h-7" strokeWidth={3} />
                    </div>
                    <div>
                      <DialogTitle className="text-3xl font-[900] tracking-tight mb-1">
                        {editingRequestId ? 'Update Request' : 'Create New Request'}
                      </DialogTitle>
                      <DialogDescription className="text-slate-400 font-bold text-sm">
                        {editingRequestId ? 'Review and adjust the details for your resubmission.' : 'Fill in the details below to schedule your delivery.'}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="px-10 -mt-12 relative z-20 pb-12 space-y-8">
                {/* General Information Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-[2.5rem] p-8 space-y-8 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-8 bg-[#00B14F] rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request Basics</span>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2 text-left">
                      <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">On Behalf Of</Label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#00B14F] transition-colors" />
                        <Input placeholder="Assign to your name or specific person" className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-none border-2 focus:border-[#00B14F]/20 focus:ring-0 text-sm font-bold" value={onBehalfOf} onChange={e => setOnBehalfOf(e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Request Category</Label>
                        <CategoryPicker value={requestType} onChange={setRequestType} />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Urgency Priority</Label>
                        <Select value={urgencyLevel} onValueChange={(v: any) => setUrgencyLevel(v)}>
                          <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold text-sm shadow-none border-2">
                            <SelectValue placeholder="Select Urgency" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2 border-none">
                            <SelectItem value="Low" className="rounded-xl py-3 font-bold">Low</SelectItem>
                            <SelectItem value="Medium" className="rounded-xl py-3 font-bold text-blue-600">Medium</SelectItem>
                            <SelectItem value="High" className="rounded-xl py-3 font-bold text-orange-600">High</SelectItem>
                            <SelectItem value="Urgent" className="rounded-xl py-3 font-bold text-rose-600">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Schedule Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-[2.5rem] p-8 space-y-8 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-8 bg-blue-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scheduling</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Preferred Date</Label>
                      <div className="relative group">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
                        <Input 
                          type="date" 
                          min={new Date().toISOString().split('T')[0]}
                          className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-none border-2 focus:border-blue-500/20 focus:ring-0 font-bold" 
                          value={deliveryDate} 
                          onChange={e => setDeliveryDate(e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Arrival Window</Label>
                      <Select value={timeWindow} onValueChange={setTimeWindow}>
                        <SelectTrigger className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white font-bold text-sm shadow-none border-2">
                          {isLoadingAvailability ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              <span className="text-slate-400">Checking availability...</span>
                            </div>
                          ) : (
                            <SelectValue placeholder="Select Slot" />
                          )}
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 shadow-2xl p-2 h-[300px] border-none">
                          {TIME_SLOTS.map(s => {
                            const count = slotAvailability[s] || 0;
                            const isFull = count >= 5;
                            const isBusy = count >= 3 && count < 5;
                            const isAvailable = count < 3;

                            return (
                              <SelectItem 
                                key={s} 
                                value={s} 
                                disabled={isFull}
                                className="rounded-xl py-3 font-bold group"
                              >
                                <div className="flex items-center justify-between w-full min-w-[200px]">
                                  <span>{s}</span>
                                  <div className="flex items-center gap-2 ml-4">
                                    <div className={cn(
                                      "h-2 w-2 rounded-full",
                                      isAvailable && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                                      isBusy && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]",
                                      isFull && "bg-rose-500"
                                    )} />
                                    <span className={cn(
                                      "text-[9px] uppercase tracking-widest font-black",
                                      isAvailable && "text-emerald-600",
                                      isBusy && "text-amber-600",
                                      isFull && "text-rose-600"
                                    )}>
                                      {isAvailable ? 'Available' : isBusy ? 'Busy' : 'Full'}
                                    </span>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>

                {/* Locations Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-[2.5rem] p-8 space-y-8 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-8 bg-amber-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Route & Personalized Details</span>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Origin Block */}
                      <div className="space-y-5">
                        <div className="space-y-2 text-left">
                           <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Pick-up (Origin)</Label>
                           <Button variant="outline" className="h-auto min-h-[5rem] w-full justify-start rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 hover:bg-white hover:border-[#00B14F]/20 text-slate-600 font-bold p-5 group transition-all shadow-none" onClick={() => openMapPicker('pickup')}>
                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-[#00B14F]/10 group-hover:text-[#00B14F] transition-colors mr-4">
                               <MapPin className="h-5 w-5" />
                             </div>
                             <div className="flex-1 text-left overflow-hidden">
                               <p className="text-sm text-slate-900 line-clamp-2">{pickupLocation ? pickupLocation.address : 'Select pickup point'}</p>
                             </div>
                           </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4 px-1 text-left">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                              <UserIcon className="h-3 w-3 text-[#00B14F]" /> Contact Person
                            </Label>
                            <Input 
                              placeholder="Name at pickup point" 
                              className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-none border-2 focus:border-[#00B14F]/20 focus:ring-0 text-xs font-bold" 
                              value={pickupContactName} 
                              onChange={e => setPickupContactName(e.target.value)} 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                              <Clock className="h-3 w-3 text-[#00B14F]" /> Contact Number
                            </Label>
                            <Input 
                              placeholder="+63 9xx xxx xxxx" 
                              className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-none border-2 focus:border-[#00B14F]/20 focus:ring-0 text-xs font-bold" 
                              value={pickupContactMobile} 
                              onChange={e => setPickupContactMobile(e.target.value)} 
                            />
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-[#00B14F]" /> Business / Building
                            </p>
                            <div className="min-h-[2.5rem] px-4 py-2 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center">
                              <p className="text-xs font-bold text-slate-700">
                                {pickupLocation?.businessName || <span className="text-slate-300 italic font-medium">No business name</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Destination Block */}
                      <div className="space-y-5">
                        <div className="space-y-2 text-left">
                           <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Drop-off (Destination)</Label>
                           <Button variant="outline" className="h-auto min-h-[5rem] w-full justify-start rounded-[1.5rem] border-2 border-slate-50 bg-slate-50/50 hover:bg-white hover:border-rose-500/20 text-slate-600 font-bold p-5 group transition-all shadow-none" onClick={() => openMapPicker('dropoff')}>
                             <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors mr-4">
                               <MapPin className="h-5 w-5" />
                             </div>
                             <div className="flex-1 text-left overflow-hidden">
                               <p className="text-sm text-slate-900 line-clamp-2">{dropoffLocation ? dropoffLocation.address : 'Select destination point'}</p>
                             </div>
                           </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 px-1 text-left">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                              <Building2 className="h-3 w-3 text-rose-500" /> Business / Building
                            </p>
                            <div className="min-h-[2.5rem] px-4 py-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center">
                              <p className="text-xs font-bold text-slate-700">
                                {dropoffLocation?.businessName || <span className="text-slate-300 italic font-medium">No business name provided</span>}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                              <Info className="h-3 w-3 text-rose-400" /> Nearby Landmarks
                            </p>
                            <div className="min-h-[2.5rem] px-4 py-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center">
                              <p className="text-xs font-bold text-slate-600 italic">
                                {dropoffLocation?.landmarks ? `"${dropoffLocation.landmarks}"` : <span className="text-slate-300 italic font-medium">No landmarks provided</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Recipient Information Card */}
                <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-[2.5rem] p-8 space-y-8 bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-1.5 w-8 bg-indigo-500 rounded-full" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recipient Contact</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Recipient Name</Label>
                      <Input placeholder="Full name" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-none border-2 focus:border-indigo-500/20 focus:ring-0 text-sm font-bold" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Contact Number</Label>
                      <Input placeholder="+63 9xx xxx xxxx" className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-none border-2 focus:border-indigo-500/20 focus:ring-0 text-sm font-bold" value={recipientContact} onChange={e => setRecipientContact(e.target.value)} />
                    </div>
                  </div>

                  {/* Task Instructions Field */}
                  <div className="space-y-2 mt-6 text-left">
                    <Label className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Specific Task Instructions (Optional)</Label>
                    <Textarea 
                      placeholder="e.g. Passbook update, FOR DEPOSIT, Sign fund transfer..." 
                      className="min-h-[100px] rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all shadow-none border-2 focus:border-indigo-500/20 focus:ring-0 text-sm font-bold p-4 resize-none" 
                      value={taskInstructions} 
                      onChange={e => setTaskInstructions(e.target.value)} 
                    />
                  </div>
                </Card>

                <div className="flex flex-col gap-4 pt-4">
                <Button onClick={handlePreSubmit} className="w-full h-20 rounded-[2rem] bg-slate-900 hover:bg-black text-white font-[900] uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 transition-all active:scale-[0.98] text-base">
                  Confirm and Submit Request
                </Button>
                <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest">
                  By submitting, you agree to the scheduling terms and conditions
                </p>
                </div>
                </div>
                </div>
                </DialogContent>
                </Dialog>

                {/* Formal Confirmation Modal */}
                <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 max-w-md text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-amber-500">
                <Info size={40} />
                </div>
                <DialogHeader>
                <DialogTitle className="text-2xl font-black text-slate-900 text-center">Confirm Submission</DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-center pt-2 leading-relaxed">
                Are you sure that all details provided are correct? Please review the information before proceeding to formal submission.
                </DialogDescription>
                </DialogHeader>
                <div className="flex gap-4 mt-8">
                <Button 
                variant="outline" 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-14 rounded-2xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[10px]"
                >
                Go Back
                </Button>
                <Button 
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="flex-1 h-14 rounded-2xl bg-[#00B14F] hover:bg-[#009e46] text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-[#00B14F]/20"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, Submit"}
                </Button>                </div>
                </DialogContent>
                </Dialog>
                </div>

      {/* NEW PERFORMANCE MINI-STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricBox icon={<Package className="text-[#00B14F]" />} label="Total Requests" value={myRequests.length} color="bg-[#00B14F]/10" />
        <MetricBox icon={<ShieldCheck className="text-blue-500" />} label="Success Rate" value={`${myRequests.length > 0 ? Math.round((myRequests.filter(r => r.delivery_status === 'completed').length / myRequests.length) * 100) : 100}%`} color="bg-blue-50" />
        <MetricBox icon={<Clock className="text-amber-500" />} label="Active Now" value={activeRequests.length} color="bg-amber-50" />
        <MetricBox icon={<Zap className="text-indigo-500" />} label="Quickest Lead" value="1.4h" color="bg-indigo-50" />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full focus:ring-0">
        <TabsList className="bg-slate-100/60 p-2 rounded-[1.5rem] h-auto border-none w-full max-w-2xl inline-flex shadow-inner mb-8">
          <TabsTrigger value="active" className="flex-1 rounded-xl h-12 font-bold text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-300">
            <ListFilter className="w-4 h-4 mr-2" />
            Active Tasks <span className="ml-2 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">{activeRequests.length}</span>
          </TabsTrigger>
          {revisionRequests.length > 0 && (
            <TabsTrigger value="revision" className="flex-1 rounded-xl h-12 font-bold text-sm text-rose-500 data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-md transition-all duration-300">
              <RotateCcw className="w-4 h-4 mr-2" />
              Action Required <span className="ml-2 bg-rose-100 px-2 py-0.5 rounded-md text-[10px]">{revisionRequests.length}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="flex-1 rounded-xl h-12 font-bold text-sm text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-300">
            <HistoryIcon className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-2 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {activeRequests.length === 0 ? (
               <div className="col-span-full py-40 flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                  <div className="h-20 w-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-slate-200">
                      <Package className="h-10 w-10" />
                  </div>
                  <h3 className="font-black text-xl text-slate-400 tracking-tight">No active deliveries</h3>
                  <p className="text-slate-400 text-sm mt-1">When you create a request, it will appear here for live tracking.</p>
               </div>
            ) : (
              activeRequests.map(request => (
                <Card key={request.request_id} id={`request-${request.request_id}`} className={`border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden hover:shadow-[0_20px_50px_rgb(0,0,0,0.06)] transition-all bg-white group ${request.urgency_level === 'Urgent' ? 'ring-2 ring-rose-500/20 border-rose-100' : ''} ${request.is_optimistic && request.status !== 'submitted_waiting' ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                  <CardHeader className="pb-6 text-left px-8 pt-8">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                           {getUrgencyBadge(request.urgency_level)}
                           {request.request_type && (
                             <Badge variant="outline" className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider border", getTypeColor(request.request_type))}>
                               {getTypeIcon(request.request_type)}
                               {request.request_type}
                             </Badge>
                           )}
                           {request.is_optimistic && (
                             <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse font-black text-[9px] uppercase tracking-wider">
                               <Loader2 className="h-2 w-2 mr-1 animate-spin" />
                               Processing
                             </Badge>
                           )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Scheduled Delivery</p>
                        <div className="flex items-baseline gap-2">
                          <CardTitle className="text-2xl font-[900] text-slate-900 tracking-tight leading-none">
                            {formatLocalDate(request.delivery_date, 'MMMM d, yyyy')}
                          </CardTitle>
                          <span className="text-[10px] font-black text-slate-400">#{request.request_id.slice(-8).toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-bold text-primary inline-flex bg-primary/5 px-3 py-1 rounded-lg mt-1">{request.time_window}</p>
                        {request.on_behalf_of && (
                          <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1.5 bg-slate-50 w-fit px-2.5 py-1 rounded-md border border-slate-100/50"><UserIcon size={10}/> For: {request.on_behalf_of}</p>
                        )}
                      </div>
                      {getStatusBadge(request.status, request.delivery_status)}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-8 text-left px-8 pb-8">
                    {request.status === 'submitted_waiting' && (
                      <CountdownTimer 
                        createdAt={request.created_at} 
                        onCancel={() => {
                          if (window.confirm("Are you sure you want to cancel the request?")) {
                            cancelRequest(request.request_id);
                            toast.info("Request cancelled.");
                          }
                        }} 
                      />
                    )}

                    {/* NEW DELIVERY PROGRESS STEPPER */}
                    <div className="py-2">
                      <DeliveryStepper status={request.delivery_status || 'pending'} />
                    </div>

                    <div className="flex gap-5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50 relative overflow-hidden group-hover:bg-slate-100/30 transition-all duration-500 group-hover:translate-y-[-2px] group-hover:shadow-lg group-hover:shadow-slate-200/50">
                      <div className="flex flex-col items-center gap-1.5 relative z-10 pt-1">
                        <div className="w-3 h-3 rounded-full bg-[#00B14F] shadow-sm shadow-[#00B14F]/40" />
                        <div className="w-[2px] flex-1 bg-slate-200 border-dashed border-l" />
                        <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/40" />
                      </div>
                      <div className="flex-1 space-y-6 min-w-0 relative z-10">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">From Pickup Point</p>
                          <p className="text-sm font-bold text-slate-700 truncate leading-tight">{request.pickup_location.address}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">To Destination</p>
                          <p className="text-sm font-black text-slate-900 leading-tight">{request.dropoff_location.address}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-2 border-t border-slate-50">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-sm">
                            {request.recipient_name.substring(0, 1)}
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Target Recipient</p>
                            <p className="text-base font-black text-slate-800">{request.recipient_name}</p>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-2xl border border-slate-100/50 min-w-[200px]">
                         {request.assigned_rider_name && (
                            <div className="text-left flex-1 px-2">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned Rider</p>
                               <p className="text-sm font-extrabold text-slate-700 truncate">{request.assigned_rider_name}</p>
                            </div>
                         )}
                         {request.delivery_status === 'in_progress' && (
                            <Button 
                              onClick={() => window.open(`/admin/tracking/${request.request_id}`, '_blank')}
                              className="bg-[#00B14F] hover:bg-[#009e46] text-white font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-[#00B14F]/20 animate-pulse transition-all active:scale-95"
                            >
                              <Bike className="w-3.5 h-3.5 mr-2" />
                              Track
                            </Button>
                         )}
                       </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="revision" className="mt-2 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {revisionRequests.map(request => (
              <Card key={request.request_id} className="border-2 border-rose-100 shadow-[0_10px_40px_rgb(244,63,94,0.05)] rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="pb-6 text-left px-8 pt-8 bg-rose-50/30">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                         <Badge className="bg-rose-500 text-white border-none font-black text-[9px] uppercase tracking-wider">ACTION REQUIRED</Badge>
                         <Badge variant="outline" className={cn("px-3 py-1 rounded-full font-bold text-[9px] uppercase tracking-wider border", getTypeColor(request.request_type))}>
                           {getTypeIcon(request.request_type)}
                           {request.request_type}
                         </Badge>
                      </div>
                      <CardTitle className="text-2xl font-[900] text-slate-900 tracking-tight leading-none">
                        {formatLocalDate(request.delivery_date, 'MMMM d, yyyy')}
                      </CardTitle>
                      <p className="text-sm font-bold text-rose-600">{request.time_window}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Request ID</span>
                       <span className="text-sm font-black text-slate-900">#{request.request_id.slice(-8)}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 text-left px-8 pb-8 pt-6">
                  {/* Admin Feedback Box */}
                  <div className="p-5 bg-amber-50 rounded-[1.5rem] border border-amber-100 flex gap-4">
                    <div className="p-2 bg-amber-200/50 rounded-xl text-amber-700 h-fit">
                       <AlertTriangle size={18} />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Administrator Feedback</p>
                       <p className="text-xs font-bold text-amber-700/80 mt-1.5 leading-relaxed italic">
                         "{request.admin_remark || 'Please review and update your request details.'}"
                       </p>
                    </div>
                  </div>

                  <div className="flex gap-5 p-6 bg-slate-50 rounded-[2rem] border border-slate-100/50">
                    <div className="flex-1 space-y-4 min-w-0">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Route Summary</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{request.pickup_location.address.split(',')[0]} → {request.dropoff_location.address.split(',')[0]}</p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleEditRequest(request)}
                    className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
                  >
                    <RotateCcw size={16} />
                    Edit & Resubmit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-2 outline-none">
          <Card className="border border-slate-100 shadow-[0_10px_40px_rgb(0,0,0,0.03)] rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="border-b border-slate-50 p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white">
               <div className="text-left">
                  <CardTitle className="text-2xl font-[900] text-slate-900 tracking-tight mb-1">Delivery History</CardTitle>
                  <CardDescription className="text-slate-500 font-medium">Full archive of your past requests and outcomes.</CardDescription>
               </div>
               <div className="flex flex-wrap items-center gap-4">
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search recipient or address..." 
                      className="pl-12 h-14 rounded-2xl bg-slate-50 border-slate-100 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-[#00B14F]/5 transition-all shadow-inner" 
                      value={searchQuery}
                      onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Show</span>
                    <Select value={itemsPerPage} onValueChange={v => { setItemsPerPage(v); setCurrentPage(1); }}>
                      <SelectTrigger className="h-8 w-16 bg-white border-slate-200 p-0 px-2 text-xs font-black text-slate-900 shadow-none ring-0 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="min-w-[80px] rounded-xl border-slate-100 shadow-xl">
                        <SelectItem value="20" className="font-bold">20</SelectItem>
                        <SelectItem value="50" className="font-bold">50</SelectItem>
                        <SelectItem value="100" className="font-bold">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
               </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
               <Table>
                 <TableHeader className="bg-slate-50/80 border-b border-slate-100">
                   <TableRow className="hover:bg-transparent border-none">
                     <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Request ID</TableHead>
                     <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Date & Schedule</TableHead>
                     <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Destination Address</TableHead>
                     <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Recipient</TableHead>
                     <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Status Details</TableHead>
                     <TableHead className="py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-left">Actual Completion</TableHead>
                     <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Result</TableHead>
                     <TableHead className="px-10 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {paginatedHistory.length === 0 ? (
                     <TableRow>
                       <TableCell colSpan={7} className="h-64 text-center text-slate-300 font-bold text-lg italic">No history records found matching criteria.</TableCell>
                     </TableRow>
                   ) : (
                     paginatedHistory.map(request => (
                       <TableRow key={request.request_id} id={`request-${request.request_id}`} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group">
                         <TableCell className="px-10 py-8 text-left align-top font-black text-slate-900">
                           #{request.request_id.slice(-8).toUpperCase()}
                         </TableCell>
                         <TableCell className="py-8 text-left align-top">
                            <p className="font-[900] text-slate-900 text-sm mb-1 uppercase tracking-tight">{formatLocalDate(request.delivery_date, 'MMM d, yyyy')}</p>
                            <p className="text-[10px] font-bold text-slate-400 bg-slate-50 w-fit px-2 py-0.5 rounded-md border border-slate-100">{request.time_window}</p>
                         </TableCell>
                         <TableCell className="max-w-[280px] text-left align-top py-8">
                            <div className="flex items-start gap-2.5">
                              <MapPin size={14} className="text-slate-300 mt-1 shrink-0" />
                              <p className="text-sm font-bold text-slate-600 leading-relaxed line-clamp-2">{request.dropoff_location.address}</p>
                            </div>
                         </TableCell>
                         <TableCell className="text-sm font-[900] text-slate-800 text-left py-8 align-top">{request.recipient_name}</TableCell>
                         <TableCell className="text-left py-8 align-top">
                           <div className="flex flex-col gap-2">
                             <span className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider w-fit px-2 py-1 rounded-md border", getTypeColor(request.request_type))}>
                               {getTypeIcon(request.request_type)}{request.request_type}
                             </span>
                             <div className="flex items-center gap-1.5">
                               <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter opacity-70">Rider: {request.assigned_rider_name || '---'}</span>
                             </div>
                             {request.rider_remark && (
                               <p className="text-[10px] font-medium text-slate-500 italic max-w-[180px] leading-tight border-l-2 border-slate-100 pl-2 py-0.5">
                                 "{request.rider_remark}"
                               </p>
                             )}
                           </div>
                         </TableCell>                         <TableCell className="text-left py-8 align-top">
                            {request.completed_at ? (
                              <div className="flex flex-col">
                                <p className="text-sm font-bold text-slate-700">
                                  {format(new Date(request.completed_at), "MMM d, yyyy")}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {format(new Date(request.completed_at), "hh:mm a")}
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 italic">---</span>
                            )}
                         </TableCell>
                         <TableCell className="px-10 py-8 text-right align-top">
                            {getHistoryStatusBadge(request)}
                         </TableCell>
                         <TableCell className="px-10 py-8 text-right align-top">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => openLogsDialog(request)}
                             className="rounded-xl h-9 px-3 text-xs font-bold gap-2 border-slate-200"
                           >
                             <HistoryIcon size={14} className="text-blue-500" /> Logs
                           </Button>
                         </TableCell>
                       </TableRow>
                     ))
                   )}
                 </TableBody>
               </Table>
            </CardContent>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-10 py-8 bg-slate-50/30 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 tracking-wide">
                  Showing <span className="text-slate-900">{((currentPage - 1) * parseInt(itemsPerPage)) + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * parseInt(itemsPerPage), historyRequests.length)}</span> of {historyRequests.length} results
                </p>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 w-10 p-0 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50" 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex items-center gap-1.5 mx-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'ghost'}
                        size="sm"
                        className={`h-10 w-10 rounded-xl font-black text-xs ${currentPage === page ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 w-10 p-0 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50" 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1)) }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status History Logs Modal */}
      <Dialog
        open={showLogsModal}
        onOpenChange={setShowLogsModal}
      >
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-3xl text-left">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <HistoryIcon size={20} />
              </div>
              <DialogTitle className="text-2xl font-black">
                Status History Logs
              </DialogTitle>
            </div>
            <DialogDescription className="font-medium text-slate-500">
              Complete status and remark audit trail for{" "}
              <strong>{selectedRequestForLogs?.recipient_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-slate-50 rounded-[2rem] border border-slate-100 max-h-[500px] overflow-y-auto p-2">
            <Table>
              <TableHeader className="bg-slate-50/80 sticky top-0 z-10 border-b border-slate-100">
                <TableRow>
                  <TableHead className="px-6 py-4 font-black text-[10px] uppercase text-slate-400">
                    Time
                  </TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400">
                    Status
                  </TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-slate-400">
                    Remark
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-32 text-center text-slate-400 italic font-bold"
                    >
                      No status updates recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  statusLogs.map((l, i) => (
                    <TableRow key={i} className="border-slate-100/50">
                      <TableCell className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap align-top">
                        {format(new Date(l.timestamp), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-[10px] font-black uppercase text-slate-600 whitespace-nowrap align-top pt-5 tracking-wider">
                        <Badge variant="outline">{l.status?.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-slate-600 leading-tight py-4">
                        {l.remark ? `"${l.remark}"` : <span className="text-slate-400 italic text-xs">No remark</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-8">
            <Button
              onClick={() => setShowLogsModal(false)}
              className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black"
            >
              Close History
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricBox({ icon, label, value, color }: any) {
  return (
    <div className={cn("p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 bg-white group hover:scale-[1.02] transition-all duration-300")}>
      <div className={cn("p-4 rounded-2xl shadow-sm transition-all group-hover:rotate-6", color)}>{icon}</div>
      <div className="space-y-0.5 text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">{label}</p>
        <p className="text-2xl font-black tracking-tighter text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function DeliveryStepper({ status }: { status: string }) {
  const steps = [
    { key: 'pending', label: 'Booked', icon: <Package size={12} /> },
    { key: 'picked_up', label: 'Picked Up', icon: <Bike size={12} /> },
    { key: 'in_transit', label: 'In Transit', icon: <Truck size={12} /> },
    { key: 'arrived', label: 'Arrived', icon: <MapPin size={12} /> },
    { key: 'completed', label: 'Done', icon: <CheckCircle2 size={12} /> }
  ];

  const getStatusIndex = (s: string) => {
    if (s === 'assigned') return 0;
    if (s === 'in_progress') return 2;
    const index = steps.findIndex(step => step.key === s);
    return index === -1 ? 0 : index;
  };

  const currentIndex = getStatusIndex(status);

  return (
    <div className="flex items-center justify-between w-full px-2">
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isUpcoming = i > currentIndex;

        return (
          <div key={step.key} className="flex flex-col items-center gap-2 flex-1 relative">
            {/* Connector Line */}
            {i < steps.length - 1 && (
              <div className={cn(
                "absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors duration-500",
                i < currentIndex ? "bg-[#00B14F]" : "bg-slate-100"
              )} />
            )}
            
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-500 border-2",
              isCompleted && "bg-[#00B14F] border-[#00B14F] text-white shadow-lg shadow-[#00B14F]/20",
              isCurrent && "bg-white border-[#00B14F] text-[#00B14F] animate-pulse scale-110",
              isUpcoming && "bg-white border-slate-100 text-slate-300"
            )}>
              {isCompleted ? <Check size={14} strokeWidth={4} /> : step.icon}
            </div>
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest transition-colors duration-500",
              isCompleted || isCurrent ? "text-slate-800" : "text-slate-300"
            )}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
