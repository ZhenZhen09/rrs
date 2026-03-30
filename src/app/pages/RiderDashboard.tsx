import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { MapPin, Clock, User as UserIcon, Building2, Calendar, Package, TrendingUp, Bike, LayoutDashboard, CalendarClock, History, ChevronRight, Phone, Map as MapIcon, ExternalLink, AlertTriangle, Banknote, FileText, Bell, BellOff } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { formatLocalDate, getLocalDateStr } from '../utils/dateUtils';
import { DeliveryRequest, DeliveryStatus } from '../types';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { MapPicker } from '../components/MapPicker';

export function RiderDashboard() {
  const { user } = useAuth();
  const { requests, updateDeliveryStatus, refreshData } = useData();
  const [selectedRequest, setSelectedRequest] = useState<DeliveryRequest | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<DeliveryStatus>('assigned');
  const [activeTab, setActiveTab] = useState('today');
  
  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const watchId = useRef<number | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Connect to socket for live updates
    const socket = io(window.location.origin);
    socketRef.current = socket;

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      socket.disconnect();
    };
  }, []);

  const myDeliveries = useMemo(() => {
    return (Array.isArray(requests) ? requests : []).filter(req => req.assigned_rider_id === user?.id);
  }, [requests, user?.id]);

  const todayStr = getLocalDateStr(new Date());
  const tomorrowStr = getLocalDateStr(addDays(new Date(), 1));

  const todayDeliveries = useMemo(() => myDeliveries.filter(req => 
    getLocalDateStr(new Date(req.delivery_date)) === todayStr && 
    req.delivery_status !== 'completed' && 
    req.delivery_status !== 'failed'
  ), [myDeliveries, todayStr]);
  
  const tomorrowDeliveries = useMemo(() => myDeliveries.filter(req => 
    getLocalDateStr(new Date(req.delivery_date)) === tomorrowStr &&
    req.delivery_status !== 'completed' && 
    req.delivery_status !== 'failed'
  ), [myDeliveries, tomorrowStr]);

  const historyDeliveries = useMemo(() => myDeliveries.filter(req => 
    req.delivery_status === 'completed' || req.delivery_status === 'failed'
  ), [myDeliveries]);

  const stats = useMemo(() => {
    const completed = myDeliveries.filter(r => r.delivery_status === 'completed').length;
    const pending = todayDeliveries.length;
    return { completed, pending };
  }, [myDeliveries, todayDeliveries]);

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;
    
    try {
      await updateDeliveryStatus(selectedRequest.request_id, newStatus, statusNote);
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      setShowStatusDialog(false);
      setSelectedRequest(null);
      setStatusNote('');
      
      // If completed or failed, stop tracking
      if (newStatus === 'completed' || newStatus === 'failed') {
        stopTracking();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const startTracking = (request: DeliveryRequest) => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);
    const socket = socketRef.current;

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        socket.emit('update-location', {
          riderId: user?.id,
          riderName: user?.name,
          lat: latitude,
          lng: longitude,
          requestId: request.request_id
        });
      },
      (error) => {
        console.error('Tracking error:', error);
        toast.error('Location tracking error');
      },
      { enableHighAccuracy: true, distanceFilter: 10 }
    );
  };

  const stopTracking = () => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse';
      case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'failed': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'Urgent': return <Badge className="bg-rose-500 text-white border-none flex items-center gap-1 shadow-sm shadow-rose-500/20"><AlertTriangle size={12} /> Urgent</Badge>;
      case 'High': return <Badge className="bg-orange-500 text-white border-none">High</Badge>;
      case 'Medium': return <Badge className="bg-blue-500 text-white border-none">Medium</Badge>;
      case 'Low': return <Badge className="bg-slate-400 text-white border-none">Low</Badge>;
      default: return null;
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'Bank Transaction': return <Banknote className="h-3.5 w-3.5" />;
      case 'Countering': return <FileText className="h-3.5 w-3.5" />;
      case 'Delivery/Pickup': return <Package className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8 pb-20 max-w-5xl mx-auto px-4 sm:px-6 pt-6">
      {/* Rider Header */}
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
            <TrendingUp size={160} />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="text-left space-y-1">
               <p className="text-blue-400 font-black uppercase tracking-[0.2em] text-[10px]">Rider Dashboard</p>
               <h1 className="text-3xl font-[900] tracking-tight">Hello, {user?.name}</h1>
               <div className="flex items-center gap-4 mt-4">
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                     <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">Active Jobs</p>
                     <p className="text-xl font-black">{stats.pending}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                     <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest">Completed</p>
                     <p className="text-xl font-black">{stats.completed}</p>
                  </div>
               </div>
            </div>
            <Button onClick={() => refreshData()} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-2xl h-14 px-8 font-black uppercase tracking-widest text-xs">
               Sync Schedule
            </Button>
         </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/60 p-1.5 rounded-[1.5rem] h-auto border-none mb-8 inline-flex shadow-inner">
          <TabsTrigger value="today" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-300">
            <LayoutDashboard className="w-4 h-4 mr-2" /> Today
          </TabsTrigger>
          <TabsTrigger value="tomorrow" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-300">
            <CalendarClock className="w-4 h-4 mr-2" /> Tomorrow
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-300">
            <History className="w-4 h-4 mr-2" /> History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          {todayDeliveries.length === 0 ? (
            <div className="py-32 flex flex-col items-center justify-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
               <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-slate-200">
                  <Package size={32} />
               </div>
               <p className="text-slate-400 font-bold">No deliveries assigned for today</p>
            </div>
          ) : (
            todayDeliveries.map(req => (
              <Card key={req.request_id} className="border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden bg-white transition-all hover:shadow-[0_15px_40px_rgb(0,0,0,0.04)] group">
                <CardHeader className="pb-4 text-left px-8 pt-8">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className={`px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${getStatusColor(req.delivery_status)}`}>
                       {req.delivery_status?.replace('_', ' ') || 'ASSIGNED'}
                    </Badge>
                    <div className="flex items-center gap-2">
                       {getUrgencyBadge(req.urgency_level)}
                       <span className="text-[11px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{req.time_window}</span>
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-[900] text-slate-900 tracking-tight">To: {req.recipient_name}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 text-slate-500 font-bold text-xs uppercase tracking-tighter">
                     {getTypeIcon(req.request_type)}
                     <span>{req.request_type}</span>
                     <span className="mx-1 opacity-20">|</span>
                     <span>Ref: {req.request_id.substring(0, 8)}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 text-left px-8 pb-8">
                  <div className="bg-slate-50/80 p-6 rounded-[2rem] border border-slate-100/50 relative">
                     <div className="absolute left-9 top-10 bottom-10 w-[1px] bg-slate-200 border-l border-dashed" />
                     <div className="space-y-8 relative">
                        <div className="flex items-start gap-4">
                           <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm relative z-10">
                              <div className="w-2 h-2 rounded-full bg-[#00B14F]" />
                           </div>
                           <div className="flex-1 pt-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup Point</p>
                              <p className="text-sm font-bold text-slate-700 leading-tight">{req.pickup_location.address}</p>
                           </div>
                        </div>
                        <div className="flex items-start gap-4">
                           <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm relative z-10">
                              <div className="w-2 h-2 rounded-full bg-rose-500" />
                           </div>
                           <div className="flex-1 pt-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Drop-off Destination</p>
                              <p className="text-sm font-black text-slate-900 leading-tight">{req.dropoff_location.address}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {req.admin_remark && (
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-3">
                       <div className="p-2 bg-white rounded-xl shadow-sm h-fit"><Building2 size={16} className="text-blue-500" /></div>
                       <div>
                          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Admin Instructions</p>
                          <p className="text-sm font-bold text-blue-700 leading-relaxed italic">"{req.admin_remark}"</p>
                       </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4">
                    <Button 
                      className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 transition-all active:scale-95"
                      onClick={() => {
                        setSelectedRequest(req);
                        setNewStatus(req.delivery_status || 'assigned');
                        setStatusNote(req.rider_remark || '');
                        setShowStatusDialog(true);
                      }}
                    >
                      Update Status
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-14 w-14 p-0 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                      onClick={() => window.open(`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${req.pickup_location.lat}%2C${req.pickup_location.lng}%3B${req.dropoff_location.lat}%2C${req.dropoff_location.lng}`, '_blank')}                    >
                      <MapIcon size={20} className="text-slate-600" />
                    </Button>
                    {req.recipient_contact && (
                      <Button 
                        variant="outline" 
                        className="h-14 w-14 p-0 rounded-2xl border-slate-200 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                        onClick={() => window.open(`tel:${req.recipient_contact}`)}
                      >
                        <Phone size={20} className="text-slate-600" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="tomorrow" className="space-y-4">
          {tomorrowDeliveries.length === 0 ? (
            <div className="py-24 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed font-bold text-slate-400">
              No deliveries scheduled for tomorrow
            </div>
          ) : (
            tomorrowDeliveries.map(req => (
              <Card key={req.request_id} className="border-slate-100 rounded-[2rem] shadow-sm text-left">
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="secondary" className="font-black text-[10px] tracking-widest uppercase bg-slate-100 text-slate-500">{req.time_window}</Badge>
                    {getUrgencyBadge(req.urgency_level)}
                  </div>
                  <CardTitle className="text-lg font-black">To {req.recipient_name}</CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                      <MapPin size={14} className="text-rose-500" />
                      <p className="truncate">{req.dropoff_location.address}</p>
                   </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyDeliveries.length === 0 ? (
             <div className="py-24 text-center font-bold text-slate-300 italic">No past deliveries found</div>
          ) : (
            historyDeliveries.map(req => (
              <Card key={req.request_id} className="border-slate-100 rounded-[2rem] opacity-70 hover:opacity-100 transition-all text-left">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black text-slate-400">{formatLocalDate(req.delivery_date, 'MMM d, yyyy')}</span>
                    <Badge className={`font-black text-[9px] uppercase tracking-tighter ${getStatusColor(req.delivery_status)} border-none`}>
                      {req.delivery_status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-black">To {req.recipient_name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs font-bold text-slate-500 truncate leading-relaxed">"{req.rider_remark || 'No remarks provided'}"</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-[500px] w-full text-left">
          <DialogHeader>
             <DialogTitle className="text-2xl font-black">Update Task Status</DialogTitle>
             <p className="text-slate-500 font-medium mt-1">Status update for <strong>{selectedRequest?.recipient_name}</strong></p>
          </DialogHeader>
          <div className="space-y-6 my-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Delivery Status</Label>
              <Select value={newStatus} onValueChange={(v: any) => setNewStatus(v)}>
                <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-2xl p-2">
                  <SelectItem value="assigned" className="rounded-xl py-3 font-bold">Assigned</SelectItem>
                  <SelectItem value="in_progress" className="rounded-xl py-3 font-bold text-amber-600">On The Way</SelectItem>
                  <SelectItem value="completed" className="rounded-xl py-3 font-bold text-emerald-600">Completed</SelectItem>
                  <SelectItem value="failed" className="rounded-xl py-3 font-bold text-red-600">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Rider Remark</Label>
              <Textarea 
                placeholder="e.g. Traffic is heavy, target arrival in 15 mins..." 
                className="rounded-2xl bg-slate-50 border-none shadow-inner resize-none font-medium text-slate-700 h-32"
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button variant="ghost" onClick={() => setShowStatusDialog(false)} className="flex-1 font-black rounded-xl">Cancel</Button>
            <Button onClick={handleUpdateStatus} className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20">Confirm Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
