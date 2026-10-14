import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import { useData } from '../../context/DataContext';
import { getWeeklyResolutionDetails, getWeeklyResolverLabel, getWeeklyScheduleDetailLabels, getWeeklyStartedAt } from '../../utils/weeklySchedule';
import { buildWeeklyRiderReport, getWeeklyReportSummary, getWeeklyTaskOutcome } from '../../utils/weeklyRiderReport';
import { ACCOUNTING_BUCKETS, ACCOUNTING_LABELS, AccountingBucket, buildRequestAccounting, getAccountingBucket } from '../../utils/requestAccounting';
import { RequestReconciliation } from '../../components/Admin/RequestReconciliation';

import { OperationalIntegrityView } from '../../components/Admin/OperationalIntegrityView';

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Calendar,
  Filter,
  Download,
  MapPin,
  FileText,
  Bike,
  ClipboardList,
  AlertTriangle,
  FileBarChart,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Wifi as WifiIcon,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

const PHILIPPINE_TIME_ZONE = 'Asia/Manila';
const initialPhilippineMonthYear = new Intl.DateTimeFormat('en-CA', {
  timeZone: PHILIPPINE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
}).format(new Date());

const getPhilippineDateParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PHILIPPINE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
  }, {});
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
};

const getPhilippineWeekStart = (date = new Date()) => {
  const { year, month, day } = getPhilippineDateParts(date);
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - mondayOffset);
  return utcDate.toISOString().slice(0, 10);
};

const shiftIsoDate = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const formatWeekDay = (value: string) => new Intl.DateTimeFormat('en-US', {
  timeZone: PHILIPPINE_TIME_ZONE,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
}).format(new Date(`${value}T00:00:00+08:00`));

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#ef4444', '#14b8a6'];

const SortableHeader = ({ title, sortKey, className, sortConfig, onSort }: { title: string, sortKey: string, className?: string, sortConfig: { key: string, direction: 'asc' | 'desc' } | null, onSort: (key: string) => void }) => (
    <th
      className={cn("p-3 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors group select-none", className)}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1.5">
        {title}
        <div className="flex flex-col opacity-30 group-hover:opacity-100 transition-opacity">
          <ChevronUp size={10} className={cn("-mb-1.5", sortConfig?.key === sortKey && sortConfig.direction === 'asc' && "text-blue-500 opacity-100")} />
          <ChevronDown size={10} className={cn(sortConfig?.key === sortKey && sortConfig.direction === 'desc' && "text-blue-500 opacity-100")} />
        </div>
      </div>
    </th>
  );

  const CustomPendingTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),_0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-slate-100/50 max-w-[260px]">
          <div className="text-[12px] font-black uppercase text-slate-800 mb-1 flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2 mr-6">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: data.color }}></span>
              <span className="truncate">{data.name}</span>
            </div>
            <span className="text-slate-500 text-sm">{data.value}</span>
          </div>
          {data.requesters.length > 0 ? (
            <div className="flex flex-col gap-1.5 mt-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Requesters:</span>
              <div className="flex flex-wrap gap-1.5">
                {data.requesters.slice(0, 6).map((r: string, i: number) => (
                  <span key={i} className="text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded truncate max-w-full">{r}</span>
                ))}
                {data.requesters.length > 6 && (
                  <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">+{data.requesters.length - 6} more</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 block">No Requesters</span>
          )}
        </div>
      );
    }
    return null;
  };


