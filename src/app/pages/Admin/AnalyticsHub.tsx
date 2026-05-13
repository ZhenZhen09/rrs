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
  Truck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../components/ui/utils';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import { useData } from '../../context/DataContext';

// Helper for vibrant colors
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#ef4444', '#14b8a6'];

export function AnalyticsHub() {
  const { fetchWithAuth } = useData();
  const [timeframe, setTimeframe] = useState('Real-time');
  const [deptData, setDeptData] = useState<any[]>([]);
  const [urgencyData, setUrgencyData] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [peakHourData, setPeakHourData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [forecastDay, setForecastDay] = useState('');
  const [summaryStats, setSummaryStats] = useState<any>({ 
    counts: { total: 0, completed: 0, in_transit: 0, pending: 0, failed: 0 }, 
    avgTime: 0,
    onTimeRate: 87,
    utilization: 76
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [riderPerformance, setRiderPerformance] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [locationInsights, setLocationInsights] = useState<any>({ pickups: [], dropoffs: [] });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const tf = timeframe.toLowerCase();
        const urls = [
          `/api/analytics/department-allocation?timeframe=${tf}`,
          `/api/analytics/urgency-inflation?timeframe=${tf}`,
          `/api/analytics/hotspots?timeframe=${tf}`,
          `/api/analytics/peak-hours?timeframe=${tf}`,
          `/api/analytics/forecast?timeframe=${tf}`,
          `/api/analytics/summary-stats?timeframe=${tf}`,
          `/api/requests?limit=10&timeframe=${tf}`,
          `/api/analytics/rider-performance?timeframe=${tf}`,
          `/api/analytics/exceptions?timeframe=${tf}`,
          `/api/analytics/location-insights?timeframe=${tf}`
        ];

        const results = await Promise.all(urls.map(url => fetchWithAuth(url)));
        const [
          deptRes, urgencyRes, hotspotsRes, peakRes, forecastRes, summaryRes, recentRes, riderRes, exceptionRes, locationRes
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

      } catch (error) {
        console.error("Failed to load analytics data", error);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, [timeframe, fetchWithAuth]);

  const handleExportPDF = () => {
    window.print();
  };

  const mapCenter: [number, number] = hotspots.length > 0 
    ? [Number(hotspots[0].lat), Number(hotspots[0].lng)] 
    : [14.5995, 120.9842];

  const completionRate = summaryStats.counts.total > 0 ? ((summaryStats.counts.completed / summaryStats.counts.total) * 100).toFixed(1) : "0";

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
            <div className="bg-slate-100 p-0.5 rounded-lg flex gap-0.5 border border-slate-200/50">
              {['Real-time', 'Daily', 'Weekly'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setTimeframe(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all", 
                    t === timeframe ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <Button 
              onClick={handleExportPDF}
              className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-lg px-4 h-8 text-[9px] uppercase tracking-widest gap-1.5"
            >
              <Download size={14} />
              EXPORT
            </Button>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <SummaryKPI label="Total Traffic" value={summaryStats.counts.total} icon={<ClipboardList size={14} />} color="#64748b" trend={[20, 35, 25, 45, 30, 55, 40]} />
          <SummaryKPI label="Successful" value={summaryStats.counts.completed} icon={<CheckCircle2 size={14} />} color="#00B14F" trend={[15, 25, 20, 35, 25, 45, 38]} />
          <SummaryKPI label="Active Now" value={summaryStats.counts.in_transit} icon={<Truck size={14} />} color="#0ea5e9" trend={[5, 8, 4, 10, 6, 12, 9]} />
          <SummaryKPI label="Awaiting" value={summaryStats.counts.pending} icon={<Clock size={14} />} color="#f59e0b" trend={[10, 15, 12, 18, 14, 20, 15]} />
          <SummaryKPI label="Exceptions" value={summaryStats.counts.failed} icon={<XCircle size={14} />} color="#ef4444" trend={[2, 4, 1, 3, 2, 5, 2]} />
        </div>

        {/* Vitals Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-white rounded-lg p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">System Performance Index</h3>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black tracking-tighter text-slate-800">{completionRate}%</span>
                  <span className="text-[#00B14F] font-black text-[8px] uppercase flex items-center gap-0.5">
                    <ArrowUpRight size={10} /> +2.4%
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-6">
                <SmallStat label="On-Time Rate" value={`${summaryStats.onTimeRate}%`} icon={<Zap size={12} className="text-blue-500" />} />
                <SmallStat label="Avg Response" value={`${Number(summaryStats.avgTime || 0).toFixed(1)}h`} icon={<Clock size={12} className="text-amber-500" />} />
                <SmallStat label="Utilization" value={`${summaryStats.utilization}%`} icon={<TrendingUp size={12} className="text-[#00B14F]" />} />
              </div>
            </div>
            <div className="w-full md:w-48 h-16 bg-slate-50 rounded-lg border border-slate-100 p-2">
               <ResponsiveContainer width="100%" height="100%">
                 <AreaChart data={[30, 45, 35, 60, 45, 75, 65].map(v => ({v}))}>
                   <Area type="monotone" dataKey="v" stroke="#00B14F" strokeWidth={2} fillOpacity={0.1} fill="#00B14F" />
                 </AreaChart>
               </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-slate-900 rounded-lg p-4 text-white flex flex-col justify-center gap-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Zap size={40} /></div>
            <h4 className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">Command Center</h4>
            <p className="text-sm font-black tracking-tight leading-tight uppercase italic">Optimal Flow</p>
            <p className="text-[9px] font-bold text-slate-400 leading-tight">No bottlenecks detected in core zones.</p>
          </div>
        </div>

        {/* Transaction Log */}
        <Card className="rounded-lg border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-4 border-b border-slate-50 flex flex-row items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded text-indigo-600">
                <ClipboardList size={16} />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 leading-none">Transaction Log</CardTitle>
                <CardDescription className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Audit trail</CardDescription>
              </div>
            </div>
            <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
              Live: {summaryStats.counts.total} Records
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#1E293B] text-white text-[8px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-4 py-2.5">ID</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Requester</th>
                    <th className="px-3 py-2.5">Route</th>
                    <th className="px-3 py-2.5">Rider</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Urgency</th>
                  </tr>
                </thead>
                <tbody className="text-[9px] font-bold text-slate-600 divide-y divide-slate-50">
                  {recentRequests.map((req) => (
                    <tr key={req.request_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-2 text-slate-900 font-black">#{req.request_id.slice(-6).toUpperCase()}</td>
                      <td className="px-3 py-2">{format(new Date(req.delivery_date), 'MMM d')}</td>
                      <td className="px-3 py-2">
                        <p className="text-slate-800 font-black leading-none">{req.requester_name}</p>
                        <p className="text-[7px] text-slate-400 uppercase mt-0.5">{req.requester_department}</p>
                      </td>
                      <td className="px-3 py-2">
                        <span className="truncate block max-w-[120px]">{req.pickup_location?.address.split(',')[0]} → {req.dropoff_location?.address.split(',')[0]}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-slate-800 text-white flex items-center justify-center text-[7px] font-black">
                            {req.assigned_rider_name?.charAt(0) || '-'}
                          </div>
                          <span className="font-black text-slate-700">{req.assigned_rider_name || '---'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className="rounded text-[7px] bg-slate-100 text-slate-600 border-none font-black uppercase h-4 px-1.5">
                          {req.delivery_status || 'pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className={cn(
                          "px-1.5 py-0.5 rounded text-[7px] font-black uppercase inline-block tracking-tighter",
                          req.urgency_level === 'Urgent' ? "bg-rose-600 text-white" : 
                          req.urgency_level === 'High' ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                        )}>
                          {req.urgency_level}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="rounded-lg border-none shadow-sm bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center gap-2">
                <PieChart size={14} className="text-blue-500" />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Status Allocation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="h-48 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={deptData} innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {deptData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{fontSize: '8px', fontWeight: '900'}}/>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-none shadow-sm bg-white overflow-hidden flex flex-col">
            <CardHeader className="p-4 pb-0">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500" />
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-800">Alert Center</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="overflow-hidden rounded border border-slate-100">
                <table className="w-full text-[9px] font-bold text-left border-collapse">
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {exceptions.slice(0, 3).map((ex, i) => (
                      <tr key={i} className="h-8">
                        <td className="px-3 font-black text-slate-900">#{ex.request_id.slice(-4).toUpperCase()}</td>
                        <td className="px-3 text-rose-600 uppercase font-black text-[7px] tracking-widest">STALLED</td>
                      </tr>
                    ))}
                    {exceptions.length === 0 && (
                      <tr><td className="px-3 py-6 text-center text-slate-300 font-black uppercase tracking-widest italic text-[8px]">Clean Signal</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="bg-[#1E293B] rounded-lg p-4 space-y-4 shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
            <MetricBox icon={<Clock className="text-[#38BDF8]" size={14} />} label="Avg. Del" value={`${Number(summaryStats.avgTime || 0).toFixed(1)}h`} />
            <MetricBox icon={<TrendingUp className="text-[#4ADE80]" size={14} />} label="On-Time" value={`${summaryStats.onTimeRate}%`} />
            <MetricBox icon={<AlertTriangle className="text-[#FB923C]" size={14} />} label="Failures" value={`${summaryStats.counts.total > 0 ? Math.round((summaryStats.counts.failed / summaryStats.counts.total) * 100) : 0}%`} />
            <MetricBox icon={<Bike className="text-[#818CF8]" size={14} />} label="Rider Util" value={`${summaryStats.utilization}%`} />
          </div>
        </div>

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
