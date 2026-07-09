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
  parseISO
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  RefreshCw, 
  Filter, 
  Plus, 
  Calendar as CalendarIcon,
  MapPin,
  MoreHorizontal,
  Package,
  FileText,
  Bike
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { cn } from '../../components/ui/utils';
import { RequestDetailsPanel } from '../../components/Admin/Dispatch/RequestDetailsPanel';
import { toast } from 'sonner';
import { getGroupedStatus, getStatusColor } from '../../utils/statusMapping';
import { DEPARTMENTS } from '../../types';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '../../components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface CalendarFilters {
  status: string[];
  rider: string;
  department: string;
  urgency: string[];
  dateRange: { start: Date | null; end: Date | null };
}

type ViewMode = 'month' | 'week';

function getCalendarExportActionBy(request: any) {
  const status = getGroupedStatus(request.status, request.delivery_status);
  const adminUpdated = typeof request.rider_remark === 'string' && request.rider_remark.includes('[Admin update by');

  if (status === 'declined') return 'Declined by Admin';
  if (status === 'failed') return adminUpdated ? 'Declined by Admin' : 'Declined by Rider';
  if (status === 'done') return adminUpdated ? 'Done by Admin' : 'Done by Rider';
  return '';
}

// Helper: Technical Status Legend
function StatusIndicator({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-1.5 h-1.5 rounded-full", color)}></div>
      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none">{label}</span>
    </div>
  );
}

