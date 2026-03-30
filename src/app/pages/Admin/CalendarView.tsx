import React, { useState, useEffect, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parseISO,
  isWithinInterval,
  parse
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  Filter, 
  Plus, 
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Building,
  AlertCircle,
  CheckCircle2,
  Truck,
  MoreHorizontal,
  Phone,
  Package,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import { DEPARTMENTS, DeliveryRequest } from '../../types';
import { RequestDetailsPanel } from '../../components/Admin/Dispatch/RequestDetailsPanel';
import { toast } from 'sonner';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';

// Types for filtering
interface CalendarFilters {
  status: string[];
  rider: string;
  department: string;
  urgency: string[];
  dateRange: { start: Date | null; end: Date | null };
}

type ViewMode = 'month' | 'week';

export function CalendarView() {
  const { requests, approveRequest, disapproveRequest, returnForRevision, refreshData } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [myRequestsOnly, setMyRequestsOnly] = useState(false);
  const [riders, setRiders] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  
  // Buffering filters (Applied only on "Apply Filters" click)
  const [activeFilters, setActiveFilters] = useState<CalendarFilters>({
    status: ['pending', 'approved', 'assigned', 'in_transit', 'completed', 'returned_for_revision', 'submitted_waiting'],
    rider: 'all',
    department: 'all',
    urgency: ['Low', 'Medium', 'High', 'Urgent'],
    dateRange: { start: null, end: null }
  });

  const [localFilters, setLocalFilters] = useState<CalendarFilters>({ ...activeFilters });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyFilters = () => setActiveFilters({ ...localFilters });

  const handleApprove = async (riderId: string, remark: string) => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await approveRequest(selectedTask.request_id, riderId, remark);
      toast.success("Request approved and rider assigned.");
      setSelectedTask(null);
    } catch (err) {
      toast.error("Failed to approve request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (remark: string) => {
    if (!selectedTask) return;
    if (!remark) {
      toast.error("Please provide a reason.");
      return;
    }
    setIsSubmitting(true);
    try {
      await disapproveRequest(selectedTask.request_id, remark);
      toast.success("Request declined.");
      setSelectedTask(null);
    } catch (err) {
      toast.error("Failed to decline request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch riders for the filter
  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          const allUsers = Array.isArray(data) ? data : (data.data || []);
          setRiders(allUsers.filter((u: any) => u.role === 'rider'));
        }
      } catch (err) {
        console.error('Failed to load riders', err);
      }
    };
    fetchRiders();
  }, []);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setViewMode('month');
  };

  // Calendar Logic
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(weekStart);
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, viewMode]);

  // Filter requests based on all criteria
  const filteredRequests = useMemo(() => {
    return (requests || []).filter(req => {
      // 1. System Rule: Hide 'submitted_waiting' from Admin views (grace period)
      if (req.status === 'submitted_waiting') return false;

      // 2. Search Query (ID or Name)
      const matchesSearch = 
        req.request_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.requester_name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 3. Status Filter
      if (!activeFilters.status.includes(req.delivery_status || req.status)) return false;

      // 4. Rider Filter
      if (activeFilters.rider !== 'all' && req.assigned_rider_id !== activeFilters.rider) return false;

      // 5. Department Filter
      if (activeFilters.department !== 'all' && req.requester_department !== activeFilters.department) return false;

      // 6. Urgency Filter
      if (!activeFilters.urgency.includes(req.urgency_level)) return false;

      return true;
    });
  }, [requests, searchQuery, activeFilters]);

  // Group filtered requests by day for easier rendering
  const requestsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredRequests.forEach(req => {
      const dayKey = format(parseISO(req.delivery_date), 'yyyy-MM-dd');
      if (!grouped[dayKey]) grouped[dayKey] = [];
      grouped[dayKey].push(req);
    });
    return grouped;
  }, [filteredRequests]);

  const toggleStatus = (status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      status: prev.status.includes(status) 
        ? prev.status.filter(s => s !== status) 
        : [...prev.status, status]
    }));
  };

  const toggleUrgency = (urgency: string) => {
    setLocalFilters(prev => ({
      ...prev,
      urgency: prev.urgency.includes(urgency) 
        ? prev.urgency.filter(u => u !== urgency) 
        : [...prev.urgency, urgency]
    }));
  };

  const resetFilters = () => {
    const defaults: CalendarFilters = {
      status: ['pending', 'approved', 'assigned', 'in_transit', 'completed', 'returned_for_revision'],
      rider: 'all',
      department: 'all',
      urgency: ['Low', 'Medium', 'High', 'Urgent'],
      dateRange: { start: null, end: null }
    };
    setLocalFilters(defaults);
    setActiveFilters(defaults);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Header Section */}
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Calendar View</h1>
            <div className="flex items-center gap-4 mt-2">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">In Transit</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Urgent</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search request ID / rider..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-slate-200 bg-slate-50/50 focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshData}
            className="h-11 w-11 rounded-xl border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4 text-slate-600" />
          </Button>
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-xl border border-slate-200/50 ml-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Active</span>
            <div className="w-8 h-4 bg-emerald-500 rounded-full relative">
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)]">
          
          {/* Calendar Controls */}
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-10 px-4 rounded-xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
                <Filter className="w-4 h-4 mr-2" /> Filter
              </Button>
              <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goToToday} 
                  className={cn("h-8 rounded-lg px-4 text-xs font-bold transition-all", isSameDay(currentDate, new Date()) ? "text-slate-900 bg-white shadow-sm" : "text-slate-600 hover:bg-white hover:shadow-sm")}
                >
                  Today
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('week')}
                  className={cn("h-8 rounded-lg px-4 text-xs font-bold transition-all", viewMode === 'week' ? "text-slate-900 bg-white shadow-sm" : "text-slate-600 hover:bg-white hover:shadow-sm")}
                >
                  Week
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('month')}
                  className={cn("h-8 rounded-lg px-4 text-xs font-bold transition-all", viewMode === 'month' ? "text-slate-900 bg-white shadow-sm" : "text-slate-600 hover:bg-white hover:shadow-sm")}
                >
                  Month
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <h2 className="text-xl font-black text-slate-900 min-w-[140px] text-center tracking-tight">
                {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
              </h2>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth} className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
                  <ChevronLeft className="h-5 w-5 text-slate-600" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
                  <ChevronRight className="h-5 w-5 text-slate-600" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">My Requests Only</span>
               <div className="w-10 h-5 bg-emerald-500 rounded-full relative cursor-pointer" onClick={() => setMyRequestsOnly(!myRequestsOnly)}>
                  <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300", myRequestsOnly ? "right-0.5" : "left-0.5")}></div>
               </div>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-100 shrink-0">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-3 text-center border-r border-slate-50 last:border-r-0">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <div className={cn("grid grid-cols-7", viewMode === 'month' ? "min-h-full" : "h-auto")}>
              {calendarDays.map((day, idx) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayRequests = requestsByDay[dayKey] || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={day.toString()} 
                    className={cn(
                      "min-h-[140px] border-r border-b border-slate-100 p-2 transition-colors flex flex-col",
                      !isCurrentMonth && viewMode === 'month' && "bg-slate-50/40 opacity-40",
                      isToday && "bg-blue-50/30"
                    )}
                  >
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className={cn(
                        "text-xs font-bold leading-none w-6 h-6 flex items-center justify-center rounded-lg transition-all",
                        isToday ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400"
                      )}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[120px] scrollbar-hide">
                      {dayRequests.map(req => (
                        <CalendarTaskCard key={req.request_id} request={req} onClick={() => setSelectedTask(req)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar Filters */}
        <aside className="w-[320px] bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 tracking-tight">Filters</h3>
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-[10px] font-black uppercase text-primary hover:bg-primary/5 rounded-lg h-8">Reset</Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Status Filter */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</h4>
                 <ChevronLeft className="w-3 h-3 text-slate-300 -rotate-90" />
               </div>
               <div className="space-y-2.5">
                  <FilterCheckbox label="Pending" checked={localFilters.status.includes('pending')} onChange={() => toggleStatus('pending')} />
                  <FilterCheckbox label="Approved" checked={localFilters.status.includes('approved')} onChange={() => toggleStatus('approved')} />
                  <FilterCheckbox label="Assigned" checked={localFilters.status.includes('assigned')} onChange={() => toggleStatus('assigned')} />
                  <FilterCheckbox label="In Transit" checked={localFilters.status.includes('in_transit')} onChange={() => toggleStatus('in_transit')} />
                  <FilterCheckbox label="Revision" checked={localFilters.status.includes('returned_for_revision')} onChange={() => toggleStatus('returned_for_revision')} />
                  <FilterCheckbox label="Completed" checked={localFilters.status.includes('completed')} onChange={() => toggleStatus('completed')} />
               </div>
            </div>

            {/* Rider Filter */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rider</h4>
                 <ChevronLeft className="w-3 h-3 text-slate-300 -rotate-90" />
               </div>
               <Select value={localFilters.rider} onValueChange={(val) => setLocalFilters(prev => ({ ...prev, rider: val }))}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 w-full font-bold text-slate-700 bg-slate-50/50">
                    <SelectValue placeholder="Select Rider" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Riders</SelectItem>
                    {riders.map(rider => (
                      <SelectItem key={rider.id} value={rider.id}>{rider.name}</SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</h4>
                 <ChevronLeft className="w-3 h-3 text-slate-300 -rotate-90" />
               </div>
               <Select value={localFilters.department} onValueChange={(val) => setLocalFilters(prev => ({ ...prev, department: val }))}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 w-full font-bold text-slate-700 bg-slate-50/50">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">All Departments</SelectItem>
                    {DEPARTMENTS.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>

            {/* Urgency Level Filter */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Urgency Level</h4>
                 <ChevronLeft className="w-3 h-3 text-slate-300 -rotate-90" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                  <FilterCheckbox label="Low" checked={localFilters.urgency.includes('Low')} onChange={() => toggleUrgency('Low')} />
                  <FilterCheckbox label="Medium" checked={localFilters.urgency.includes('Medium')} onChange={() => toggleUrgency('Medium')} />
                  <FilterCheckbox label="High" checked={localFilters.urgency.includes('High')} onChange={() => toggleUrgency('High')} />
                  <FilterCheckbox label="Urgent" checked={localFilters.urgency.includes('Urgent')} colorClass="text-rose-600" onChange={() => toggleUrgency('Urgent')} />
               </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Range</h4>
                 <ChevronLeft className="w-3 h-3 text-slate-300 -rotate-90" />
               </div>
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-3">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">
                    {format(calendarDays[0], 'MMM d, yyyy')} — {format(calendarDays[calendarDays.length - 1], 'MMM d, yyyy')}
                  </span>
               </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-50 bg-slate-50/30 grid grid-cols-2 gap-3">
            <Button 
              onClick={applyFilters}
              className="h-12 bg-primary hover:bg-primary/90 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              Apply Filters
            </Button>
            <Button 
              variant="outline" 
              onClick={resetFilters} 
              className="h-12 rounded-xl border-slate-200 font-black text-[11px] uppercase tracking-widest bg-white hover:bg-slate-50 transition-all active:scale-95"
            >
              Reset All
            </Button>
          </div>
        </aside>
      </div>

      {/* Task Details Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[90vh] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
          {selectedTask && (
            <RequestDetailsPanel 
              request={selectedTask}
              riders={riders}
              activeRequests={requests}
              onApprove={handleApprove}
              onDecline={handleDecline}
              isSubmitting={isSubmitting}
              onBack={() => setSelectedTask(null)}
              readOnly={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small Component for individual calendar cards
function CalendarTaskCard({ request, onClick }: { request: any, onClick: () => void }) {
  const isRevision = request.status === 'returned_for_revision';

  const getStatusColor = (status: string, urgency: string) => {
    if (urgency === 'Urgent') return 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100 shadow-sm';
    switch (status) {
      case 'completed': return 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100';
      case 'assigned':
      case 'in_transit': return 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100 shadow-sm';
      case 'approved': return 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100 shadow-sm';
      default: return 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100 shadow-sm';
    }
  };

  const getStatusIndicator = (status: string, urgency: string) => {
    if (urgency === 'Urgent') return 'bg-rose-500';
    switch (status) {
      case 'completed': return 'bg-slate-400';
      case 'assigned':
      case 'in_transit': return 'bg-blue-500';
      case 'approved': return 'bg-emerald-500';
      default: return 'bg-amber-500';
    }
  };
  
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-2.5 rounded-xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] shadow-sm",
        getStatusColor(request.delivery_status || request.status, request.urgency_level),
        isRevision && "opacity-50 grayscale-[0.8] pointer-events-none"
      )}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-black tracking-tight opacity-70">#{request.request_id.slice(-8)}</span>
        <div className={cn("w-2 h-2 rounded-full shrink-0", getStatusIndicator(request.delivery_status || request.status, request.urgency_level))}></div>
      </div>
      
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-black leading-tight truncate flex-1">{request.requester_name}</p>
        <p className="text-[9px] font-bold opacity-70 whitespace-nowrap">{request.time_window?.split('-')[0].trim()}</p>
      </div>
      
      <p className="text-[9px] font-bold mt-1 opacity-60 truncate">
        {request.pickup_location.address.split(',')[0]} → {request.dropoff_location.address.split(',')[0]}
      </p>

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-current/10">
        <div className="flex items-center gap-1">
          <User className="w-2.5 h-2.5 opacity-60" />
          <span className="text-[8px] font-black uppercase tracking-tight truncate max-w-[60px]">
            {request.assigned_rider_name || 'Unassigned'}
          </span>
        </div>
        {request.urgency_level === 'Urgent' && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-md">
             <AlertCircle className="w-2 h-2" />
             <span className="text-[7px] font-black uppercase">Urgent</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple Checkbox wrapper for filters
function FilterCheckbox({ label, checked, onChange, colorClass = "text-slate-700" }: { label: string, checked: boolean, onChange: () => void, colorClass?: string }) {
  return (
    <div className="flex items-center space-x-3 group cursor-pointer" onClick={onChange}>
      <Checkbox 
        checked={checked} 
        onCheckedChange={onChange}
        className="rounded-md border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all group-hover:border-primary/50"
      />
      <label className={cn("text-xs font-bold leading-none select-none cursor-pointer transition-colors group-hover:text-slate-900", checked ? colorClass : "text-slate-500")}>
        {label}
      </label>
    </div>
  );
}
