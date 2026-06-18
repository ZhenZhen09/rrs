import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
  ClipboardCheck, 
  User, 
  Clock, 
  AlertTriangle, 
  Calendar as CalendarIcon, 
  Search,
  RefreshCcw,
  UserX,
  Plane,
  CheckCircle2,
  ExternalLink,
  MoreVertical,
  ShieldAlert
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { ConflictResolutionModal } from '../../components/Admin/ConflictResolutionModal';
import { useRealTime } from '../../context/RealTimeContext';

interface AttendanceRecord {
  rider_id: string;
  rider_name: string;
  rider_email: string;
  status: 'present' | 'absent' | 'on_leave' | null;
  reason: string | null;
  check_in_time: string | null;
  off_duty_time?: string | null;
  created_at: string | null;
  active_task_count: number;
  handover_reason?: string | null;
  integrity_score: number;
}

export const AttendanceDashboard: React.FC = () => {
  const { socket } = useRealTime();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<{ id: string, name: string } | null>(null);

  const calculateDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;
    if (diffMs <= 0) return '0m';
    
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round((diffMs % 3600000) / 60000);
    
    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const fetchAttendance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/users/attendance/daily?date=${selectedDate}`, {
        credentials: 'include'
      });
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (e) {
      if (!silent) toast.error("Failed to load attendance records");
      setAttendance([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Real-time Sync Effect
  useEffect(() => {
    if (!socket) return;

    const handleInstantUpdate = () => {
      console.log('🔄 AttendanceDashboard: Real-time update detected, syncing...');
      fetchAttendance(true); // Silent refresh
    };

    socket.on('rider-status-updated', handleInstantUpdate);
    socket.on('notification-added', handleInstantUpdate);

    return () => {
      socket.off('rider-status-updated', handleInstantUpdate);
      socket.off('notification-added', handleInstantUpdate);
    };
  }, [socket, fetchAttendance]);

  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    onLeave: attendance.filter(a => a.status === 'on_leave').length,
    noReport: attendance.filter(a => !a.status).length,
  };

  const filteredAttendance = attendance.filter(a => 
    a.rider_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.rider_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const clearAbsence = async (riderId: string) => {
    if (!window.confirm("Are you sure you want to clear this absence? The rider will be able to start their shift again.")) return;
    
    try {
      const res = await fetch(`/api/users/attendance/${riderId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Absence cleared successfully");
        fetchAttendance();
      }
    } catch (e) {
      toast.error("Failed to clear absence");
    }
  };

  const openConflictModal = (riderId: string, riderName: string) => {
    setSelectedRider({ id: riderId, name: riderName });
    setIsConflictModalOpen(true);
  };

  const getStatusBadge = (status: AttendanceRecord['status'], riderId: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[9px] px-2 py-0.5">PRESENT</Badge>;
      case 'absent':
        return (
          <div className="flex flex-col gap-2 items-start">
            <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-black text-[9px] px-2 py-0.5">ABSENT</Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => clearAbsence(riderId)}
              className="h-6 rounded-md bg-slate-900 text-white hover:bg-black font-black text-[7px] uppercase tracking-widest px-2"
            >
              Clear Absence
            </Button>
          </div>
        );
      case 'on_leave':
        return (
          <div className="flex flex-col gap-2 items-start">
            <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[9px] px-2 py-0.5">ON LEAVE</Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => clearAbsence(riderId)}
              className="h-6 rounded-md bg-slate-900 text-white hover:bg-black font-black text-[7px] uppercase tracking-widest px-2"
            >
              Clear Absence
            </Button>
          </div>
        );
      default:
        return <Badge className="bg-slate-50 text-slate-400 border-slate-100 font-black text-[9px] px-2 py-0.5">NO REPORT</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              Rider Attendance
            </h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 ml-11">
              Daily shift records & absence management
            </p>
          </div>

          <div className="flex items-center gap-3 ml-11 md:ml-0">
            <div className="relative group">
               <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
               />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchAttendance}
              className="rounded-xl border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          {[
            { label: 'TOTAL RIDERS', value: stats.total, icon: User, color: 'text-slate-600', bg: 'bg-slate-50' },
            { label: 'PRESENT', value: stats.present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'ABSENT', value: stats.absent, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'ON LEAVE', value: stats.onLeave, icon: Plane, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'PENDING', value: stats.noReport, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-100/50' },
          ].map((stat, i) => (
            <div key={i} className={cn("p-4 rounded-2xl border border-slate-100 shadow-sm", stat.bg)}>
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={cn("h-4 w-4", stat.color)} />
                <span className={cn("text-xs font-black", stat.color)}>{stat.label}</span>
              </div>
              <p className="text-2xl font-[900] text-slate-900 tracking-tighter">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8 overflow-hidden flex flex-col">
        <Card className="flex-1 rounded-[2rem] border-none shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
               <input 
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border-none rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
               />
            </div>
          </div>

          {/* Records Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rider Information</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Discipline</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Start</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift End</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active Tasks</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                       <ClipboardCheck className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No attendance records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((record) => {
                    // Logic: A conflict exists if:
                    // 1. Rider is explicitly Absent or On Leave but has tasks.
                    // 2. Rider is Present but has logged OFF (off_duty_time exists) while still having tasks.
                    const isOffDuty = !!record.off_duty_time;
                    const hasUnfinishedWork = record.active_task_count > 0;
                    const isAbsentOrLeave = record.status === 'absent' || record.status === 'on_leave';
                    
                    const hasConflict = hasUnfinishedWork && (isAbsentOrLeave || isOffDuty);
                    
                    return (
                      <tr 
                        key={record.rider_id} 
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors group",
                          hasConflict && "bg-rose-50/40 hover:bg-rose-50/60"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 font-black text-xs shadow-sm",
                              hasConflict ? "bg-rose-100 text-rose-600" : "bg-slate-100"
                            )}>
                              {record.rider_name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 leading-none flex items-center gap-2">
                                {record.rider_name}
                                {hasConflict && <ShieldAlert size={12} className="text-rose-500 animate-pulse" />}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">{record.rider_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(record.status, record.rider_id)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={cn(
                            "text-[8px] font-black uppercase h-5 px-2 border-none",
                            record.integrity_score > 80 ? "bg-emerald-50 text-emerald-600" :
                            record.integrity_score > 50 ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"
                          )}>
                            {record.integrity_score}% 
                            <span className="ml-1 text-[7px] opacity-70">
                              {record.integrity_score > 80 ? 'EXEMPLARY' : record.integrity_score > 50 ? 'WATCHLIST' : 'CRITICAL'}
                            </span>
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={12} className="text-slate-300" />
                            <span className="text-xs font-bold tracking-tight">
                              {record.check_in_time ? format(new Date(record.check_in_time), 'h:mm a') : '--:--'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={12} className="text-slate-300" />
                            <span className="text-xs font-bold tracking-tight">
                              {record.off_duty_time ? format(new Date(record.off_duty_time), 'h:mm a') : '--:--'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full border tabular-nums",
                            record.off_duty_time ? "bg-slate-50 text-slate-600 border-slate-100" : "text-slate-300 border-transparent"
                          )}>
                            {calculateDuration(record.check_in_time, record.off_duty_time) || '--'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black",
                              record.active_task_count > 0 
                                ? (hasConflict ? "bg-rose-500 text-white shadow-lg shadow-rose-200" : "bg-amber-100 text-amber-700") 
                                : "bg-slate-100 text-slate-400"
                            )}>
                              {record.active_task_count}
                            </span>
                            {hasConflict && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => openConflictModal(record.rider_id, record.rider_name)}
                                className="h-6 px-2 rounded-md bg-rose-500 text-white hover:bg-rose-600 font-black text-[7px] uppercase tracking-widest animate-in fade-in zoom-in duration-300"
                              >
                                Resolve Conflicts
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {record.reason && (
                               <p className="text-[10px] font-medium text-slate-500 italic">
                                 <span className="font-black text-slate-400 not-italic mr-1">MORNING:</span>
                                 {record.reason}
                               </p>
                            )}
                            {record.handover_reason && (
                               <p className="text-[10px] font-medium text-rose-600 italic bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50">
                                 <span className="font-black not-italic mr-1">HANDOVER:</span>
                                 {record.handover_reason}
                               </p>
                            )}
                            {!record.reason && !record.handover_reason && (
                               <p className="text-[10px] font-medium text-slate-300 italic">No logs reported</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {selectedRider && (
        <ConflictResolutionModal
          isOpen={isConflictModalOpen}
          onClose={() => {
            setIsConflictModalOpen(false);
            setSelectedRider(null);
          }}
          riderId={selectedRider.id}
          riderName={selectedRider.name}
          date={selectedDate}
          onSuccess={fetchAttendance}
        />
      )}
    </div>
  );
};
