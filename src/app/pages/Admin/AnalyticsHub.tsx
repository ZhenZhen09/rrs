import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Filter,
  Download,
  MapPin,
  Zap,
  Building,
  Info,
  Sparkles,
  FileText,
  Package,
  Bike,
  ClipboardList,
  AlertTriangle,
  FileBarChart,
  Map as MapIcon,
  CheckCircle2,
  XCircle,
  BadgeAlert,
  Truck,
  ShieldAlert,
  Wifi as WifiIcon,
  PieChart as PieChartIcon,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';

// Helper for vibrant colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#ef4444', '#14b8a6'];

import { OperationalIntegrityView } from '../../components/Admin/OperationalIntegrityView';

export function AnalyticsHub() {
  const { fetchWithAuth } = useData();
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'main' | 'integrity' | 'connectivity'>('main');
  const [connectivityFilters, setConnectivityFilters] = useState({
    riderId: 'all',
    eventType: 'all',
    risk: 'all',
  });
  const [summaryStats, setSummaryStats] = useState<any>({ 
    counts: { total: 0, completed: 0, in_transit: 0, pending: 0, failed: 0 }, 
    avgTime: 0,
    onTimeRate: 87,
    utilization: 76
  });
  const [deptData, setDeptData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [failureReasonsData, setFailureReasonsData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [urgencyData, setUrgencyData] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [peakHourData, setPeakHourData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [forecastDay, setForecastDay] = useState('');
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [riderPerformance, setRiderPerformance] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [locationInsights, setLocationInsights] = useState<any>({ pickups: [], dropoffs: [] });
  const [integrityData, setIntegrityData] = useState<any>(null);
  const [connectivityData, setConnectivityData] = useState<any>({
    summary: {},
    logs: [],
    riderReport: [],
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const my = monthYear;
        
        if (activeTab === 'main') {
          const urls = [
            `/api/analytics/department-allocation?monthYear=${my}`,
            `/api/analytics/urgency-inflation?monthYear=${my}`,
            `/api/analytics/hotspots?monthYear=${my}`,
            `/api/analytics/peak-hours?monthYear=${my}`,
            `/api/analytics/forecast?monthYear=${my}`,
            `/api/analytics/summary-stats?monthYear=${my}`,
            `/api/requests?limit=10&monthYear=${my}`,
            `/api/analytics/rider-performance?monthYear=${my}`,
            `/api/analytics/exceptions?monthYear=${my}`,
            `/api/analytics/location-insights?monthYear=${my}`,
            `/api/analytics/monthly-trend?monthYear=${my}`,
            `/api/analytics/request-categories?monthYear=${my}`,
            `/api/analytics/daily-heatmap?monthYear=${my}`,
            `/api/analytics/failure-reasons?monthYear=${my}`,
            `/api/analytics/export-csv?monthYear=${my}`
          ];

          const results = await Promise.all(urls.map(url => fetchWithAuth(url)));
          const [
            deptRes, urgencyRes, hotspotsRes, peakRes, forecastRes, summaryRes, recentRes, riderRes, exceptionRes, locationRes, trendRes, categoryRes, heatmapRes, failureRes, exportRes
          ] = results;

          if (deptRes && deptRes.ok) {
            const deptJson = await deptRes.json();
            const grouped: Record<string, number> = {};
            deptJson.forEach((row: any) => {
              grouped[row.requester_department || 'General'] = (grouped[row.requester_department || 'General'] || 0) + row.volume;
            });
            setDeptData(Object.keys(grouped).map((key, i) => ({ name: key, value: grouped[key], color: COLORS[i % COLORS.length] })));
          }

          if (urgencyRes && urgencyRes.ok) {
            const urgencyJson = await urgencyRes.json();
            setUrgencyData(urgencyJson.map((row: any) => ({
              urgency: row.urgency_level,
              avgMinutes: Math.round(Number(row.avg_completion_minutes) || 0),
              completed: row.total_completed
            })));
          }

          if (hotspotsRes && hotspotsRes.ok) setHotspots(await hotspotsRes.json());
          if (peakRes && peakRes.ok) {
            const peakJson = await peakRes.json();
            setPeakHourData(Array.from({ length: 24 }, (_, i) => {
              const found = peakJson.find((r: any) => r.hour === i);
              return {
                hour: i,
                displayHour: i > 12 ? `${i-12} PM` : i === 0 ? '12 AM' : i === 12 ? '12 PM' : `${i} AM`,
                volume: found ? found.volume : 0
              };
            }));
          }
          if (forecastRes && forecastRes.ok) {
            const forecastJson = await forecastRes.json();
            setForecastDay(forecastJson.day);
            setForecastData(Array.from({ length: 24 }, (_, i) => {
              const found = forecastJson.forecast.find((r: any) => r.hour_of_day === i);
              return {
                hour: i,
                displayHour: i > 12 ? `${i-12} PM` : i === 0 ? '12 AM' : i === 12 ? '12 PM' : `${i} AM`,
                expectedVolume: found ? Math.round(found.expected_volume) : 0
              };
            }));
          }
          if (summaryRes && summaryRes.ok) setSummaryStats(await summaryRes.json());
          if (recentRes && recentRes.ok) {
            const recentJson = await recentRes.json();
            setRecentRequests(recentJson.data || []);
          }
          if (riderRes && riderRes.ok) setRiderPerformance(await riderRes.json());
          if (exceptionRes && exceptionRes.ok) setExceptions(await exceptionRes.json());
          if (locationRes && locationRes.ok) setLocationInsights(await locationRes.json());
          if (trendRes && trendRes.ok) setMonthlyTrendData(await trendRes.json());
          if (categoryRes && categoryRes.ok) {
            const json = await categoryRes.json();
            setCategoryData(json.map((r: any, i: number) => ({ name: r.request_type, value: r.volume, color: COLORS[(i + 3) % COLORS.length] })));
          }
          if (heatmapRes && heatmapRes.ok) setHeatmapData(await heatmapRes.json());
          if (failureRes && failureRes.ok) setFailureReasonsData(await failureRes.json());
          if (exportRes && exportRes.ok) setTableData(await exportRes.json());
        } else if (activeTab === 'integrity') {
          // LAYER 4: Fetch Integrity Data
          const res = await fetchWithAuth(`/api/analytics/operational-integrity?monthYear=${my}`);
          if (res && res.ok) {
            setIntegrityData(await res.json());
          }
        } else {
          const params = new URLSearchParams({
            monthYear: monthYear,
            riderId: connectivityFilters.riderId,
            eventType: connectivityFilters.eventType,
            risk: connectivityFilters.risk,
          });
          const res = await fetchWithAuth(`/api/analytics/rider-connectivity?${params.toString()}`);
          if (res && res.ok) {
            setConnectivityData(await res.json());
          }
        }
      } catch (error) {
        console.error("Failed to load analytics data", error);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, [monthYear, activeTab, connectivityFilters, fetchWithAuth]);

  // Derived metrics from tableData
  const pendingBreakdownData = React.useMemo(() => {
    const categories = {
      'Pending': { count: 0, requesters: [] as string[] },
      'Assigned': { count: 0, requesters: [] as string[] },
      'Action Required': { count: 0, requesters: [] as string[] }
    };

    tableData.forEach(r => {
      let status = String(r.status || '').toLowerCase();
      let deliveryStatus = String(r.delivery_status || 'pending').toLowerCase();
      
      let cat = '';
      
      if (status === 'returned_for_revision') {
        cat = 'Action Required';
      } else if (status !== 'disapproved' && status !== 'cancelled' && deliveryStatus !== 'completed' && deliveryStatus !== 'failed') {
        if (deliveryStatus === 'assigned') {
          cat = 'Assigned';
        } else {
          cat = 'Pending';
        }
      }
      
      if (cat) {
        categories[cat as keyof typeof categories].count += 1;
        if (r.requester_name) categories[cat as keyof typeof categories].requesters.push(r.requester_name);
      }
    });

    return [
      { name: 'Pending', value: categories['Pending'].count, requesters: Array.from(new Set(categories['Pending'].requesters)), color: '#f59e0b' },
      { name: 'Assigned', value: categories['Assigned'].count, requesters: Array.from(new Set(categories['Assigned'].requesters)), color: '#3b82f6' },
      { name: 'Action Required', value: categories['Action Required'].count, requesters: Array.from(new Set(categories['Action Required'].requesters)), color: '#ef4444' }
    ];
  }, [tableData]);

  const sortedData = React.useMemo(() => {
    let sortableItems = [...tableData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'created_at') {
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
        } else if (sortConfig.key === 'request_id') {
          aVal = Number(a.request_id);
          bVal = Number(b.request_id);
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
  }, [tableData, sortConfig]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ title, sortKey, className }: { title: string, sortKey: string, className?: string }) => (
    <th 
      className={cn("p-3 text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors group select-none", className)}
      onClick={() => handleSort(sortKey)}
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

  const handleExportCSV = async () => {
    try {
      const res = await fetchWithAuth(`/api/analytics/export-csv?monthYear=${monthYear}`);
      if (!res?.ok) throw new Error("Failed to fetch export data");
      
      const data = await res.json();
      
      const headers = [
        "TRANSACTION ID",
        "Date Created",
        "Requester",
        "Department",
        "Request Category",
        "Origin",
        "Destination",
        "Task Instructions",
        "Admin Note",
        "Status Actor",
        "Rider/Admin Notes"
      ];
      
      const rows = data.map((row: any) => {
        let statusActor = row.delivery_status;
        let cleanNote = row.rider_remark || '';
        
        if (cleanNote.includes('[Admin update by')) {
          statusActor = `${row.delivery_status} (Admin)`;
          cleanNote = cleanNote.replace(/\[Admin update by.*?\]\s*/, '');
        } else if (row.assigned_rider_name) {
          statusActor = `${row.delivery_status} (Rider: ${row.assigned_rider_name})`;
        } else {
          statusActor = `${row.delivery_status}`;
        }
        
        return [
          row.request_id,
          format(new Date(row.created_at), 'MMM dd, yyyy hh:mm a'),
          row.requester_name,
          row.requester_department,
          row.request_type,
          row.pickup_address,
          row.dropoff_address,
          row.personnel_instructions,
          row.admin_remark,
          statusActor,
          cleanNote
        ];
      });
      
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      
      // Auto-size columns slightly
      const colWidths = headers.map(h => ({ wch: Math.max(15, h.length + 5) }));
      colWidths[1].wch = 22; // Date
      colWidths[5].wch = 30; // Origin
      colWidths[6].wch = 30; // Destination
      colWidths[7].wch = 40; // Instructions
      colWidths[8].wch = 20; // Admin Note
      colWidths[10].wch = 40; // Rider Notes
      worksheet['!cols'] = colWidths;
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Analytics Report");
      XLSX.writeFile(workbook, `Transactions_Report_${monthYear}.xlsx`);
    } catch (error) {
      console.error("Export error", error);
      alert("Failed to export CSV. Please try again.");
    }
  };

  const mapCenter: [number, number] = hotspots.length > 0 
    ? [Number(hotspots[0].lat), Number(hotspots[0].lng)] 
    : [14.5995, 120.9842];

  const completionRate = summaryStats.counts.total > 0 ? ((summaryStats.counts.completed / summaryStats.counts.total) * 100).toFixed(1) : "0";
  const failRate = summaryStats.counts.total > 0 ? ((summaryStats.counts.failed / summaryStats.counts.total) * 100).toFixed(1) : "0";

  return (
    <div className="bg-[#F1F5F9] min-h-screen p-3 md:p-6 font-sans text-slate-900 selection:bg-[#00B14F]/30 relative overflow-hidden">
      <div className="max-w-[1400px] mx-auto space-y-4 print-container relative z-10">
        
        {/* COMPACT HEADER BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-3 rounded-lg border border-white/60 shadow-sm">
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

          <div className="flex flex-wrap items-center gap-2 no-print">
            <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5 border border-slate-200/50 mr-4">
              {[
                { id: 'main', label: 'Main Stats', icon: <TrendingUp size={10} /> },
                { id: 'integrity', label: 'Operational Integrity', icon: <ShieldAlert size={10} /> },
                { id: 'connectivity', label: 'Rider Connectivity', icon: <WifiIcon size={10} /> }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id as any)}
                  className={cn(
                    "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5", 
                    t.id === activeTab ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-1 border border-slate-200/50 px-2 h-8">
              <Calendar size={12} className="text-slate-500" />
              <input
                type="month"
                value={monthYear}
                onChange={(e) => setMonthYear(e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none border-none cursor-pointer"
              />
            </div>
            <Button 
              onClick={handleExportCSV}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-lg px-4 h-8 text-[9px] uppercase tracking-widest gap-1.5"
            >
              <Download size={14} />
              EXPORT
            </Button>
          </div>
        </div>

        {activeTab === 'main' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 fade-in duration-700">
              <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 rounded-[24px] p-8 border border-emerald-100/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 flex flex-col justify-center items-start">
                <div className="absolute -right-6 -top-6 text-emerald-500/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <CheckCircle size={140} strokeWidth={1} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 relative z-10">Completed Requests</h3>
                <div className="text-7xl font-black tracking-tighter text-slate-800 relative z-10">{completionRate}%</div>
                <div className="mt-5 flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-100/50 relative z-10 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase">
                    {summaryStats.counts.completed} of {summaryStats.counts.total} Total
                  </span>
                </div>
              </div>
              
              <div className="group relative overflow-hidden bg-gradient-to-br from-rose-50 via-white to-rose-50/30 rounded-[24px] p-8 border border-rose-100/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 duration-300 flex flex-col justify-center items-start">
                <div className="absolute -right-6 -top-6 text-rose-500/5 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                  <XCircle size={140} strokeWidth={1} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-3 relative z-10">Failed Requests</h3>
                <div className="text-7xl font-black tracking-tighter text-slate-800 relative z-10">{failRate}%</div>
                <div className="mt-5 flex items-center gap-2 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-100/50 relative z-10 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-[9px] font-black tracking-widest text-slate-600 uppercase">
                    {summaryStats.counts.failed} of {summaryStats.counts.total} Total
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
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Pending Status Breakdown</CardTitle>
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
                      <span className="text-[10px] font-black uppercase tracking-widest">No Pending Tasks</span>
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
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Top Failure Reasons</CardTitle>
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
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-slate-100">{tableData.length} Records</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <SortableHeader title="Transaction ID" sortKey="request_id" className="pl-5" />
                        <SortableHeader title="Date" sortKey="created_at" />
                        <SortableHeader title="Requester" sortKey="requester_name" />
                        <SortableHeader title="Department" sortKey="requester_department" />
                        <SortableHeader title="Category" sortKey="request_type" />
                        <SortableHeader title="Origin" sortKey="pickup_address" />
                        <SortableHeader title="Destination" sortKey="dropoff_address" />
                        <SortableHeader title="Status Actor" sortKey="delivery_status" />
                        <SortableHeader title="Instructions" sortKey="personnel_instructions" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {sortedData.length > 0 ? (() => {
                        const itemsPerPage = 10;
                        const startIndex = (currentPage - 1) * itemsPerPage;
                        const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);
                        return paginatedData.map((row, idx) => {
                          let statusActor = row.delivery_status || 'pending';
                          let cleanNote = row.rider_remark || '';
                          
                          if (String(cleanNote).includes('[Admin update by')) {
                            statusActor = `${statusActor} (Admin)`;
                          } else if (row.assigned_rider_name) {
                            statusActor = `${statusActor} (Rider: ${row.assigned_rider_name})`;
                          }

                          const statusStr = String(statusActor).toLowerCase();

                          return (
                            <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-3 pl-5 text-[11px] font-bold text-slate-600 whitespace-nowrap">#{row.request_id}</td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">{format(new Date(row.created_at || new Date()), 'MMM dd, hh:mm a')}</td>
                              <td className="p-3 text-[11px] font-bold text-slate-700 whitespace-nowrap">{row.requester_name || 'Unknown'}</td>
                              <td className="p-3 text-[11px] font-semibold text-slate-500 whitespace-nowrap">{row.requester_department || 'General'}</td>
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
        ) : activeTab === 'integrity' ? (
          <OperationalIntegrityView data={integrityData} />
        ) : (
          <RiderConnectivityView
            data={connectivityData}
            filters={connectivityFilters}
            onFilterChange={setConnectivityFilters}
          />
        )}
      </div>
    </div>
  );
}

function SummaryKPI({ label, value, icon, color, trend }: any) {
  return (
    <div className="p-2.5 rounded-lg border border-slate-100 bg-white shadow-sm flex flex-col gap-2 group hover:scale-[1.01] transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="p-1.5 rounded bg-slate-50 text-slate-600" style={{ color }}>{icon}</div>
        <div className="text-right">
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">{label}</p>
          <p className="text-lg font-black tracking-tighter leading-none" style={{ color }}>{value}</p>
        </div>
      </div>
      <div className="h-6 w-full opacity-40">
        <Sparkline data={trend} color={color} />
      </div>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[], color: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.map(v => ({ v }))}>
        <Area type="monotone" dataKey="v" stroke={color} fill={color} fillOpacity={0.05} strokeWidth={1.5} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function SmallStat({ label, value, icon }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1 bg-white rounded border border-slate-50">{icon}</div>
      <div className="leading-none">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-[11px] font-black text-slate-800 italic uppercase tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}

function MetricBox({ icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/5 transition-all">
      <div className="p-2 bg-slate-800 rounded shadow-md border border-slate-700">{icon}</div>
      <div>
        <p className="text-lg font-black text-white tracking-tighter leading-none">{value}</p>
        <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-500 mt-0.5">{label}</p>
      </div>
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
        <CardHeader className="p-4 border-b border-slate-50 flex flex-row items-center justify-between">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#1E293B] text-white text-[8px] font-black uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-2.5">Date / Time</th>
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
            <DetailBox label="Event Time" value={`${formatSafeDate(selectedLog.event_time, 'MMM d, yyyy')} ${formatSafeDate(selectedLog.event_time, 'h:mm a')}`} />
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
          <div className="overflow-x-auto">
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

function formatSafeDate(value: any, pattern: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
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
