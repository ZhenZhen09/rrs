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
import { useAuth } from '../../context/AuthContext';
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
  const { logout } = useAuth();
  const { requests, approveRequest, disapproveRequest, returnForRevision, refreshData } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [myRequestsOnly, setMyRequestsOnly] = useState(false);
  const [riders, setRiders] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<{ date: Date, tasks: any[] } | null>(null);
  
  // Buffering filters (Applied only on "Apply Filters" click)
  const [activeFilters, setActiveFilters] = useState<CalendarFilters>({
    status: ['pending', 'approved', 'assigned', 'in_progress', 'completed', 'failed', 'returned_for_revision', 'submitted_waiting', 'cancelled', 'disapproved'],
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
      // Map to cancelRequest for consistency with Dispatch Console
      await cancelRequest(selectedTask.request_id, remark);
      toast.success("Request cancelled.");
      setSelectedTask(null);
    } catch (err) {
      toast.error("Failed to cancel request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch riders for the filter
  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const res = await fetch('/api/users', { credentials: 'include' });
        if (res.status === 401) {
          logout();
          return;
        }
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
  }, [logout]);

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
        (req.request_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requester_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 3. Status Filter
      const reqStatus = req.delivery_status || req.status;
      if (!activeFilters.status.includes(reqStatus)) return false;

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
      status: ['pending', 'approved', 'assigned', 'in_progress', 'completed', 'failed', 'returned_for_revision'],
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
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Top Header Section */}
      <div className="bg-white border-b border-slate-100 px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-1.5 bg-primary/5 rounded-lg text-primary">
            <CalendarIcon size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 tracking-tight leading-none">Calendar View</h1>
            <div className="flex items-center gap-4 mt-1">
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Active</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">In Progress</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Pending</span>
               </div>
               <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"></div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Failed</span>
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
            <Input 
              placeholder="Search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-7 rounded-lg border-slate-200 bg-slate-50/50 focus-visible:ring-primary/20 focus-visible:border-primary font-bold text-[10px]"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshData}
            className="h-7 w-7 rounded-lg border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Calendar Controls */}
          <div className="px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 bg-slate-50/30 border-b border-slate-100/50">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-7 px-3 rounded-lg border-slate-200 font-black text-[8px] uppercase tracking-widest text-slate-600 hover:bg-white transition-all">
                <Filter className="w-3 h-3 mr-1" /> Filter
              </Button>
              <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200/50">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={goToToday} 
                  className={cn("h-6 rounded-md px-3 text-[8px] font-black uppercase tracking-widest transition-all", isSameDay(currentDate, new Date()) ? "text-slate-900 bg-white shadow-sm" : "text-slate-500 hover:text-slate-900")}
                >
                  Today
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('month')}
                  className={cn("h-6 rounded-md px-3 text-[8px] font-black uppercase tracking-widest transition-all", viewMode === 'month' ? "text-slate-900 bg-white shadow-sm" : "text-slate-500 hover:text-slate-900")}
                >
                  Month
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={prevMonth} className="h-7 w-7 rounded-lg border-slate-200 hover:bg-white hover:shadow-sm transition-all active:scale-95">
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-7 w-7 rounded-lg border-slate-200 hover:bg-white hover:shadow-sm transition-all active:scale-95">
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </Button>
              </div>
              <h2 className="text-sm font-black text-slate-900 min-w-[120px] text-center tracking-tight">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-white px-2.5 h-7 rounded-lg border border-slate-100 shadow-sm">
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">My Requests</span>
               <div 
                 className={cn("w-7 h-3.5 rounded-full relative cursor-pointer transition-colors duration-300", myRequestsOnly ? "bg-emerald-500" : "bg-slate-200")} 
                 onClick={() => setMyRequestsOnly(!myRequestsOnly)}
               >
                  <div className={cn("absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow-sm transition-all duration-300", myRequestsOnly ? "right-0.5" : "left-0.5")}></div>
               </div>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 border-b border-slate-100 shrink-0 bg-white">
            {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
              <div key={day} className="py-2 text-center border-r border-slate-50 last:border-r-0">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            <div className="grid grid-cols-7 min-h-full">
              {calendarDays.map((day, idx) => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayRequests = requestsByDay[dayKey] || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={day.toString()} 
                    className={cn(
                      "min-h-[140px] border-r border-b border-slate-100 p-2.5 transition-colors flex flex-col",
                      !isCurrentMonth && "bg-slate-50/20 opacity-40 grayscale-[0.5]",
                      isToday && "bg-emerald-50/5"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-md transition-all",
                        isToday ? "bg-emerald-500 text-white shadow-sm" : "text-slate-400"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayRequests.length > 0 && (
                        <button 
                          onClick={() => setSelectedDayTasks({ date: day, tasks: dayRequests })}
                          className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter hover:text-primary hover:underline transition-colors"
                        >
                          {dayRequests.length} {dayRequests.length === 1 ? 'event' : 'events'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                      {dayRequests.slice(0, 4).map(req => (
                        <CalendarTaskRow key={req.request_id} request={req} onClick={() => setSelectedTask(req)} />
                      ))}
                      {dayRequests.length > 4 && (
                        <div className="pl-1.5 py-0.5">
                          <button 
                            onClick={() => setSelectedDayTasks({ date: day, tasks: dayRequests })}
                            className="text-[8px] font-black text-primary uppercase tracking-widest cursor-pointer hover:underline"
                          >
                            + {dayRequests.length - 4} more
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar Filters */}
        <aside className="w-[220px] bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-hidden shadow-[-5px_0_20px_rgba(0,0,0,0.01)]">
          <div className="p-3 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 tracking-tight">Filters</h3>
            <button onClick={resetFilters} className="text-[7px] font-black uppercase text-primary hover:bg-primary/5 rounded-md h-5 px-2">Clear</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
            {/* Status Filter */}
            <div className="space-y-2">
               <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</h4>
               <div className="space-y-1">
                  <FilterCheckbox label="Pending" checked={localFilters.status.includes('pending')} onChange={() => toggleStatus('pending')} />
                  <FilterCheckbox label="Approved" checked={localFilters.status.includes('approved')} onChange={() => toggleStatus('approved')} />
                  <FilterCheckbox label="Assigned" checked={localFilters.status.includes('assigned')} onChange={() => toggleStatus('assigned')} />
                  <FilterCheckbox label="In Progress" checked={localFilters.status.includes('in_progress')} onChange={() => toggleStatus('in_progress')} />
                  <FilterCheckbox label="Revision" checked={localFilters.status.includes('returned_for_revision')} onChange={() => toggleStatus('returned_for_revision')} />
                  <FilterCheckbox label="Completed" checked={localFilters.status.includes('completed')} onChange={() => toggleStatus('completed')} />
                  <FilterCheckbox label="Failed" checked={localFilters.status.includes('failed')} onChange={() => toggleStatus('failed')} />
               </div>
            </div>

            {/* Rider Filter */}
            <div className="space-y-2">
               <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rider</h4>
               <Select value={localFilters.rider} onValueChange={(val) => setLocalFilters(prev => ({ ...prev, rider: val }))}>
                  <SelectTrigger className="h-7 rounded-md border-slate-200 w-full font-bold text-slate-700 bg-slate-50/50 hover:bg-white transition-all shadow-none border-none px-2">
                    <SelectValue placeholder="Select" className="text-[9px]" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md border-slate-100 shadow-xl p-1">
                    <SelectItem value="all" className="rounded-sm py-1 font-bold text-[9px]">All Riders</SelectItem>
                    {riders.map(rider => (
                      <SelectItem key={rider.id} value={rider.id} className="rounded-sm py-1 font-bold text-[9px]">{rider.name}</SelectItem>
                    ))}
                  </SelectContent>
               </Select>
            </div>

            {/* Urgency Level Filter */}
            <div className="space-y-2">
               <h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Urgency</h4>
               <div className="flex gap-1 flex-wrap">
                  {['Low', 'Medium', 'High', 'Urgent'].map(level => (
                    <button
                      key={level}
                      onClick={() => toggleUrgency(level)}
                      className={cn(
                        "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest transition-all border",
                        localFilters.urgency.includes(level) 
                          ? "bg-slate-900 border-slate-900 text-white" 
                          : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                      )}
                    >
                      {level}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-50 bg-slate-50/30">
            <Button 
              onClick={applyFilters}
              className="w-full h-8 bg-primary hover:bg-primary/90 text-white rounded-md font-black text-[9px] uppercase tracking-widest shadow-sm"
            >
              Update View
            </Button>
          </div>
        </aside>
      </div>

      {/* Task Details Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[90vh] rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>View and manage request details.</DialogDescription>
          </DialogHeader>
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

      {/* Day Schedule Modal */}
      <Dialog open={!!selectedDayTasks} onOpenChange={(open) => !open && setSelectedDayTasks(null)}>
        <DialogContent className="max-w-xs rounded-xl p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 leading-none">Day Schedule</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                  {selectedDayTasks && format(selectedDayTasks.date, 'MMM d')}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                <CalendarIcon size={16} />
              </div>
            </div>

            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              {selectedDayTasks?.tasks.map(req => (
                <div key={req.request_id} className="p-0.5 hover:bg-slate-50 rounded-md transition-all">
                  <CalendarTaskRow 
                    request={req} 
                    onClick={() => {
                      setSelectedDayTasks(null);
                      setTimeout(() => setSelectedTask(req), 100);
                    }} 
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100">
            <Button 
              onClick={() => setSelectedDayTasks(null)} 
              variant="outline" 
              className="w-full h-8 rounded-md font-black text-[9px] uppercase tracking-widest border-slate-200"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// kondensed row for individual events
function CalendarTaskRow({ request, onClick }: { request: any, onClick: () => void }) {
  const isRevision = request.status === 'returned_for_revision';

  const getStatusDotColor = (status: string, urgency: string) => {
    if (urgency === 'Urgent') return 'bg-rose-500';
    switch (status) {
      case 'completed': return 'bg-slate-400';
      case 'failed': return 'bg-rose-500';
      case 'in_progress': return 'bg-blue-500';
      case 'assigned': return 'bg-emerald-500';
      case 'approved': return 'bg-emerald-500';
      default: return 'bg-amber-500';
    }
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1 rounded-md transition-all text-left group hover:bg-slate-50 active:scale-[0.98]",
        isRevision && "opacity-40 grayscale pointer-events-none"
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getStatusDotColor(request.delivery_status || request.status, request.urgency_level))}></div>
      <span className="text-[8px] font-bold text-slate-900 truncate">
        {request.on_behalf_of || request.requester_name}
      </span>
    </button>
  );
}

// Simple Checkbox wrapper for filters
function FilterCheckbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) {
  return (
    <div className="flex items-center space-x-2 group cursor-pointer" onClick={onChange}>
      <Checkbox 
        checked={checked} 
        onCheckedChange={onChange}
        className="h-3.5 w-3.5 rounded border-slate-200 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
      />
      <label className={cn("text-[9px] font-black uppercase tracking-widest select-none cursor-pointer transition-colors group-hover:text-slate-900", checked ? "text-slate-900" : "text-slate-400")}>
        {label}
      </label>
    </div>
  );
}