export function AnalyticsHub() {
  const { fetchWithAuth } = useData();
  const [monthYear, setMonthYear] = useState(initialPhilippineMonthYear);
  const [mainScope, setMainScope] = useState<'month' | 'all'>('month');
  const mainScopeKey = mainScope === 'all' ? 'all' : monthYear;
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([]);
  const [weeklyStart, setWeeklyStart] = useState(getPhilippineWeekStart);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'completed' | 'overdue' | 'open'>('all');
  const [weeklyLoad, setWeeklyLoad] = useState<{
    weekStart: string; requests: any[]; loading: boolean; error: string | null;
  }>({ weekStart: '', requests: [], loading: true, error: null });
  const [weeklyRetry, setWeeklyRetry] = useState(0);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [diagnosticsRetry, setDiagnosticsRetry] = useState(0);
  const [diagnosticsLoad, setDiagnosticsLoad] = useState({ loading: false, error: '' });
  const [connectivityFilters, setConnectivityFilters] = useState({
    riderId: 'all',
    eventType: 'all',
    risk: 'all',
  });
  const [summaryStats, setSummaryStats] = useState<any>({ 
    counts: { total: 0, completed: 0, in_transit: 0, pending: 0, failed: 0 }, 
    avgTime: 0,
    onTimeRate: null,
    utilization: null
  });
  const [deptData, setDeptData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [failureReasonsData, setFailureReasonsData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [ledgerBucket, setLedgerBucket] = useState<AccountingBucket | 'all'>('all');
  const [mainLoad, setMainLoad] = useState({ monthYear: '', loading: true, error: '' });
  const [mainRetry, setMainRetry] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [integrityData, setIntegrityData] = useState<any>(null);
  const [connectivityData, setConnectivityData] = useState<any>({
    summary: {},
    logs: [],
    riderReport: [],
  });

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    const fetchAnalytics = async () => {
      const requestNumber = ++latestRequest;
      try {
        const my = monthYear;
        setMainLoad({ monthYear: mainScopeKey, loading: true, error: '' });
        const [summaryRes, trendRes] = await Promise.all([
          fetchWithAuth(`/api/analytics/summary-stats?${mainScope === 'all' ? 'scope=all' : `monthYear=${my}`}`),
          fetchWithAuth(`/api/analytics/monthly-trend?monthYear=${my}`),
        ]);
        if (!summaryRes?.ok || !trendRes?.ok) throw new Error('Analytics request failed');
        const [snapshot, trend] = await Promise.all([summaryRes.json(), trendRes.json()]);
        if (!Array.isArray(snapshot?.requests) || !Array.isArray(trend)) throw new Error('Invalid analytics snapshot');
        const records = snapshot.requests;
        if (new Set(records.map((row: any) => row.request_id)).size !== records.length) throw new Error('Duplicate ledger records');
        const counts = buildRequestAccounting(records);
        if (Number(snapshot.counts?.total) !== counts.total ||
            ACCOUNTING_BUCKETS.some(bucket => Number(snapshot.counts?.[bucket]) !== counts[bucket])) {
          throw new Error('Counters do not reconcile with the ledger');
        }
        if (!active || requestNumber !== latestRequest) return;
        setTableData(records);
        setSummaryStats({ ...snapshot, counts });
        const breakdown = (field: string, fallback: string) => {
          const grouped = new Map<string, number>();
          records.forEach((row: any) => {
            const key = String(row[field] || '').trim() || fallback;
            grouped.set(key, (grouped.get(key) || 0) + 1);
          });
          return Array.from(grouped, ([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
        };
        setDeptData(breakdown('requester_department', 'Unspecified department'));
        setCategoryData(breakdown('request_type', 'Unspecified type'));
        const failures = new Map<string, number>();
        records.filter((row: any) => getAccountingBucket(row) === 'failed').forEach((row: any) => {
          const reason = String(row.rider_remark || '').replace(/\[Admin update by.*?\]\s*/, '').trim() || 'No reason provided';
          failures.set(reason, (failures.get(reason) || 0) + 1);
        });
        setFailureReasonsData(Array.from(failures, ([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count));
        const points = new Map<string, { lat: number; lng: number; weight: number }>();
        records.forEach((row: any) => {
          if (row.dropoff_lat == null || row.dropoff_lng == null || row.dropoff_lat === '' || row.dropoff_lng === '') return;
          const lat = Number(row.dropoff_lat), lng = Number(row.dropoff_lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
          const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
          const point = points.get(key) || { lat, lng, weight: 0 };
          point.weight++;
          points.set(key, point);
        });
        setHotspots(Array.from(points.values()));
        // Other months are historical context; the selected month must match this ledger snapshot.
        const selectedMonthCounts = mainScope === 'all' ? buildRequestAccounting(records.filter((row: any) => String(row.created_at || '').slice(0, 7) === my)) : counts;
        setMonthlyTrendData([...trend.filter((row: any) => row.month_key !== my), {
          month_key: my,
          month: new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(`${my}-01T00:00:00Z`)),
          total_tasks: selectedMonthCounts.total, completed: selectedMonthCounts.completed,
        }].sort((a, b) => String(a.month_key).localeCompare(String(b.month_key))));
        setMainLoad({ monthYear: mainScopeKey, loading: false, error: '' });
      } catch (error) {
        if (active && requestNumber === latestRequest) {
          setMainLoad({ monthYear: mainScopeKey, loading: false, error: 'Unable to reconcile Main Stats. Please retry.' });
        }
        console.error("Failed to load analytics data", error);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 300000);
    return () => { active = false; clearInterval(interval); };
  }, [monthYear, mainScope, mainScopeKey, fetchWithAuth, mainRetry]);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    const loadWeek = async () => {
      const requestNumber = ++latestRequest;
      setWeeklyLoad({ weekStart: weeklyStart, requests: [], loading: true, error: null });
      try {
        const response = await fetchWithAuth(`/api/analytics/weekly-schedule?weekStart=${weeklyStart}`);
        if (!response?.ok) throw new Error('Weekly schedule request failed');
        const payload = await response.json();
        if (!Array.isArray(payload?.requests)) throw new Error('Invalid weekly schedule response');
        if (active && requestNumber === latestRequest) {
          setWeeklyLoad({ weekStart: weeklyStart, requests: payload.requests, loading: false, error: null });
        }
      } catch {
        if (active && requestNumber === latestRequest) {
          setWeeklyLoad({ weekStart: weeklyStart, requests: [], loading: false,
            error: 'Unable to load weekly schedule. Please try again.' });
        }
      }
    };
    void loadWeek();
    const interval = setInterval(loadWeek, 300000);
    return () => { active = false; clearInterval(interval); };
  }, [weeklyStart, weeklyRetry, fetchWithAuth]);

  useEffect(() => {
    if (!diagnosticsOpen) return;
    let active = true;
    const loadDiagnostics = async () => {
      setDiagnosticsLoad({ loading: true, error: '' });
      const params = new URLSearchParams({
        monthYear,
        riderId: connectivityFilters.riderId,
        eventType: connectivityFilters.eventType,
        risk: connectivityFilters.risk,
      });
      try {
        const [integrityResponse, connectivityResponse] = await Promise.all([
          fetchWithAuth(`/api/analytics/operational-integrity?monthYear=${monthYear}`),
          fetchWithAuth(`/api/analytics/rider-connectivity?${params.toString()}`),
        ]);
        if (!integrityResponse?.ok || !connectivityResponse?.ok) throw new Error('Diagnostics request failed');
        const [integrity, connectivity] = await Promise.all([integrityResponse.json(), connectivityResponse.json()]);
        if (!active) return;
        setIntegrityData(integrity);
        setConnectivityData(connectivity);
        setDiagnosticsLoad({ loading: false, error: '' });
      } catch (error) {
        if (active) setDiagnosticsLoad({ loading: false, error: 'Unable to load diagnostics. Please try again.' });
        console.error('Failed to load analytics diagnostics', error);
      }
    };
    void loadDiagnostics();
    const interval = setInterval(loadDiagnostics, 300000);
    return () => { active = false; clearInterval(interval); };
  }, [diagnosticsOpen, diagnosticsRetry, monthYear, connectivityFilters, fetchWithAuth]);

  const accounting = React.useMemo(() => buildRequestAccounting(tableData), [tableData]);
  const pendingBreakdownData = React.useMemo(() => (['pending', 'active', 'revision'] as const).map((bucket, i) => ({
    name: ACCOUNTING_LABELS[bucket], value: accounting[bucket], color: COLORS[i],
    requesters: Array.from(new Set(tableData.filter(row => getAccountingBucket(row) === bucket).map(row => row.requester_name).filter(Boolean))),
  })), [tableData, accounting]);
  useEffect(() => { setCurrentPage(1); }, [mainScopeKey, ledgerBucket, tableData]);

  const sortedData = React.useMemo(() => {
    let sortableItems = tableData.filter(row => ledgerBucket === 'all' || getAccountingBucket(row) === ledgerBucket);
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'created_at') {
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
        } else if (sortConfig.key === 'request_id') {
          aVal = String(a.request_id);
          bVal = String(b.request_id);
        } else if (sortConfig.key === 'delivery_status') {
          aVal = String(a.delivery_status || 'pending').toLowerCase();
          bVal = String(b.delivery_status || 'pending').toLowerCase();
        } else {
          aVal = String(aVal || '').toLowerCase();
          bVal = String(bVal || '').toLowerCase();
        }

        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [tableData, sortConfig, ledgerBucket]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const mapCenter: [number, number] = hotspots.length > 0 
    ? [Number(hotspots[0].lat), Number(hotspots[0].lng)] 
    : [14.5995, 120.9842];

  const completionRate = summaryStats.counts.total > 0 ? ((summaryStats.counts.completed / summaryStats.counts.total) * 100).toFixed(1) : "0";
  const failRate = summaryStats.counts.total > 0 ? ((summaryStats.counts.failed / summaryStats.counts.total) * 100).toFixed(1) : "0";
  const cancelRate = summaryStats.counts.total > 0 ? ((summaryStats.counts.cancelled / summaryStats.counts.total) * 100).toFixed(1) : "0";

  return (
    <div className="bg-[#F1F5F9] min-h-screen p-2 sm:p-3 md:p-6 font-sans text-slate-900 selection:bg-[#00B14F]/30 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto space-y-3 md:space-y-4 print-container relative z-10">
        
        {/* COMPACT HEADER BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 md:gap-3 bg-white/60 backdrop-blur-md p-2.5 md:p-3 rounded-lg border border-white/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00B14F] rounded-lg flex items-center justify-center text-white shadow-md shadow-[#00B14F]/10">
              <Bike size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-black tracking-tighter uppercase italic text-slate-800 leading-none">Intelligence</h1>
                <Badge className="bg-slate-900 text-white border-none text-[8px] h-4 rounded px-1.5">V2.1</Badge>
              </div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">Logistics Command</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-600">Weekly delivery performance and request analytics</p>
        </div>

        <section aria-label="Weekly schedule" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div><h2 className="text-sm font-black text-slate-800">This week at a glance</h2><p className="text-[10px] font-medium text-slate-500">Schedule, workload, and rider delivery progress</p></div>
            <Button type="button" onClick={() => downloadWeeklyScheduleCsv(weeklyLoad.requests, weeklyStart)} disabled={weeklyLoad.loading || Boolean(weeklyLoad.error)} className="min-h-10 bg-[#00B14F] text-white hover:bg-[#009e46] disabled:opacity-50"><Download size={15} className="mr-2" />Download weekly schedule</Button>
          </div>
          {weeklyLoad.weekStart !== weeklyStart || weeklyLoad.loading || weeklyLoad.error ? (
            <Card className="rounded-lg border-none bg-white shadow-sm">
              <CardHeader className="flex flex-wrap items-center justify-between gap-3 p-4"><CardTitle className="text-sm font-bold">{formatWeekDay(weeklyStart)} – {formatWeekDay(shiftIsoDate(weeklyStart, 6))}</CardTitle><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeeklyStart(shiftIsoDate(weeklyStart, -7))}><ChevronLeft size={14} /></Button><Button variant="outline" onClick={() => setWeeklyStart(getPhilippineWeekStart())}>This Week</Button><Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeeklyStart(shiftIsoDate(weeklyStart, 7))}><ChevronRight size={14} /></Button></div></CardHeader>
              <CardContent className="p-4">{weeklyLoad.weekStart === weeklyStart && !weeklyLoad.loading && weeklyLoad.error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><p>{weeklyLoad.error}</p><Button variant="outline" className="mt-3" onClick={() => setWeeklyRetry(value => value + 1)}>Try again</Button></div> : <p role="status" aria-label="Loading weekly schedule…" aria-busy="true" className="py-6 text-sm text-slate-500">Loading weekly schedule…</p>}</CardContent>
            </Card>
          ) : <WeeklyScheduleView weekStart={weeklyStart} requests={weeklyLoad.requests} onWeekChange={setWeeklyStart} filter={scheduleFilter} onFilterChange={setScheduleFilter} />}
        </section>

        <section aria-label="Performance and transaction analytics" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1"><div><h2 className="text-sm font-black text-slate-800">Performance &amp; transaction analytics</h2><p className="text-[10px] font-medium text-slate-500">Monthly trends and request-level detail</p></div><div className="flex items-center gap-2"><div className="w-full bg-white p-1 rounded-lg flex items-center gap-1 border border-slate-200 px-2 h-9 sm:w-auto"><Calendar size={12} className="text-slate-500" /><input type="month" value={monthYear} aria-label="Reporting month" onChange={(e) => { if (e.target.value) { setMonthYear(e.target.value); setMainScope('month'); } }} className="min-w-0 flex-1 bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none border-none cursor-pointer sm:flex-none" /></div><button type="button" aria-pressed={mainScope === 'all'} onClick={() => setMainScope(value => value === 'all' ? 'month' : 'all')} className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">{mainScope === 'all' ? 'Selected month' : 'All dates'}</button></div></div>
        {mainLoad.monthYear !== mainScopeKey || mainLoad.loading || mainLoad.error ? (
          <Card><CardContent className="p-6">
            {mainLoad.error && mainLoad.monthYear === mainScopeKey ? <div role="alert">
              <p>{mainLoad.error}</p><Button onClick={() => setMainRetry(value => value + 1)}>Retry Main Stats</Button>
            </div> : <p role="status">Loading reconciled Main Stats…</p>}
          </CardContent></Card>
        ) : (
          <div className="space-y-6">
            <RequestReconciliation counts={accounting} scope={mainScope === 'all' ? 'All creation dates · Philippine time (UTC+8)' : `Created in ${monthYear} · Philippine time (UTC+8)`}
              selected={ledgerBucket} onSelect={setLedgerBucket} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 rounded-2xl md:rounded-[24px] p-4 md:p-8 border border-emerald-100/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 flex flex-col justify-center items-start">
                <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <CheckCircle size={140} strokeWidth={1} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 relative z-10">Completed Requests</h3>
                <div className="text-5xl md:text-7xl font-black tracking-tighter text-slate-800 relative z-10">{completionRate}%</div>
                <div className="mt-3 md:mt-5 flex items-center gap-2 bg-white/60 backdrop-blur-md px-2 md:px-3 py-1.5 rounded-full border border-emerald-100/50 relative z-10 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase">
                    {summaryStats.counts.completed} of {summaryStats.counts.total} Total
                  </span>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-rose-50/30 rounded-2xl md:rounded-[24px] p-4 md:p-8 border border-rose-100/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 flex flex-col justify-center items-start">
                <div className="absolute -right-6 -top-6 text-rose-500/5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                  <XCircle size={140} strokeWidth={1} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-3 relative z-10">Failed Requests</h3>
                <div className="text-5xl md:text-7xl font-black tracking-tighter text-slate-800 relative z-10">{failRate}%</div>
                <div className="mt-3 md:mt-5 flex items-center gap-2 bg-white/60 backdrop-blur-md px-2 md:px-3 py-1.5 rounded-full border border-rose-100/50 relative z-10 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase">
                    {summaryStats.counts.failed} of {summaryStats.counts.total} Total
                  </span>
                </div>
              </div>
              
              <div className="group relative col-span-2 sm:col-span-1 overflow-hidden bg-gradient-to-br from-amber-50 via-white to-amber-50/30 rounded-2xl md:rounded-[24px] p-4 md:p-8 border border-amber-100/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 flex flex-col justify-center items-start">
                <div className="absolute -right-6 -top-6 text-amber-500/5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                  <AlertCircle size={140} strokeWidth={1} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 relative z-10">Cancelled Requests</h3>
                <div className="text-5xl md:text-7xl font-black tracking-tighter text-slate-800 relative z-10">{summaryStats.counts.cancelled || 0}</div>
                <div className="mt-3 md:mt-5 flex items-center gap-2 bg-white/60 backdrop-blur-md px-2 md:px-3 py-1.5 rounded-full border border-amber-100/50 relative z-10 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase">
                    {cancelRate}% of Total
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150">
              <Card className="rounded-[24px] border border-slate-100/60 shadow-sm bg-white overflow-hidden flex flex-col group transition-all hover:shadow-md duration-300">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50/80 text-amber-500 rounded-[12px] group-hover:bg-amber-100 transition-colors">
                      <Clock size={16} />
                    </div>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Open Requests Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="h-80 p-4 relative">
                  {pendingBreakdownData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pendingBreakdownData} innerRadius={65} outerRadius={95} paddingAngle={6} dataKey="value" strokeWidth={0} cornerRadius={6}>
                          {pendingBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip content={<CustomPendingTooltip />} />
                        <Legend wrapperStyle={{fontSize: '10px', fontWeight: '800', paddingTop: '20px'}} iconType="circle"/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl m-2">
                      <CheckCircle2 size={32} className="text-emerald-400 mb-3 opacity-60" />
                      <span className="text-[10px] font-black uppercase tracking-widest">No Open Requests</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border border-slate-100/60 shadow-sm bg-white overflow-hidden flex flex-col group transition-all hover:shadow-md duration-300">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50/80 text-blue-500 rounded-[12px] group-hover:bg-blue-100 transition-colors">
                      <PieChartIcon size={16} />
                    </div>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Requests by Department</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="h-80 p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={deptData} innerRadius={65} outerRadius={95} paddingAngle={6} dataKey="value" strokeWidth={0} cornerRadius={6}>
                        {deptData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', padding: '12px 16px' }} 
                        itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{fontSize: '10px', fontWeight: '800', paddingTop: '20px'}} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border border-slate-100/60 shadow-sm bg-white overflow-hidden flex flex-col group transition-all hover:shadow-md duration-300">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50/80 text-indigo-500 rounded-[12px] group-hover:bg-indigo-100 transition-colors">
                      <FileBarChart size={16} />
                    </div>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Tasks Completed (3 Months)</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="h-80 p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc', radius: 6 }} 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} 
                        itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                      />
                      <Bar dataKey="completed" fill="#6366f1" radius={[8, 8, 8, 8]} name="Completed Tasks" barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-300">
              <Card className="rounded-[24px] border border-slate-100/60 shadow-sm bg-white overflow-hidden flex flex-col group transition-all hover:shadow-md duration-300">
                <CardHeader className="p-5 pb-0">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-emerald-50/80 text-emerald-500 rounded-[10px] group-hover:bg-emerald-100 transition-colors">
                      <PieChartIcon size={14} />
                    </div>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Category Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="h-64 p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} innerRadius={45} outerRadius={70} paddingAngle={6} dataKey="value" strokeWidth={0} cornerRadius={6}>
                        {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} 
                        itemStyle={{ fontWeight: '800', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{fontSize: '9px', fontWeight: '900'}} iconType="circle"/>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border border-slate-100/60 shadow-sm bg-white overflow-hidden flex flex-col relative group transition-all hover:shadow-md duration-300">
                <CardHeader className="p-5 pb-0 z-10 relative bg-white/80 backdrop-blur-md border-b border-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-50/80 text-amber-500 rounded-[10px] group-hover:bg-amber-100 transition-colors">
                      <MapPin size={14} />
                    </div>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Map Heatmap</CardTitle>
                    <CardDescription>{hotspots.reduce((sum, point) => sum + point.weight, 0)} of {accounting.total} requests mapped; remaining records have missing or invalid coordinates.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="h-64 p-0 relative">
                  {hotspots.length > 0 ? (
                    <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; OpenStreetMap &copy; CARTO'
                      />
                      {hotspots.map((point, i) => (
                        <Circle 
                          key={i}
                          center={[Number(point.lat), Number(point.lng)]}
                          radius={Math.min(point.weight * 50, 500)}
                          pathOptions={{ 
                            color: '#f59e0b', 
                            fillColor: '#f59e0b', 
                            fillOpacity: 0.5,
                            stroke: false 
                          }}
                        >
                          <Popup>
                            <div className="text-[10px] font-black uppercase text-slate-800">{point.weight} Transactions</div>
                          </Popup>
                        </Circle>
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <MapPin size={24} className="text-slate-300 mb-2 opacity-50" />
                      <span className="text-[9px] font-black uppercase tracking-widest">No Location Data</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[24px] border border-slate-100/60 shadow-sm bg-white overflow-hidden flex flex-col group transition-all hover:shadow-md duration-300">
                <CardHeader className="p-5 pb-3 border-b border-slate-50/80">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-rose-50/80 text-rose-500 rounded-[10px] group-hover:bg-rose-100 transition-colors">
                      <AlertTriangle size={14} />
                    </div>
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">All Failure Reasons · {accounting.failed} requests</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-1">
                  {failureReasonsData.length > 0 ? (
                    <ul className="space-y-4">
                      {failureReasonsData.map((f, i) => (
                        <li key={i} className="flex items-center justify-between text-xs group/item">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="w-5 h-5 rounded-[6px] bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center text-[9px] font-black shrink-0 transition-transform group-hover/item:scale-110">{i+1}</span>
                            <span className="font-bold text-slate-600 truncate transition-colors group-hover/item:text-slate-900">{f.reason}</span>
                          </div>
                          <span className="text-rose-600 font-black ml-3 bg-rose-50 px-2 py-0.5 rounded-md">{f.count}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <CheckCircle2 size={32} className="text-emerald-400 mb-3 opacity-60" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Clean Signal • No Failures</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-[24px] border border-slate-100/60 shadow-sm bg-white overflow-hidden flex flex-col group transition-all hover:shadow-md duration-300 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-500">
              <CardHeader className="p-5 pb-3 border-b border-slate-50/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-50 text-slate-500 rounded-[10px] group-hover:bg-slate-100 transition-colors">
                    <ClipboardList size={14} />
                  </div>
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Transaction Logs</CardTitle>
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-slate-100">{sortedData.length} of {tableData.length} Records · {ledgerBucket === 'all' ? 'All categories' : ACCOUNTING_LABELS[ledgerBucket]}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Transaction ID" sortKey="request_id" className="pl-5" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Date" sortKey="created_at" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Requester" sortKey="requester_name" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Department" sortKey="requester_department" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Category" sortKey="request_type" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Origin" sortKey="pickup_address" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Destination" sortKey="dropoff_address" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Reporting category / assigned rider" sortKey="delivery_status" />
                        <SortableHeader sortConfig={sortConfig} onSort={handleSort} title="Instructions" sortKey="personnel_instructions" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedData.length > 0 ? (() => {
                        const itemsPerPage = 10;
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);
                        return paginatedData.map((row, idx) => {
                          let statusActor = ACCOUNTING_LABELS[getAccountingBucket(row)];
                          if (row.assigned_rider_name) {
                            statusActor = `${statusActor} (Assigned: ${row.assigned_rider_name})`;
                          }

                          const statusStr = String(statusActor).toLowerCase();

                          return (
                            <tr key={row.request_id || idx} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-3 pl-5 text-[11px] font-bold text-slate-600 whitespace-nowrap">#{row.request_id}</td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">{`${formatSafeDate(row.created_at || new Date(), 'MMM d, yyyy')} ${formatSafeDate(row.created_at || new Date(), 'h:mm a')}`}</td>
                              <td className="p-3 text-[11px] font-bold text-slate-700 whitespace-nowrap">{row.requester_name || 'Unknown'}</td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">{row.requester_department || 'Unspecified department'}</td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-slate-200 bg-slate-50 text-slate-500 rounded-md">
                                  {row.request_type || 'Unknown'}
                                </Badge>
                              </td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap truncate max-w-[150px]" title={row.pickup_address}>{row.pickup_address || '-'}</td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap truncate max-w-[150px]" title={row.dropoff_address}>{row.dropoff_address || '-'}</td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    statusStr.includes('completed') ? 'bg-emerald-500' : 
                                    statusStr.includes('failed') ? 'bg-rose-500' : 'bg-amber-500'
                                  )} />
                                  {statusActor}
                                </div>
                                <div className="text-[10px] text-slate-400">Source: {row.status || '(blank)'} / {row.delivery_status || '(blank)'}</div>
                              </td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap truncate max-w-[200px]" title={row.personnel_instructions}>
                                {row.personnel_instructions || '-'}
                              </td>
                            </tr>
                          );
                        });
                      })() : (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400">
                            <FileText size={24} className="mx-auto mb-2 opacity-30" />
                            <div className="text-[10px] font-black uppercase tracking-widest">No Transactions Found</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {sortedData.length > 0 && (
                    <div className="p-3 px-5 flex items-center justify-between bg-white border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, sortedData.length)} of {sortedData.length} records
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 rounded-md border-slate-200 text-slate-500 hover:bg-slate-50"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={14} />
                        </Button>
                        <div className="px-3 text-[11px] font-bold text-slate-600">
                          {currentPage} / {Math.ceil(sortedData.length / 10)}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 w-7 p-0 rounded-md border-slate-200 text-slate-500 hover:bg-slate-50"
                          disabled={currentPage === Math.ceil(sortedData.length / 10)}
                          onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedData.length / 10), p + 1))}
                        >
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        </section>
      </div>
    </div>
  );
}


const WEEKLY_TIME_BRACKETS = Array.from({ length: 16 }, (_, index) => {
  const startHour = index + 6;
  const endHour = startHour + 1;
  const label = (hour: number) => {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${suffix}`;
  };
  return { startHour, label: `${label(startHour)} – ${label(endHour)}` };
});
WEEKLY_TIME_BRACKETS.push({ startHour: null as any, label: 'Unscheduled / Other' });

function getTimeWindowStartHour(value: any) {
  const match = String(value || '').match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const meridiem = match[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return Number.isFinite(hour) ? hour : null;
}

function weeklyStatusClass(request: any) {
  const status = String(request.status || '').toLowerCase();
  const deliveryStatus = String(request.delivery_status || '').toLowerCase();
  if (status === 'returned_for_revision') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (status === 'disapproved' || status === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (deliveryStatus === 'completed' || deliveryStatus === 'delivered') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (deliveryStatus === 'failed' || deliveryStatus === 'cancelled') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (['assigned', 'in_progress', 'arrived', 'picked_up'].includes(deliveryStatus)) return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-amber-200 bg-amber-50 text-amber-800';
}


function formatOverdueDuration(minutes?: number | null) {
  if (minutes === null || minutes === undefined || minutes < 0) return '—';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}

function downloadWeeklyScheduleCsv(requests: any[], weekStart: string) {
  const rows = [
    ['Date', 'Day', 'Time Bracket', 'Request', 'Rider', 'Outcome', 'Overdue', 'Overdue At', 'Scheduled Time', 'Accepted', 'Started', 'Resolved At', 'Resolved By', 'Overdue Duration', 'Pickup', 'Destination'],
    ...requests.map((request) => {
      const resolution = getWeeklyResolutionDetails(request);
      const startedAt = getWeeklyStartedAt(request);
      return [request.delivery_date, formatWeekDay(request.delivery_date), request.time_window || 'Unscheduled', request.request_id, request.assigned_rider_name || 'Unassigned', resolution.outcome, resolution.overdue ? 'Yes' : 'No', request.overdue_at ? formatSafeDate(request.overdue_at, 'MMM d, h:mm a') : '', request.time_window || '', request.accepted_at ? formatSafeDate(request.accepted_at, 'h:mm a') : '', startedAt ? formatSafeDate(startedAt, 'h:mm a') : '', request.finished_at ? formatSafeDate(request.finished_at, 'MMM d, h:mm a') : '', resolution.resolvedBy, formatOverdueDuration(request.overdue_minutes_at_resolution), request.pickup_address || '', request.dropoff_address || ''];
    }),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `weekly-schedule-${weekStart}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function WeeklyScheduleView({
  weekStart,
  requests,
  onWeekChange,
  filter,
  onFilterChange,
}: {
  weekStart: string;
  requests: any[];
  onWeekChange: (value: string) => void;
  filter: 'all' | 'completed' | 'overdue' | 'open';
  onFilterChange: (value: 'all' | 'completed' | 'overdue' | 'open') => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) => shiftIsoDate(weekStart, index));
  const [showEmptyHours, setShowEmptyHours] = useState(false);
  const [expandedRiders, setExpandedRiders] = useState<Set<string>>(new Set());
  const riderReport = buildWeeklyRiderReport(requests);
  const reportSummary = getWeeklyReportSummary(requests);
  const toggleRider = (riderId: string) => {
    setExpandedRiders((current) => {
      const next = new Set(current);
      if (next.has(riderId)) next.delete(riderId);
      else next.add(riderId);
      return next;
    });
  };
  const visibleRequests = requests.filter((request) => {
    if (filter === 'all') return true;
    const details = getWeeklyResolutionDetails(request);
    if (filter === 'completed') return details.outcome === 'Completed';
    if (filter === 'overdue') return details.overdue;
    return details.outcome === 'Open';
  });
  const getCellRequests = (bracket: { startHour: number | null }, day: string) => visibleRequests.filter((request) => {
    if (request.delivery_date !== day) return false;
    const startHour = getTimeWindowStartHour(request.time_window);
    return bracket.startHour === null
      ? startHour === null || startHour < 6 || startHour > 21
      : startHour === bracket.startHour;
  });
  const hasRequests = (bracket: { startHour: number | null }) => days.some((day) => getCellRequests(bracket, day).length > 0);
  const scheduleRows: Array<{ type: 'slot' | 'empty'; bracket?: { startHour: number | null; label: string }; label?: string }> = [];
  let emptyStart: { startHour: number | null; label: string } | null = null;
  let emptyEnd: { startHour: number | null; label: string } | null = null;
  const flushEmptyRange = () => {
    if (!emptyStart || !emptyEnd) return;
    scheduleRows.push({
      type: 'empty',
      label: emptyStart.startHour === emptyEnd.startHour
        ? `No scheduled requests · ${emptyStart.label}`
        : `No scheduled requests · ${emptyStart.label.split(' – ')[0]} – ${emptyEnd.label.split(' – ')[1]}`,
    });
    emptyStart = null;
    emptyEnd = null;
  };
  WEEKLY_TIME_BRACKETS.forEach((bracket) => {
    if (bracket.startHour === null) {
      flushEmptyRange();
      if (hasRequests(bracket)) scheduleRows.push({ type: 'slot', bracket });
      return;
    }
    if (showEmptyHours || hasRequests(bracket)) {
      flushEmptyRange();
      scheduleRows.push({ type: 'slot', bracket });
    } else {
      emptyStart ||= bracket;
      emptyEnd = bracket;
    }
  });
  if (!showEmptyHours) flushEmptyRange();
  const displayedRows = showEmptyHours && filter === 'all'
    ? WEEKLY_TIME_BRACKETS.filter((bracket) => bracket.startHour !== null || hasRequests(bracket)).map((bracket) => ({ type: 'slot' as const, bracket }))
    : scheduleRows;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {[
          { key: 'all' as const, label: 'Total tasks', value: reportSummary.total, tone: 'text-slate-800' },
          { key: 'completed' as const, label: 'Completed', value: reportSummary.completed, tone: 'text-emerald-600' },
          { key: null, label: 'Failed', value: reportSummary.failed, tone: 'text-rose-600' },
          { key: 'overdue' as const, label: 'Overdue', value: reportSummary.overdue, tone: 'text-amber-600' },
          { key: 'open' as const, label: 'Open', value: reportSummary.open, tone: 'text-blue-600' },
          { key: null, label: 'Cancelled', value: reportSummary.cancelled, tone: 'text-slate-500' },
          { key: null, label: 'On-time rate', value: `${reportSummary.onTimeRate}%`, tone: 'text-indigo-600' },
        ].map((metric) => (
          <Card key={metric.label} className={cn("rounded-lg border-none bg-white shadow-sm", metric.key && "transition-shadow hover:shadow-md")}>
            <CardContent className="p-3">
              {metric.key ? <button type="button" aria-pressed={filter === metric.key} onClick={() => onFilterChange(metric.key!)} className="w-full min-h-12 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00B14F]"><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p><p className={cn('mt-1 text-xl font-black', metric.tone)}>{metric.value}</p></button> : <><p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p><p className={cn('mt-1 text-xl font-black', metric.tone)}>{metric.value}</p></>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-lg border-none bg-white shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800">Rider task performance</CardTitle>
            <CardDescription className="mt-1 text-[9px] font-bold text-slate-400">Expand a rider to review every task in this week’s schedule.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-[8px] font-black uppercase tracking-widest" onClick={() => setExpandedRiders(new Set(riderReport.map((row) => row.riderId)))}>
            Expand all riders
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  {['Rider', 'Assigned', 'Completed', 'Failed', 'Overdue', 'On-time rate', 'Avg. completion'].map((heading) => <th key={heading} className="p-3 text-[8px] font-black uppercase tracking-widest text-slate-400">{heading}</th>)}
                </tr>
              </thead>
              <tbody>
                {riderReport.map((row) => (
                  <React.Fragment key={row.riderId}>
                    <tr className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/70" onClick={() => toggleRider(row.riderId)}>
                      <td className="p-3 text-xs font-black text-slate-800"><span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[8px] text-white">{row.riderName.slice(0, 1).toUpperCase()}</span>{row.riderName}</td>
                      <td className="p-3 text-xs font-bold text-slate-700">{row.assigned}</td>
                      <td className="p-3 text-xs font-bold text-emerald-600">{row.completed}</td>
                      <td className="p-3 text-xs font-bold text-rose-600">{row.failed}</td>
                      <td className="p-3 text-xs font-bold text-amber-600">{row.overdue}</td>
                      <td className="p-3 text-xs font-bold text-indigo-600">{row.completed ? `${row.onTimeRate}%` : '—'}</td>
                      <td className="p-3 text-xs font-bold text-slate-600">{row.averageCompletionMinutes === null ? '—' : formatOverdueDuration(row.averageCompletionMinutes)}</td>
                    </tr>
                    {expandedRiders.has(row.riderId) && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={7} className="p-3">
                          <div className="space-y-2">
                            {row.tasks.map((task) => {
                              const outcome = getWeeklyTaskOutcome(task);
                              const resolution = getWeeklyResolutionDetails(task);
                              return (
                                <div key={task.request_id} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-[9px] sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-center">
                                  <div><p className="font-black text-slate-800">#{String(task.request_id || '').slice(-8).toUpperCase()}</p><p className="mt-0.5 truncate text-slate-500">{task.dropoff_building_name || task.dropoff_address || 'Destination pending'}</p></div>
                                  <div><p className="font-black uppercase text-slate-400">Outcome</p><p className="mt-0.5 font-bold text-slate-700">{outcome}</p></div>
                                  <div><p className="font-black uppercase text-slate-400">Schedule</p><p className="mt-0.5 font-bold text-slate-700">{task.delivery_date || '—'} · {task.time_window || 'Unscheduled'}</p></div>
                                  <div><p className="font-black uppercase text-slate-400">Resolution</p><p className="mt-0.5 font-bold text-slate-700">{resolution.resolvedBy}</p></div>
                                  <div className="text-left sm:text-right">{task.overdue_at ? <Badge className="border-amber-200 bg-amber-50 text-[8px] font-black uppercase text-amber-700">Overdue{task.overdue_minutes_at_resolution ? ` · ${formatOverdueDuration(task.overdue_minutes_at_resolution)}` : ''}</Badge> : <Badge variant="outline" className="text-[8px] font-black uppercase text-slate-500">On time</Badge>}</div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2 p-2 md:hidden">
            {riderReport.map((row) => (
              <div key={row.riderId} className="rounded-md border border-slate-100">
                <button type="button" className="flex w-full items-center justify-between p-3 text-left" onClick={() => toggleRider(row.riderId)}>
                  <span><span className="block text-[10px] font-black text-slate-800">{row.riderName}</span><span className="mt-1 block text-[8px] font-bold text-slate-400">{row.assigned} assigned · {row.completed} completed · {row.overdue} overdue</span></span>
                  {expandedRiders.has(row.riderId) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {expandedRiders.has(row.riderId) && <div className="space-y-2 border-t border-slate-100 bg-slate-50 p-2">{row.tasks.map((task) => <div key={task.request_id} className="rounded-md bg-white p-2 text-[9px]"><p className="font-black">#{String(task.request_id || '').slice(-8).toUpperCase()}</p><p className="mt-1 text-slate-500">{getWeeklyTaskOutcome(task)} · {task.delivery_date || 'No date'} · {task.time_window || 'Unscheduled'}</p>{task.overdue_at && <p className="mt-1 font-black uppercase text-amber-600">Overdue</p>}</div>)}</div>}
              </div>
            ))}
          </div>
          {!riderReport.length && <div className="p-8 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">No rider tasks for this week</div>}
        </CardContent>
      </Card>

      <Card className="rounded-lg border-none shadow-sm bg-white">
        <CardHeader className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800">Weekly Schedule</CardTitle>
            <CardDescription className="text-[9px] font-bold text-slate-400 mt-1">Scheduled requests and rider time-in · Philippine Time (PHT)</CardDescription>
          </div>
          <div className="grid grid-cols-4 items-center gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onWeekChange(shiftIsoDate(weekStart, -7))} aria-label="Previous week">
              <ChevronLeft size={14} />
            </Button>
            <Button variant="outline" className="h-8 px-2 text-[8px] font-black uppercase tracking-widest sm:px-3 sm:text-[9px]" onClick={() => onWeekChange(getPhilippineWeekStart())}>This Week</Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onWeekChange(shiftIsoDate(weekStart, 7))} aria-label="Next week">
              <ChevronRight size={14} />
            </Button>
            <input type="date" value={weekStart} onChange={(event) => {
              const date = new Date(`${event.target.value}T00:00:00+08:00`);
              if (!Number.isNaN(date.getTime())) onWeekChange(getPhilippineWeekStart(date));
            }} className="col-span-2 h-8 min-w-0 rounded-md border border-slate-200 px-1.5 text-[9px] font-bold text-slate-700 sm:col-span-1 sm:px-2" aria-label="Select week" />
            <Button variant="outline" onClick={() => setShowEmptyHours((visible) => !visible)} className="col-span-4 h-8 px-2 text-[8px] font-black uppercase tracking-widest sm:col-span-1 sm:px-3 sm:text-[9px]">
              {showEmptyHours ? 'Collapse empty hours' : 'Show empty hours'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="rounded-lg border-none shadow-sm bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="space-y-2 p-2 md:hidden">
            {displayedRows.map((row, index) => row.type === 'empty' ? (
              <div key={`mobile-empty-${index}`} className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[8px] font-bold italic text-slate-400">
                {row.label}
              </div>
            ) : (
              <div key={`mobile-slot-${row.bracket?.startHour ?? index}`} className="rounded-lg border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{row.bracket?.label}</span>
                  <span className="text-[8px] font-bold text-slate-400">{days.reduce((total, day) => total + getCellRequests(row.bracket!, day).length, 0)} requests</span>
                </div>
                <div className="space-y-2 p-2">
                  {days.map((day) => {
                    const cellRequests = getCellRequests(row.bracket!, day);
                    if (!cellRequests.length) return null;
                    return (
                      <div key={`mobile-${day}-${row.bracket?.startHour}`} className="space-y-1">
                        <p className="px-1 text-[8px] font-black uppercase tracking-widest text-slate-400">{formatWeekDay(day)}</p>
                        {cellRequests.map((request) => {
                          const resolution = getWeeklyResolutionDetails(request);
                          const startedAt = getWeeklyStartedAt(request);
                          const showOverdueAt = getWeeklyScheduleDetailLabels(request).includes('Overdue at');
                          return (
                            <div key={request.request_id} className={cn('weekly-schedule-request-cell rounded-md border p-2 text-[8px] leading-tight', weeklyStatusClass(request))}>
                              <p className="truncate font-black">{request.dropoff_building_name || 'Destination building'}</p>
                              <p className="truncate font-bold">Transaction #{String(request.request_id).slice(-6).toUpperCase()}</p>
                              <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 opacity-80">
                                <span>Scheduled: {request.time_window || 'Unscheduled'}</span>
                                {showOverdueAt && <span>Overdue at: {request.overdue_at ? formatSafeDate(request.overdue_at, 'MMM d, h:mm a') : '—'}</span>}
                                <span>Started: {startedAt ? formatSafeDate(startedAt, 'h:mm a') : '—'}</span>
                                <span>Ended: {request.finished_at ? formatSafeDate(request.finished_at, 'MMM d, h:mm a') : '—'}</span>
                                <span>{getWeeklyResolverLabel(resolution.outcome)}: {resolution.resolvedBy}</span>
                              </div>
                              {resolution.overdue && <p className="mt-1 truncate font-black uppercase">OVERDUE · {formatOverdueDuration(request.overdue_minutes_at_resolution)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
          <div className="min-w-[1080px]">
            <div className="grid grid-cols-[112px_repeat(7,minmax(138px,1fr))] border-b border-slate-100 bg-slate-900 text-white">
              <div className="p-3 text-[8px] font-black uppercase tracking-widest">Time bracket</div>
              {days.map((day) => (
                <div key={day} className="border-l border-white/10 p-3 text-center text-[8px] font-black uppercase tracking-widest">
                  {formatWeekDay(day)}
                </div>
              ))}
            </div>
            {displayedRows.map((row, index) => row.type === 'empty' ? (
              <div key={`empty-${index}`} className="grid grid-cols-[112px_repeat(7,minmax(138px,1fr))] min-h-[42px] border-b border-slate-100">
                <div className="sticky left-0 z-10 bg-slate-50 p-3 text-[8px] font-black uppercase tracking-tight text-slate-400">Collapsed</div>
                <div className="col-span-7 flex items-center px-4 text-[8px] font-bold italic text-slate-400">{row.label}</div>
              </div>
            ) : (
              <div key={row.bracket?.startHour ?? `slot-${index}`} className="grid grid-cols-[112px_repeat(7,minmax(138px,1fr))] min-h-[92px] border-b border-slate-100 last:border-b-0">
                <div className="sticky left-0 z-10 bg-slate-50 p-3 text-[8px] font-black uppercase tracking-tight text-slate-500">{row.bracket?.label}</div>
                {days.map((day) => {
                  const cellRequests = getCellRequests(row.bracket!, day);
                  return (
                    <div key={`${day}-${row.bracket?.startHour}`} className="border-l border-slate-100 p-1.5 space-y-1 bg-white">
                      {cellRequests.map((request) => {
                        const resolution = getWeeklyResolutionDetails(request);
                        const startedAt = getWeeklyStartedAt(request);
                        const showOverdueAt = getWeeklyScheduleDetailLabels(request).includes('Overdue at');
                        return (
                          <div key={request.request_id} className={cn('weekly-schedule-request-cell rounded-md border p-1.5 text-[8px] leading-tight', weeklyStatusClass(request))}>
                            <p className="truncate font-black">{request.dropoff_building_name || 'Destination building'}</p>
                            <p className="truncate font-bold">Transaction #{String(request.request_id).slice(-6).toUpperCase()}</p>
                            <p className="truncate opacity-80">Scheduled: {request.time_window || 'Unscheduled'}</p>
                            {showOverdueAt && <p className="truncate opacity-80">Overdue at: {request.overdue_at ? formatSafeDate(request.overdue_at, 'MMM d, h:mm a') : '—'}</p>}
                            <p className="truncate opacity-80">Started: {startedAt ? formatSafeDate(startedAt, 'h:mm a') : '—'}</p>
                            <p className="truncate opacity-80">Ended: {request.finished_at ? formatSafeDate(request.finished_at, 'MMM d, h:mm a') : '—'}</p>
                            <p className="truncate opacity-80">{getWeeklyResolverLabel(resolution.outcome)}: {resolution.resolvedBy}</p>
                            {resolution.overdue && <p className="truncate font-black uppercase">OVERDUE · {formatOverdueDuration(request.overdue_minutes_at_resolution)}</p>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          </div>
        </CardContent>
      </Card>

      {!requests.length ? <div className="rounded-lg border border-dashed border-slate-200 bg-white p-10 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">No scheduled requests for this week</div> : !visibleRequests.length ? <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center"><p className="text-sm font-semibold text-slate-600">No tasks match this filter</p><Button variant="outline" className="mt-3" onClick={() => onFilterChange('all')}>Clear filter</Button></div> : null}
    </div>
  );
}




function RiderConnectivityView({ data, filters, onFilterChange }: {
  data: any;
  filters: { riderId: string; eventType: string; risk: string };
  onFilterChange: React.Dispatch<React.SetStateAction<{ riderId: string; eventType: string; risk: string }>>;
}) {
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const logs = data?.logs || [];
  const riderReport = data?.riderReport || [];
  const summary = data?.summary || {};
  const timeline = data?.timeline || [];
  const riderOptions = data?.riderOptions || [];
  const reasonBreakdown = data?.reasonBreakdown || [];
  const riskBreakdown = data?.riskBreakdown || [];

  const updateFilter = (key: keyof typeof filters, value: string) => {
    onFilterChange((prev) => ({ ...prev, [key]: value }));
    setSelectedLog(null);
  };

  const clearFilters = () => {
    onFilterChange({ riderId: 'all', eventType: 'all', risk: 'all' });
    setSelectedLog(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {data?.warning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-700">
          {data.warning}
        </div>
      )}

      <Card className="rounded-lg border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-3 md:p-4 border-b border-slate-50 flex items-start gap-2 flex-row justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-50 rounded text-blue-600">
              <Filter size={16} />
            </div>
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Rider Connectivity Controls</CardTitle>
              <CardDescription className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Filter by rider, event, and risk level</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase" onClick={clearFilters}>
            Clear
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ConnectivitySelect
              label="Rider"
              value={filters.riderId}
              onChange={(value) => updateFilter('riderId', value)}
              options={[
                { value: 'all', label: 'All riders' },
                ...riderOptions.map((rider: any) => ({ value: rider.rider_id, label: rider.rider_name || rider.rider_id })),
              ]}
            />
            <ConnectivitySelect
              label="Event"
              value={filters.eventType}
              onChange={(value) => updateFilter('eventType', value)}
              options={[
                { value: 'all', label: 'All events' },
                { value: 'offline_in_progress', label: 'Offline during task' },
                { value: 'online_restored', label: 'Signal restored' },
                { value: 'duty_on', label: 'Duty on' },
                { value: 'duty_off', label: 'Duty off' },
                { value: 'delayed_location', label: 'Delayed location' },
              ]}
            />
            <ConnectivitySelect
              label="Risk"
              value={filters.risk}
              onChange={(value) => updateFilter('risk', value)}
              options={[
                { value: 'all', label: 'All risks' },
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
                { value: 'unknown', label: 'Unknown' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ConnectivityCard label="Offline In-Progress" value={summary.offlineInProgress || 0} tone="rose" />
        <ConnectivityCard label="Total Offline Time" value={summary.totalOfflineLabel || '0m'} tone="slate" />
        <ConnectivityCard label="Low Battery" value={summary.lowBatteryIncidents || 0} tone="amber" />
        <ConnectivityCard label="Suspicious Offline" value={summary.suspiciousIncidents || 0} tone="orange" />
        <ConnectivityCard label="Repeat Riders" value={summary.repeatRiders || 0} tone="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-lg border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Signal Loss Trend</CardTitle>
            <CardDescription className="text-[8px] font-bold text-slate-400 uppercase mt-1">Offline and recovery volume by day</CardDescription>
          </CardHeader>
          <CardContent className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fontWeight: 800 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="offline" fill="#e11d48" radius={[3, 3, 0, 0]} name="Offline" />
                <Line type="monotone" dataKey="restored" stroke="#10b981" strokeWidth={2} dot={false} name="Restored" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-lg border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Reason Mix</CardTitle>
            <CardDescription className="text-[8px] font-bold text-slate-400 uppercase mt-1">Likely cause for offline incidents</CardDescription>
          </CardHeader>
          <CardContent className="h-56 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonBreakdown} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 9, fontWeight: 800 }} allowDecimals={false} />
                <YAxis type="category" dataKey="reason" tick={{ fontSize: 8, fontWeight: 800 }} width={105} />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {riskBreakdown.map((risk: any) => (
          <ConnectivityCard
            key={risk.risk}
            label={`${risk.risk} Risk`}
            value={risk.count}
            tone={risk.risk === 'critical' ? 'rose' : risk.risk === 'high' ? 'orange' : risk.risk === 'medium' ? 'amber' : 'slate'}
          />
        ))}
      </div>

      <Card className="rounded-lg border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-4 border-b border-slate-50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-rose-50 rounded text-rose-600">
              <WifiIcon size={16} />
            </div>
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Connectivity Log</CardTitle>
              <CardDescription className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Duty, signal loss, recovery, and battery context</CardDescription>
            </div>
          </div>
          <Badge className="bg-slate-900 text-white border-none text-[8px] h-5 rounded px-2">{logs.length} ROWS</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2 p-3 md:hidden">
            {logs.map((log: any) => (
              <button key={`mobile-log-${log.id}`} type="button" className="w-full rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-left" onClick={() => setSelectedLog(log)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><p className="truncate text-[10px] font-black text-slate-900">{log.rider_name || log.rider_id}</p><p className="mt-1 text-[8px] font-bold text-slate-400">{formatSafeDate(log.event_time, 'MMM d, yyyy')} · {formatSafeDate(log.event_time, 'h:mm a')} PHT</p></div>
                  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[7px] font-black uppercase", riskClass(log.risk_level))}>{log.risk_level || 'unknown'}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[8px] font-bold text-slate-500">
                  <Badge className={cn("rounded text-[7px] border-none font-black uppercase h-4 px-1.5", eventBadgeClass(log.event_type))}>{formatConnectivityEvent(log.event_type)}</Badge>
                  <span>{log.request_id ? `#${String(log.request_id).slice(-6).toUpperCase()}` : 'No task'}</span>
                  <span>·</span><span>{log.duration_label || '-'}</span>
                  <span>·</span><span>{log.battery_level !== null && log.battery_level !== undefined ? `${log.battery_level}%` : '--'}</span>
                </div>
                <p className="mt-2 truncate text-[8px] font-medium text-slate-500">{log.likely_reason || 'No reason recorded'}</p>
              </button>
            ))}
            {logs.length === 0 && <div className="px-3 py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[9px]">No connectivity logs for this timeframe</div>}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1E293B] text-white text-[8px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-2.5">Date / Time (PHT)</th>
                  <th className="px-3 py-2.5">Rider</th>
                  <th className="px-3 py-2.5">Task</th>
                  <th className="px-3 py-2.5">Event</th>
                  <th className="px-3 py-2.5">Location</th>
                  <th className="px-3 py-2.5">Battery</th>
                  <th className="px-3 py-2.5">Duration</th>
                  <th className="px-3 py-2.5">Likely Reason</th>
                  <th className="px-4 py-2.5 text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="text-[9px] font-bold text-slate-600 divide-y divide-slate-50">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setSelectedLog(log)}>
                    <td className="px-4 py-2">
                      <p className="text-slate-900 font-black leading-none">{formatSafeDate(log.event_time, 'MMM d, yyyy')}</p>
                      <p className="text-[8px] text-slate-400 mt-1">{formatSafeDate(log.event_time, 'h:mm a')}</p>
                    </td>
                    <td className="px-3 py-2 font-black text-slate-800">{log.rider_name || log.rider_id}</td>
                    <td className="px-3 py-2">{log.request_id ? `#${String(log.request_id).slice(-6).toUpperCase()}` : '-'}</td>
                    <td className="px-3 py-2">
                      <Badge className={cn("rounded text-[7px] border-none font-black uppercase h-4 px-1.5", eventBadgeClass(log.event_type))}>
                        {formatConnectivityEvent(log.event_type)}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      {log.location_url ? (
                        <a href={log.location_url} target="_blank" rel="noreferrer" className="text-blue-600 font-black hover:underline" onClick={(e) => e.stopPropagation()}>
                          View Location
                        </a>
                      ) : '-'}
                      {log.location_age_seconds !== null && log.location_age_seconds !== undefined && (
                        <p className="text-[7px] text-slate-400 mt-0.5">{log.location_age_seconds}s old</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("font-black", Number(log.battery_level) <= 20 ? "text-rose-600" : "text-slate-700")}>
                        {log.battery_level !== null && log.battery_level !== undefined ? `${log.battery_level}%` : '--'}
                      </span>
                      <p className="text-[7px] text-slate-400 uppercase mt-0.5">{log.network_type || 'Unknown'}</p>
                    </td>
                    <td className="px-3 py-2 font-black text-slate-800">{log.duration_label || '-'}</td>
                    <td className="px-3 py-2">{log.likely_reason || '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase", riskClass(log.risk_level))}>
                        {log.risk_level || 'unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[9px]">
                      No connectivity logs for this timeframe
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedLog && (
        <Card className="rounded-lg border border-slate-200 shadow-sm bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800">Incident Details</CardTitle>
              <CardDescription className="text-[9px] font-bold text-slate-400">Last known location before offline is not exact offline location.</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-[8px] font-black uppercase" onClick={() => setSelectedLog(null)}>Close</Button>
          </CardHeader>
          <CardContent className="p-4 pt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <DetailBox label="Rider" value={selectedLog.rider_name || selectedLog.rider_id} />
            <DetailBox label="Task" value={selectedLog.request_id ? `#${String(selectedLog.request_id).slice(-6).toUpperCase()}` : '-'} />
            <DetailBox label="Event" value={formatConnectivityEvent(selectedLog.event_type)} />
            <DetailBox label="Event Time (PHT)" value={`${formatSafeDate(selectedLog.event_time, 'MMM d, yyyy')} ${formatSafeDate(selectedLog.event_time, 'h:mm a')}`} />
            <DetailBox label="Task Status" value={selectedLog.delivery_status || '-'} />
            <DetailBox label="Battery / Network" value={`${selectedLog.battery_level ?? '--'}% / ${selectedLog.network_type || 'Unknown'}`} />
            <DetailBox label="Location Age" value={selectedLog.location_age_seconds !== null && selectedLog.location_age_seconds !== undefined ? `${selectedLog.location_age_seconds}s` : '-'} />
            <DetailBox label="Offline Duration" value={selectedLog.duration_label || '-'} />
            <DetailBox label="Recommendation" value={selectedLog.recommendation || 'Manual review needed.'} />
          </CardContent>
        </Card>
      )}

      <Card className="rounded-lg border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-4 border-b border-slate-50">
          <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Simple Rider Report</CardTitle>
          <CardDescription className="text-[8px] font-bold text-slate-400 uppercase mt-1">Grouped summary for admin follow-up</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-2 p-3 md:hidden">
            {riderReport.map((rider: any) => (
              <div key={`mobile-report-${rider.rider_id}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-black text-slate-900">{rider.rider_name}</p><span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[7px] font-black uppercase", reliabilityClass(rider.reliability))}>{rider.reliability}</span></div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[8px] font-bold text-slate-600"><span>Sessions: {rider.duty_sessions}</span><span>Offline tasks: <b className="text-rose-600">{rider.offline_during_tasks}</b></span><span>Total offline: {rider.total_offline_label}</span><span>Average: {rider.average_offline_label}</span><span>Battery: {rider.average_battery_before_offline !== null ? `${rider.average_battery_before_offline}% avg` : 'No sample'}</span><span>Low / high: {rider.low_battery_count} / {rider.high_battery_count}</span></div>
                <p className="mt-2 text-[8px] font-medium leading-tight text-slate-500">{rider.recommendation || 'No recommendation'}</p>
              </div>
            ))}
            {riderReport.length === 0 && <div className="px-3 py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[9px]">No rider report data yet</div>}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 text-[8px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-2.5">Rider</th>
                  <th className="px-3 py-2.5">Duty Sessions</th>
                  <th className="px-3 py-2.5">Offline During Tasks</th>
                  <th className="px-3 py-2.5">Total Offline</th>
                  <th className="px-3 py-2.5">Avg Offline</th>
                  <th className="px-3 py-2.5">Battery Pattern</th>
                  <th className="px-3 py-2.5">Reliability</th>
                  <th className="px-4 py-2.5">Recommendation</th>
                </tr>
              </thead>
              <tbody className="text-[9px] font-bold text-slate-600 divide-y divide-slate-50">
                {riderReport.map((rider: any) => (
                  <tr key={rider.rider_id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-black text-slate-900">{rider.rider_name}</td>
                    <td className="px-3 py-2">{rider.duty_sessions}</td>
                    <td className="px-3 py-2 font-black text-rose-600">{rider.offline_during_tasks}</td>
                    <td className="px-3 py-2">{rider.total_offline_label}</td>
                    <td className="px-3 py-2">{rider.average_offline_label}</td>
                    <td className="px-3 py-2">
                      <p>{rider.average_battery_before_offline !== null ? `${rider.average_battery_before_offline}% avg` : 'No sample'}</p>
                      <p className="text-[7px] text-slate-400">Low: {rider.low_battery_count} / High: {rider.high_battery_count}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn("px-1.5 py-0.5 rounded text-[7px] font-black uppercase", reliabilityClass(rider.reliability))}>
                        {rider.reliability}
                      </span>
                    </td>
                    <td className="px-4 py-2 max-w-[240px] leading-tight">{rider.recommendation}</td>
                  </tr>
                ))}
                {riderReport.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-300 font-black uppercase tracking-widest text-[9px]">
                      No rider report data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectivityCard({ label, value, tone }: { label: string; value: any; tone: 'rose' | 'slate' | 'amber' | 'orange' | 'indigo' }) {
  const tones: Record<string, string> = {
    rose: 'text-rose-600 bg-rose-50',
    slate: 'text-slate-700 bg-slate-50',
    amber: 'text-amber-600 bg-amber-50',
    orange: 'text-orange-600 bg-orange-50',
    indigo: 'text-indigo-600 bg-indigo-50',
  };
  return (
    <div className={cn("rounded-lg border border-white shadow-sm p-3", tones[tone])}>
      <p className="text-[8px] font-black uppercase tracking-widest opacity-70 leading-none">{label}</p>
      <p className="text-xl font-black tracking-tighter mt-2 leading-none">{value}</p>
    </div>
  );
}

function ConnectivitySelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-[10px] font-black uppercase tracking-wider text-slate-700 outline-none focus:border-[#00B14F] focus:bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function DetailBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-[10px] font-black text-slate-800 mt-1 leading-snug">{value}</p>
    </div>
  );
}

function parsePhilippineDate(value: any) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(`${value.slice(0, 19).replace(' ', 'T')}+08:00`);
  }
  return new Date(value);
}

function formatSafeDate(value: any, pattern: string) {
  if (!value) return '-';
  const date = parsePhilippineDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  if (pattern === 'MMM d, yyyy') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: PHILIPPINE_TIME_ZONE,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }
  if (pattern === 'h:mm a') {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: PHILIPPINE_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }
  return format(date, pattern);
}

function formatConnectivityEvent(event: string) {
  const labels: Record<string, string> = {
    duty_on: 'Duty On',
    duty_off: 'Duty Off',
    offline_in_progress: 'Offline During Task',
    online_restored: 'Signal Restored',
    delayed_location: 'Delayed Location',
  };
  return labels[event] || event;
}

function eventBadgeClass(event: string) {
  if (event === 'offline_in_progress') return 'bg-rose-100 text-rose-700';
  if (event === 'online_restored') return 'bg-emerald-100 text-emerald-700';
  if (event === 'duty_on') return 'bg-blue-100 text-blue-700';
  if (event === 'duty_off') return 'bg-slate-100 text-slate-600';
  return 'bg-amber-100 text-amber-700';
}

function riskClass(risk: string) {
  if (risk === 'critical') return 'bg-rose-600 text-white';
  if (risk === 'high') return 'bg-orange-100 text-orange-700';
  if (risk === 'medium') return 'bg-amber-100 text-amber-700';
  if (risk === 'low') return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-500';
}

function reliabilityClass(reliability: string) {
  if (reliability === 'Critical') return 'bg-rose-600 text-white';
  if (reliability === 'Watchlist') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}