// MAIN COMPONENT
export function CalendarView() {
  const { logout } = useAuth();
  const { requests, approveRequest, cancelRequest, refreshData } = useData();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [myRequestsOnly, setMyRequestsOnly] = useState(false);
  const [riders, setRiders] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [displayMode, setDisplayMode] = useState<'calendar' | 'list'>('calendar');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'delivery_date', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<{ date: Date, tasks: any[] } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters State - Using Grouped Keys
  const [activeFilters, setActiveFilters] = useState<CalendarFilters>({
    status: ['pending', 'active', 'done', 'failed', 'declined'],
    rider: 'all',
    department: 'all',
    urgency: ['Low', 'Medium', 'High', 'Urgent'],
    dateRange: { start: null, end: null }
  });
  const [localFilters, setLocalFilters] = useState<CalendarFilters>({ ...activeFilters });

  // Logic: Sorting
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  // Logic: Multi-Select
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length && filteredRequests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.request_id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Logic: Export
  const handleExportCSV = () => {
    if (filteredRequests.length === 0) return;
    const headers = ['ID', 'Requester', 'Department', 'Date', 'Window', 'Destination', 'Status', 'Action By'];
    const rows = filteredRequests.map(r => [
      r.request_id,
      r.requester_name,
      r.requester_department,
      r.delivery_date,
      r.time_window,
      `"${r.dropoff_location?.address?.replace(/"/g, '""') || 'N/A'}"`,
      getGroupedStatus(r.status, r.delivery_status).toUpperCase(),
      getCalendarExportActionBy(r)
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dispatch_manifest_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Manifest exported successfully.");
  };

  // Logic: Filtering & Sorting Core
  const filteredRequests = useMemo(() => {
    const filtered = (requests || []).filter(req => {
      if (req.status === 'submitted_waiting') return false;
      
      const matchesSearch = 
        (req.request_id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requester_name || "").toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const groupStatus = getGroupedStatus(req.status, req.delivery_status);
      if (!activeFilters.status.includes(groupStatus)) return false;
      if (activeFilters.rider !== 'all' && req.assigned_rider_id !== activeFilters.rider) return false;
      if (activeFilters.department !== 'all' && req.requester_department !== activeFilters.department) return false;
      if (!activeFilters.urgency.includes(req.urgency_level)) return false;

      return true;
    });

    if (!sortConfig) return filtered;

    return [...filtered].sort((a: any, b: any) => {
      const aVal = String(a[sortConfig.key] || "");
      const bVal = String(b[sortConfig.key] || "");
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [requests, searchQuery, activeFilters, sortConfig]);

  // Grouping for Calendar
  const requestsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filteredRequests.forEach(req => {
      try {
        const dayKey = format(parseISO(req.delivery_date), 'yyyy-MM-dd');
        if (!grouped[dayKey]) grouped[dayKey] = [];
        grouped[dayKey].push(req);
      } catch (e) {
        console.warn('Invalid date for request', req.request_id);
      }
    });
    return grouped;
  }, [filteredRequests]);

  // UI Handlers
  const applyFilters = () => setActiveFilters({ ...localFilters });
  const resetFilters = () => {
    const defaults: CalendarFilters = {
      status: ['pending', 'active', 'done', 'failed', 'declined'],
      rider: 'all',
      department: 'all',
      urgency: ['Low', 'Medium', 'High', 'Urgent'],
      dateRange: { start: null, end: null }
    };
    setLocalFilters(defaults);
    setActiveFilters(defaults);
    setSearchQuery('');
  };

  const handleApprove = async (riderId: string, remark: string) => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await approveRequest(selectedTask.request_id, riderId, remark);
      toast.success("Request approved.");
      setSelectedTask(null);
    } catch (err) {
      toast.error("Failed to approve.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async (remark: string) => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await cancelRequest(selectedTask.request_id, remark);
      toast.success("Request cancelled.");
      setSelectedTask(null);
    } catch (err) {
      toast.error("Failed to cancel.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Lifecycle
  useEffect(() => {
    const fetchRiders = async () => {
      try {
        const res = await fetch('/api/users', { credentials: 'include' });
        if (res.status === 401) { logout(); return; }
        if (res.ok) {
          const data = await res.json();
          const allUsers = Array.isArray(data) ? data : (data.data || []);
          setRiders(allUsers.filter((u: any) => u.role === 'rider'));
        }
      } catch (err) { console.error('Rider fetch error', err); }
    };
    fetchRiders();
  }, [logout]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  return (
    <div className="flex flex-col h-full bg-[#faf9f6] overflow-hidden font-sans">
      {/* Header - Refined Spacing and UX */}
      <div className="bg-white border-b border-black/[0.03] px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 shadow-sm z-30">
        <div className="flex items-center gap-5">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white shadow-lg shadow-slate-900/10 shrink-0">
            <CalendarIcon size={20} strokeWidth={2} />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl font-medium text-slate-900 tracking-tight leading-none font-serif">
              Operations Schedule
            </h1>
            <div className="flex items-center gap-4 mt-1.5">
               <StatusIndicator color="bg-emerald-500" label="Active" />
               <StatusIndicator color="bg-amber-500" label="Pending" />
               <StatusIndicator color="bg-slate-400" label="Done" />
               <StatusIndicator color="bg-rose-500" label="Failed" />
               <StatusIndicator color="bg-red-600" label="Declined" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 relative shrink-0">
            <motion.div 
              className="absolute bg-white rounded-lg shadow-sm z-0 h-[calc(100%-8px)]"
              initial={false}
              animate={{ x: displayMode === 'calendar' ? 0 : '100%', width: '50%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <button onClick={() => setDisplayMode('calendar')} className={cn("relative z-10 px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors", displayMode === 'calendar' ? "text-slate-900" : "text-slate-400 hover:text-slate-600")}>Calendar</button>
            <button onClick={() => setDisplayMode('list')} className={cn("relative z-10 px-5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-colors", displayMode === 'list' ? "text-slate-900" : "text-slate-400 hover:text-slate-600")}>List</button>
          </div>

          {/* Density Toggle (List only) - Clear Text Labels */}
          <AnimatePresence>
            {displayMode === 'list' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -10 }} 
                className="flex bg-slate-50 p-1 rounded-xl border border-slate-200 relative shrink-0"
              >
                <motion.div 
                  className="absolute bg-white rounded-lg shadow-sm z-0 h-[calc(100%-8px)]"
                  initial={false}
                  animate={{ x: density === 'comfortable' ? 0 : '100%', width: '50%' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
                <button onClick={() => setDensity('comfortable')} className={cn("relative z-10 px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors", density === 'comfortable' ? "text-slate-900" : "text-slate-400")}>Standard</button>
                <button onClick={() => setDensity('compact')} className={cn("relative z-10 px-4 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors", density === 'compact' ? "text-slate-900" : "text-slate-400")}>Compact</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative w-full sm:w-48 xl:w-64 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10 rounded-xl border-slate-200 bg-slate-50 text-[11px] focus:bg-white transition-all shadow-none" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={handleExportCSV} className="h-10 px-5 rounded-xl border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-600 gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95">
              <FileText size={14} /> Export
            </Button>
            <Button variant="outline" size="icon" onClick={refreshData} className="h-10 w-10 rounded-xl border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95">
              <RefreshCw className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <AnimatePresence mode="wait">
          {displayMode === 'calendar' ? (
            <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col bg-white">
                <div className="px-8 py-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="h-9 w-9 rounded-xl"><ChevronLeft size={16} /></Button>
                        <Button variant="outline" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="h-9 w-9 rounded-xl"><ChevronRight size={16} /></Button>
                        <Button variant="ghost" onClick={() => setCurrentDate(new Date())} className="h-9 px-4 text-[10px] font-bold uppercase tracking-widest">Today</Button>
                    </div>
                    <h2 className="text-lg font-medium font-serif">{format(currentDate, 'MMMM yyyy')}</h2>
                    <div className="w-40" />
                </div>
                
                <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                        <div key={day} className="py-3 text-center border-r border-slate-50 last:border-r-0">
                            <span className="text-[9px] font-bold text-slate-400 tracking-[0.2em]">{day}</span>
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-7 min-h-full">
                        {calendarDays.map((day) => {
                            const dayKey = format(day, 'yyyy-MM-dd');
                            const dayRequests = requestsByDay[dayKey] || [];
                            const isToday = isSameDay(day, new Date());
                            const isCurMonth = isSameMonth(day, currentDate);
                            return (
                                <div key={day.toString()} className={cn("min-h-[140px] border-r border-b border-slate-100 p-4 transition-colors", !isCurMonth && "opacity-30 bg-slate-50/10", isToday && "bg-slate-50/30")}>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={cn("text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg", isToday ? "bg-slate-900 text-white shadow-lg" : "text-slate-400")}>{format(day, 'd')}</span>
                                        {dayRequests.length > 0 && <button onClick={() => setSelectedDayTasks({ date: day, tasks: dayRequests })} className="text-[10px] font-semibold text-slate-400 uppercase hover:text-slate-900">{dayRequests.length} tasks</button>}
                                    </div>
                                    <div className="space-y-2">
                                        {dayRequests.slice(0, 3).map(req => (
                                            <CalendarTaskRow key={req.request_id} request={req} onClick={() => setSelectedTask(req)} />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex min-w-0">
                <IndustrialListView 
                  requests={filteredRequests} 
                  onSelect={setSelectedTask} 
                  sortConfig={sortConfig} 
                  onSort={handleSort} 
                  density={density} 
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onToggleAll={toggleSelectAll}
                  onExport={handleExportCSV}
                />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar Filters */}
        <aside className="w-[260px] bg-white border-l border-black/[0.03] flex flex-col shrink-0">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-xs font-bold uppercase tracking-widest">Filters</h3>
                <button onClick={resetFilters} className="text-[9px] font-bold uppercase text-slate-400">Reset</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</h4>
                    <div className="space-y-2">
                        {['active', 'pending', 'done', 'failed', 'declined'].map(s => (
                            <FilterCheckbox key={s} label={s} checked={localFilters.status.includes(s)} onChange={() => {
                                setLocalFilters(prev => ({
                                    ...prev,
                                    status: prev.status.includes(s) ? prev.status.filter(x => x !== s) : [...prev.status, s]
                                }));
                            }} />
                        ))}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-50">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</h4>
                    <Select 
                      value={localFilters.department} 
                      onValueChange={(val) => setLocalFilters(prev => ({ ...prev, department: val }))}
                    >
                        <SelectTrigger className="h-9 rounded-xl border-slate-100 text-[10px] font-bold uppercase tracking-widest">
                            <SelectValue placeholder="All Departments" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all" className="text-[10px]">All Departments</SelectItem>
                            {DEPARTMENTS.map(dept => (
                                <SelectItem key={dept} value={dept} className="text-[10px]">{dept}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="p-6 border-t border-slate-50 bg-slate-50/30">
                <Button onClick={applyFilters} className="w-full h-11 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-widest">Apply Filters</Button>
            </div>
        </aside>
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-6xl h-[92vh] rounded-2xl p-0 border-none shadow-2xl overflow-hidden bg-[#faf9f6]">
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
        <DialogContent className="max-w-xs rounded-2xl p-0 border-none shadow-2xl overflow-hidden bg-white">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-medium font-serif">Daily Log</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                  {selectedDayTasks && format(selectedDayTasks.date, 'MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="space-y-1 max-h-[45vh] overflow-y-auto custom-scrollbar pr-2">
              {selectedDayTasks?.tasks.map(req => (
                <CalendarTaskRow key={req.request_id} request={req} onClick={() => { setSelectedDayTasks(null); setTimeout(() => setSelectedTask(req), 150); }} />
              ))}
            </div>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button onClick={() => setSelectedDayTasks(null)} variant="ghost" className="h-9 px-6 font-bold text-[10px] uppercase tracking-widest">Dismiss</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// SUB-COMPONENTS
function CalendarTaskRow({ request, onClick }: { request: any, onClick: () => void }) {
  const group = getGroupedStatus(request.status, request.delivery_status);
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-100 text-left transition-all">
      <div className={cn("w-1 h-1 rounded-full", getStatusColor(group))}></div>
      <span className="text-[9px] font-mono text-slate-800 truncate">{request.on_behalf_of || request.requester_name}</span>
    </button>
  );
}

function FilterCheckbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: () => void }) {
  return (
    <div className="flex items-center space-x-2 group cursor-pointer" onClick={onChange}>
      <Checkbox checked={checked} onCheckedChange={onChange} className="h-3.5 w-3.5 rounded border-slate-200" />
      <label className={cn("text-[9px] font-semibold uppercase tracking-widest", checked ? "text-slate-900" : "text-slate-400")}>{label}</label>
    </div>
  );
}

function IndustrialListView({ 
  requests = [], onSelect, sortConfig, onSort, density, selectedIds, onToggleSelect, onToggleAll, onExport 
}: any) {
  const hasSelected = (id: string) => selectedIds instanceof Set && selectedIds.has(id);
  const selectedCount = selectedIds instanceof Set ? selectedIds.size : 0;
  const isAllSelected = requests.length > 0 && selectedCount === requests.length;

  return (
    <div className="flex-1 flex flex-col bg-white shadow-sm border-r border-black/[0.02] relative">
      <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
        <div className="space-y-4 pb-20">
          <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-slate-100 text-[10px] items-center text-slate-400 font-bold uppercase tracking-widest">
            <div className="col-span-1 flex items-center">
              <Checkbox checked={isAllSelected} onCheckedChange={onToggleAll} className="h-4 w-4 rounded border-slate-200 data-[state=checked]:bg-slate-900" />
            </div>
            <div className="col-span-2 cursor-pointer hover:text-slate-900" onClick={() => onSort('request_id')}>ID</div>
            <div className="col-span-3 cursor-pointer hover:text-slate-900" onClick={() => onSort('requester_name')}>Entity</div>
            <div className="col-span-2 cursor-pointer hover:text-slate-900" onClick={() => onSort('delivery_date')}>Date</div>
            <div className="col-span-2">Destination</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          
          <div className="space-y-1">
            {requests.map((req: any) => {
              const group = getGroupedStatus(req.status, req.delivery_status);
              return (
                <motion.div 
                  key={req.request_id} 
                  className={cn(
                    "grid grid-cols-12 gap-4 items-center px-4 rounded-xl border border-transparent transition-all", 
                    hasSelected(req.request_id) ? "bg-slate-50 border-slate-100" : "hover:bg-slate-50/50", 
                    density === 'compact' ? "py-1.5" : "py-3"
                  )}
                >
                  <div className="col-span-1 flex items-center">
                    <Checkbox checked={hasSelected(req.request_id)} onCheckedChange={() => onToggleSelect(req.request_id)} className="h-4 w-4 rounded border-slate-200 data-[state=checked]:bg-slate-900" />
                  </div>
                  <button onClick={() => onSelect(req)} className="col-span-11 grid grid-cols-11 gap-4 items-center text-left">
                    <div className="col-span-2 font-mono text-[10px] text-slate-500 truncate">{req.request_id.split('_')[1] || req.request_id}</div>
                    <div className="col-span-3 font-semibold text-xs truncate pl-1">{req.on_behalf_of || req.requester_name}</div>
                    <div className="col-span-2 font-mono text-[10px] truncate">{req.delivery_date}</div>
                    <div className="col-span-2 text-[10px] truncate pr-4 text-slate-500">{req.dropoff_location?.address}</div>
                    <div className="col-span-2 text-right">
                      <Badge variant="outline" className={cn(
                        "px-2.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-widest border-none shadow-none",
                        group === 'done' ? "bg-slate-100 text-slate-500" :
                        group === 'failed' ? "bg-rose-50 text-rose-600" :
                        group === 'active' ? "bg-emerald-50 text-emerald-600" :
                        group === 'declined' ? "bg-red-50 text-red-700" :
                        "bg-amber-50 text-amber-700"
                      )}>
                        {group}
                      </Badge>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl px-8 py-4 shadow-2xl flex items-center gap-8 z-50">
            <div className="font-mono text-sm font-bold bg-white/10 w-8 h-8 flex items-center justify-center rounded-lg border border-white/5">{selectedCount}</div>
            <div className="h-6 w-px bg-white/10" />
            <Button variant="ghost" onClick={onToggleAll} className="text-[10px] font-bold uppercase tracking-widest h-9 text-slate-400 hover:text-white hover:bg-white/5">Clear Selection</Button>
            <Button onClick={onExport} className="bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold uppercase tracking-widest h-9 gap-2 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"><FileText size={14} /> Export Manifest</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
