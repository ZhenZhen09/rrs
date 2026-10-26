import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
  ClipboardCheck, 
  User, 
  Clock, 
  Calendar as CalendarIcon, 
  Search,
  RefreshCcw,
  X,
  UserX,
  Plane,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../../components/ui/utils';
import { toast } from 'sonner';
import { ConflictResolutionModal } from '../../components/Admin/ConflictResolutionModal';
import { useRealTime } from '../../context/RealTimeContext';

const getPhilippineDateString = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

const parsePhilippineDateTime = (value: string | null) => {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withOffset = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized) ? normalized : `${normalized}+08:00`;
  const date = new Date(withOffset);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatPhilippineTime = (value: string | null) => {
  const date = parsePhilippineDateTime(value);
  if (!date) return '--:--';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

interface AttendanceRecord {
  rider_id: string;
  rider_name: string;
  rider_email: string;
  is_on_duty: boolean;
  status: 'present' | 'absent' | 'on_leave' | null;
  reason: string | null;
  check_in_time: string | null;
  absence_source?: 'manual' | 'automatic_no_show' | null;
  auto_absent_at?: string | null;
  late_checkin_approved_by?: string | null;
  late_checkin_approved_by_name?: string | null;
  late_checkin_approved_at?: string | null;
  off_duty_time?: string | null;
  created_at: string | null;
  active_task_count: number;
  handover_reason?: string | null;
  integrity_score: number;
  sessions?: Array<{ id: string; start_time: string; end_time: string | null; session_state: 'open' | 'closed' | 'legacy_unknown'; end_source?: 'manual' | 'scheduled' | 'legacy'; duration_minutes: number | null; handover_reason: string | null; active_task_count_at_end: number | null }>;
  total_worked_minutes?: number;
}

export const AttendanceDashboard: React.FC = () => {
  const { socket } = useRealTime();
  const [selectedDate, setSelectedDate] = useState(getPhilippineDateString);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const attendanceRequestId = useRef(0);
  const hasManuallySelectedDate = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchToggleRef = useRef<HTMLButtonElement>(null);

  // Conflict Modal State
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<{ id: string, name: string } | null>(null);

  const calculateDuration = (start: string | null, end: string | null | undefined) => {
    if (!start || !end) return null;
    const startDate = parsePhilippineDateTime(start);
    const endDate = parsePhilippineDateTime(end);
    if (!startDate || !endDate) return null;
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    const diffMs = endTime - startTime;
    if (diffMs <= 0) return '0m';
    
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round((diffMs % 3600000) / 60000);
    
    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const fetchAttendance = useCallback(async (silent = false) => {
    const requestId = ++attendanceRequestId.current;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/users/attendance/daily?date=${selectedDate}`, {
        credentials: 'include'
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Attendance request failed (${res.status})`);
      if (!Array.isArray(data)) throw new Error('Attendance service returned an invalid response');
      if (requestId !== attendanceRequestId.current) return;
      setAttendance(data);
      setAttendanceError(null);
    } catch (error) {
      if (requestId !== attendanceRequestId.current) return;
      const message = error instanceof Error ? error.message : 'Unable to reach attendance service';
      setAttendanceError(message);
      if (!silent) toast.error(`Failed to load attendance records: ${message}`);
      if (!silent) setAttendance([]);
    } finally {
      if (requestId === attendanceRequestId.current && !silent) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (mobileSearchOpen) mobileSearchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  useEffect(() => { void fetchAttendance(); }, [fetchAttendance]);

  useEffect(() => {
    const syncDefaultDate = () => {
      if (hasManuallySelectedDate.current) return;
      const today = getPhilippineDateString();
      setSelectedDate((currentDate) => currentDate === today ? currentDate : today);
    };
    const interval = window.setInterval(syncDefaultDate, 60_000);
    document.addEventListener('visibilitychange', syncDefaultDate);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', syncDefaultDate);
    };
  }, []);

  // Real-time Sync Effect
  useEffect(() => {
    if (!socket) return;

    const handleInstantUpdate = (event?: { type?: string; riderName?: string; is_on_duty?: boolean }) => {
      console.log('🔄 AttendanceDashboard: Real-time update detected, syncing...');
      if (event?.type === 'duty' && typeof event.is_on_duty === 'boolean') {
        const riderName = event.riderName || 'Rider';
        toast.info(`${riderName} is now ${event.is_on_duty ? 'On duty' : 'Off duty'}`);
      }
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

  const formatShiftStart = (record: AttendanceRecord) => {
    const startTime = record.sessions?.[0]?.start_time || (record.status === 'present' ? record.check_in_time : null);
    return startTime ? formatPhilippineTime(startTime) : 'No shift recorded';
  };

  const formatShiftEnd = (record: AttendanceRecord) => {
    const lastSession = record.sessions?.[record.sessions.length - 1];
    if (lastSession?.end_time) return formatPhilippineTime(lastSession.end_time);
    if (lastSession?.session_state === 'open') return 'In progress';
    if (lastSession?.session_state === 'legacy_unknown') return 'End time unknown';
    if (record.status === 'present' && record.off_duty_time) return formatPhilippineTime(record.off_duty_time);
    if (record.status === 'present' && record.check_in_time) return 'In progress';
    return 'No shift recorded';
  };

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

  const getStatusBadge = (record: AttendanceRecord) => {
    switch (record.status) {
      case 'present':
        return (
          <div className="flex flex-col gap-2 items-start">
            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black text-[9px] px-2 py-0.5">{record.absence_source === 'automatic_no_show' ? 'PRESENT · LATE' : 'PRESENT'}</Badge>
            {record.absence_source === 'automatic_no_show' && record.late_checkin_approved_at && (
              <span className="text-[9px] font-semibold text-sky-700">
                Approved by {record.late_checkin_approved_by_name || record.late_checkin_approved_by || 'Admin'} at {formatPhilippineTime(record.late_checkin_approved_at)}
              </span>
            )}
          </div>
        );
      case 'absent':
        return (
          <div className="flex flex-col gap-2 items-start">
            <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-black text-[9px] px-2 py-0.5">
              {record.absence_source === 'automatic_no_show' ? 'ABSENT · AUTO NO-SHOW' : 'ABSENT'}
            </Badge>
            {record.absence_source === 'automatic_no_show' && record.late_checkin_approved_at && (
              <span className="text-[9px] font-semibold text-sky-700">
                Late check-in approved by {record.late_checkin_approved_by_name || record.late_checkin_approved_by || 'Admin'} at {formatPhilippineTime(record.late_checkin_approved_at)}
              </span>
            )}
            {record.absence_source !== 'automatic_no_show' || selectedDate === getPhilippineDateString() ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAbsence(record.rider_id)}
                className="h-6 rounded-md bg-slate-900 px-2 text-[7px] font-black uppercase tracking-widest text-white hover:bg-black"
              >
                Clear Absence
              </Button>
            ) : null}
          </div>
        );
      case 'on_leave':
        return (
          <div className="flex flex-col gap-2 items-start">
            <Badge className="bg-amber-50 text-amber-600 border-amber-100 font-black text-[9px] px-2 py-0.5">ON LEAVE</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => clearAbsence(record.rider_id)}
              className="h-6 rounded-md bg-slate-900 px-2 text-[7px] font-black uppercase tracking-widest text-white hover:bg-black"
            >
              Clear Absence
            </Button>
          </div>
        );
      default:
        return <Badge className="bg-slate-50 text-slate-400 border-slate-100 font-black text-[9px] px-2 py-0.5">NO REPORT</Badge>;
    }
  };

  const getDutyBadge = (isOnDuty: boolean) => (
    <Badge className={cn(
      'border font-black text-[9px] px-2 py-0.5',
      isOnDuty ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-200'
    )}>
      {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
    </Badge>
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50/50">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sm:px-8 sm:py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-[900] text-slate-900 tracking-tight flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-primary/10 rounded-xl">
                <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              Rider Attendance
            </h1>
            <p className="text-slate-500 text-[11px] md:text-xs font-bold uppercase tracking-wide md:tracking-widest mt-1 ml-9 md:ml-11">
              Daily shift records & absence management
            </p>
          </div>

          <div className="flex items-center gap-2 md:gap-3 ml-9 md:ml-0">
            <div className="relative group">
               <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
               <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => {
                  hasManuallySelectedDate.current = true;
                  setLoading(true);
                  setSelectedDate(e.target.value);
                }}
                className="h-11 pl-10 pr-3 md:pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs md:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
               />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => void fetchAttendance()}
              className="rounded-xl border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
            >
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {attendanceError && (
          <div role="alert" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
            <span>Could not load attendance for {selectedDate}: {attendanceError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void fetchAttendance()} className="shrink-0 border-rose-200 text-rose-800">Retry</Button>
          </div>
        )}

        {/* Stats Grid */}
        <div aria-label="Attendance summary" role="group" className="grid grid-cols-5 gap-1 mt-3 sm:mt-8 sm:gap-4">
          {[
            { label: 'TOTAL RIDERS', mobileLabel: 'Riders', value: stats.total, icon: User, color: 'text-slate-600', bg: 'bg-slate-50' },
            { label: 'PRESENT', mobileLabel: 'Present', value: stats.present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'ABSENT', mobileLabel: 'Absent', value: stats.absent, icon: UserX, color: 'text-rose-600', bg: 'bg-rose-50' },
            { label: 'ON LEAVE', mobileLabel: 'Leave', value: stats.onLeave, icon: Plane, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'PENDING', mobileLabel: 'Pending', value: stats.noReport, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-100/50' },
          ].map((stat) => (
            <div
              key={stat.label}
              data-attendance-stat
              className={cn(
                "col-span-1 min-w-0 rounded-xl border border-slate-100 shadow-sm md:rounded-2xl",
                stat.bg,
              )}
            >
              <div className="flex min-h-[5rem] flex-col items-center justify-center gap-1 p-1 md:block md:min-h-0 md:p-4">
                <div className="flex min-w-0 flex-col items-center gap-0.5 md:mb-2 md:flex-row md:justify-between">
                  <stat.icon className={cn("h-4 w-4 shrink-0", stat.color)} aria-hidden="true" />
                  <span className={cn("max-w-full truncate text-[10px] font-black md:hidden", stat.color)}>{stat.mobileLabel}</span>
                  <span className={cn("hidden text-xs font-black md:inline", stat.color)}>{stat.label}</span>
                </div>
                <p className="text-sm font-[900] leading-none tracking-tighter text-slate-900 md:text-2xl">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 p-3 sm:p-8 overflow-hidden flex flex-col">
        <Card role="region" aria-label="Attendance records" className="flex-1 rounded-2xl md:rounded-[2rem] border border-slate-200 shadow-lg shadow-slate-300/50 flex flex-col overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-3 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900">Attendance records</h2>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black tabular-nums text-slate-600">{filteredAttendance.length}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  data-mobile-search-toggle
                  aria-label={mobileSearchOpen ? 'Close attendance search' : 'Search attendance records'}
                  aria-expanded={mobileSearchOpen}
                  aria-controls="mobile-attendance-search"
                  ref={mobileSearchToggleRef}
                  onClick={() => setMobileSearchOpen(open => !open)}
                  className="h-11 w-11 shrink-0 rounded-xl border-slate-200 text-slate-600 md:hidden"
                >
                  {mobileSearchOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            </div>
            <div className="relative hidden flex-1 max-w-md group md:block">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
               <input 
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border-none rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
               />
            </div>
            {mobileSearchOpen && (
              <div className="relative animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none md:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
                <input
                  ref={mobileSearchInputRef}
                  id="mobile-attendance-search"
                  aria-label="Search attendance records"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Escape') {
                      setMobileSearchOpen(false);
                      mobileSearchToggleRef.current?.focus();
                    }
                  }}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-base font-semibold text-slate-700 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>

          {/* Mobile record cards: one page-level vertical scroll, no nested wide table. */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 md:hidden">
            {loading ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="h-36 rounded-2xl bg-slate-50 animate-pulse" />
              ))
            ) : attendanceError ? (
              <div className="py-16 text-center">
                <ShieldAlert className="h-10 w-10 text-rose-200 mx-auto mb-3" />
                <p className="text-rose-600 font-bold uppercase tracking-widest text-[10px]">Attendance unavailable</p>
              </div>
            ) : filteredAttendance.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardCheck className="h-10 w-10 text-slate-100 mx-auto mb-3" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No attendance records found</p>
              </div>
            ) : (
              filteredAttendance.map((record) => {
                const isOffDuty = !!record.off_duty_time;
                const hasUnfinishedWork = record.active_task_count > 0;
                const isAbsentOrLeave = record.status === 'absent' || record.status === 'on_leave';
                const hasConflict = hasUnfinishedWork && (isAbsentOrLeave || isOffDuty);

                return (
                  <Card
                    key={record.rider_id}
                    className={cn(
                      "rounded-2xl border-slate-100 p-3 shadow-sm",
                      hasConflict && "border-rose-200 bg-rose-50/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm",
                          hasConflict ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
                        )}>
                          {record.rider_name.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-xs font-black text-slate-900">
                            {record.rider_name}
                            {hasConflict && <ShieldAlert size={12} className="shrink-0 text-rose-500 animate-pulse" />}
                          </p>
                          <p className="truncate text-[9px] font-bold text-slate-400">{record.rider_email}</p>
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(record)}</div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50/80 p-2.5">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Duty status</p>
                        <div className="mt-1">{getDutyBadge(record.is_on_duty)}</div>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Shift start</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-700">{formatShiftStart(record)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Shift end</p>
                        <p className="mt-1 text-[10px] font-bold text-slate-700">{formatShiftEnd(record)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Duration</p>
                        <p className="mt-1 text-[10px] font-black tabular-nums text-slate-700">{record.sessions?.length ? `${Math.floor((record.total_worked_minutes || 0) / 60)}h ${(record.total_worked_minutes || 0) % 60}m` : (calculateDuration(record.check_in_time, record.off_duty_time) || '--')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Integrity</p>
                        <p className={cn(
                          "mt-1 text-[10px] font-black",
                          record.integrity_score > 80 ? "text-emerald-600" : record.integrity_score > 50 ? "text-amber-600" : "text-rose-600"
                        )}>{record.integrity_score}%</p>
                      </div>
                    </div>

                    {record.sessions && record.sessions.length > 0 && (
                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-wide text-slate-500">
                          <span>Shift sessions ({record.sessions.length})</span>
                          <span>Total {Math.floor((record.total_worked_minutes || 0) / 60)}h {(record.total_worked_minutes || 0) % 60}m</span>
                        </div>
                        {record.sessions.map((session) => (
                          <div key={session.id} className="rounded-lg bg-slate-50 px-2 py-1 text-[9px] text-slate-600">
                            {formatPhilippineTime(session.start_time)} – {session.end_time ? formatPhilippineTime(session.end_time) : session.session_state === 'legacy_unknown' ? 'End time unknown' : 'In progress'}
                            <span className="ml-2 font-bold">{session.session_state === 'closed' && session.end_time ? `${Math.floor((session.duration_minutes || 0) / 60)}h ${(session.duration_minutes || 0) % 60}m` : session.session_state === 'legacy_unknown' ? 'End time unknown' : 'In progress'}</span>
                            {session.end_source === 'scheduled' ? <p className="text-amber-700">Automatically ended · {session.active_task_count_at_end || 0} tasks need review</p> : session.handover_reason && <p className="text-rose-600">Handover: {session.handover_reason} ({session.active_task_count_at_end} tasks)</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Active tasks</span>
                        <span className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black",
                          record.active_task_count > 0
                            ? (hasConflict ? "bg-rose-500 text-white" : "bg-amber-100 text-amber-700")
                            : "bg-slate-100 text-slate-400"
                        )}>{record.active_task_count}</span>
                      </div>
                      {hasConflict && (
                        <Button
                          size="sm"
                          onClick={() => openConflictModal(record.rider_id, record.rider_name)}
                          className="h-7 rounded-lg bg-rose-500 px-2 text-[7px] font-black uppercase tracking-widest text-white hover:bg-rose-600"
                        >
                          Resolve conflict
                        </Button>
                      )}
                    </div>

                    {(record.reason || record.handover_reason || (record.off_duty_time && record.active_task_count > 0)) && (
                      <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                        {record.reason && <p className="text-[9px] font-medium italic text-slate-500"><span className="font-black not-italic text-slate-400">MORNING:</span> {record.reason}</p>}
                        {(record.handover_reason || (record.off_duty_time && record.active_task_count > 0)) && <p className="rounded border border-rose-100 bg-rose-50 px-1.5 py-0.5 text-[9px] font-medium italic text-rose-600"><span className="font-black not-italic">HANDOVER:</span> {record.handover_reason || 'No reason recorded'}: {record.active_task_count} tasks remain assigned</p>}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* Desktop/tablet records table */}
          <div className="hidden flex-1 overflow-auto md:block">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-50">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rider Information</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duty status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Discipline</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Start</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift End</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Active Tasks</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attendanceError ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
                      <ShieldAlert className="h-12 w-12 text-rose-100 mx-auto mb-4" />
                      <p className="text-rose-600 font-bold uppercase tracking-widest text-[10px]">Attendance unavailable</p>
                    </td>
                  </tr>
                ) : filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center">
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
                          {getStatusBadge(record)}
                        </td>
                        <td className="px-6 py-4">
                          {getDutyBadge(record.is_on_duty)}
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
                              {formatShiftStart(record)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Clock size={12} className="text-slate-300" />
                            <span className="text-xs font-bold tracking-tight">
                              {formatShiftEnd(record)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-full border tabular-nums",
                            record.off_duty_time ? "bg-slate-50 text-slate-600 border-slate-100" : "text-slate-300 border-transparent"
                          )}>
                            {record.sessions?.length ? `${Math.floor((record.total_worked_minutes || 0) / 60)}h ${(record.total_worked_minutes || 0) % 60}m total` : (calculateDuration(record.check_in_time, record.off_duty_time) || '--')}
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
                            {record.sessions?.map((session) => (
                              <p key={session.id} className="text-[9px] text-slate-500">
                                {formatPhilippineTime(session.start_time)}–{session.end_time ? formatPhilippineTime(session.end_time) : session.session_state === 'legacy_unknown' ? 'End time unknown' : 'In progress'}
                                {session.end_source === 'scheduled' ? <span className="ml-1 text-amber-700">Automatically ended · {session.active_task_count_at_end || 0} tasks need review</span> : session.handover_reason && <span className="ml-1 text-rose-600">Handover: {session.handover_reason} ({session.active_task_count_at_end} tasks)</span>}
                              </p>
                            ))}
                            {record.reason && (
                               <p className="text-[10px] font-medium text-slate-500 italic">
                                 <span className="font-black text-slate-400 not-italic mr-1">MORNING:</span>
                                 {record.reason}
                               </p>
                            )}
                            {(record.handover_reason || (record.off_duty_time && record.active_task_count > 0)) && (
                                <p className="text-[10px] font-medium text-rose-600 italic bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50">
                                  <span className="font-black not-italic mr-1">HANDOVER:</span>
                                  {record.handover_reason || 'No reason recorded'}: {record.active_task_count} tasks remain assigned
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
