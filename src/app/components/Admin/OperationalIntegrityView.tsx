import React from 'react';
import { 
  ShieldAlert, 
  Clock, 
  BarChart, 
  Zap, 
  Camera, 
  AlertTriangle, 
  TrendingUp, 
  Users,
  CheckCircle2,
  XCircle,
  GripVertical
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, Legend
} from 'recharts';
import { format } from 'date-fns';

interface OperationalIntegrityViewProps {
  data: {
    tacticalLeaves: any[];
    biasMatrix: any[];
    deviationLog: any[];
    ghostMiles: any[];
    integrityScores: any[];
  } | null;
}

export const OperationalIntegrityView: React.FC<OperationalIntegrityViewProps> = ({ data }) => {
  if (!data) return (
    <div className="h-96 flex flex-col items-center justify-center text-slate-400 space-y-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
        <ShieldAlert size={32} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Assembling Integrity Matrices...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* KPI ROW: INTEGRITY SCORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.integrityScores.slice(0, 4).map((s: any) => (
          <Card key={s.id} className="rounded-2xl border-none shadow-sm bg-white overflow-hidden group">
            <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Rider Integrity</p>
              <Badge className={cn(
                "h-4 px-1.5 text-[8px] font-black uppercase border-none",
                s.score > 80 ? "bg-emerald-100 text-emerald-700" :
                s.score > 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
              )}>
                {s.score > 80 ? 'EXEMPLARY' : s.score > 50 ? 'WATCHLIST' : 'CRITICAL'}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-black text-slate-900 truncate pr-2">{s.name}</h4>
                <span className="text-2xl font-black tracking-tighter text-slate-900">{s.score}%</span>
              </div>
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000",
                    s.score > 80 ? "bg-emerald-500" : s.score > 50 ? "bg-amber-500" : "bg-rose-500"
                  )} 
                  style={{ width: `${s.score}%` }} 
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MATRIX 1: TACTICAL LEAVE CORRELATION */}
        <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                <AlertTriangle size={20} />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Tactical Leave Correlation</CardTitle>
                <CardDescription className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Sched-view to Absence Gap under 60m</CardDescription>
              </div>
            </div>
            <div className="px-3 py-1 bg-rose-900 text-white rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
              {data.tacticalLeaves.length} FLAGS
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-3">Rider</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Time Gap</th>
                    <th className="px-4 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.tacticalLeaves.length > 0 ? data.tacticalLeaves.map((l: any, i: number) => (
                    <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-black text-slate-900 leading-none">{l.rider_name}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Assignment at {format(new Date(l.view_timestamp), 'HH:mm')}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black uppercase h-5">{l.status}</Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-black text-rose-600">{Math.abs(l.gap_minutes)}m</span>
                      </td>
                      <td className="px-4 py-4 max-w-[200px]">
                        <p className="text-[9px] font-bold text-slate-500 italic truncate">"{l.reason || 'No reason provided'}"</p>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-300 font-black uppercase tracking-[0.2em] italic text-[10px]">
                        No tactical signatures detected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* MATRIX 2: DEPARTMENTAL BIAS */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <BarChart size={20} />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Departmental Bias Matrix</CardTitle>
                <CardDescription className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Success Rate % per Dept</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] p-6 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={data.biasMatrix} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="department" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={8} 
                  fontWeight={900} 
                  tick={{ fill: '#64748b' }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 900, color: '#0f172a', marginBottom: '4px' }}
                />
                <Bar dataKey="completion_rate" radius={[0, 4, 4, 0]} barSize={12}>
                  {data.biasMatrix.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.completion_rate < 50 ? '#ef4444' : entry.completion_rate < 85 ? '#6366f1' : '#10b981'} 
                    />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* MATRIX 3: SEQUENCE DEVIATION LOG */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="p-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <GripVertical size={20} />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Sequence Deviation Log</CardTitle>
                <CardDescription className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Unauthorized route swaps & Alibis</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
              {data.deviationLog.length > 0 ? data.deviationLog.map((dev, i) => (
                <div key={i} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                    {dev.rider_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[11px] font-black text-slate-900">{dev.rider_name}</p>
                      <span className="text-[8px] font-black text-slate-400">{format(new Date(dev.timestamp), 'HH:mm • MMM d')}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 leading-relaxed mb-2">"{dev.reason}"</p>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-slate-100 text-slate-500 border-none text-[7px] font-black uppercase tracking-tighter">REQ-#{dev.request_id?.slice(-6).toUpperCase() || 'NA'}</Badge>
                      {dev.has_photo && (
                        <div className="flex items-center gap-1 text-[7px] font-black text-[#00B14F] uppercase">
                          <Camera size={10} /> Photo Alibi Included
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="px-6 py-20 text-center text-slate-300 font-black uppercase tracking-[0.2em] italic text-[10px]">
                  Zero sequence violations recorded
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* MATRIX 4: GHOST MILES EFFICIENCY */}
        <Card className="rounded-3xl border-none shadow-sm bg-white overflow-hidden flex flex-col">
          <CardHeader className="p-6 border-b border-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <Zap size={20} />
              </div>
              <div>
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-900">Ghost Miles / Route Efficiency</CardTitle>
                <CardDescription className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Admin Planned vs Rider Actual</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-3">Rider</th>
                    <th className="px-4 py-3 text-center">Idle Events</th>
                    <th className="px-4 py-3 text-center">Skips</th>
                    <th className="px-6 py-3 text-right">Route Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-bold text-[10px] text-slate-600">
                  {data.ghostMiles.map((r, i) => {
                    const score = Math.round(100 - (r.idle_incidents * 5 + r.approved_skips * 3));
                    return (
                      <tr key={i} className="hover:bg-slate-50 transition-colors h-14">
                        <td className="px-6 font-black text-slate-900">{r.rider_name}</td>
                        <td className="px-4 text-center">
                          <div className={cn(
                            "inline-block px-2 py-0.5 rounded-full",
                            r.idle_incidents > 3 ? "bg-rose-100 text-rose-600" : "bg-slate-100"
                          )}>
                            {r.idle_incidents}
                          </div>
                        </td>
                        <td className="px-4 text-center">{r.approved_skips}</td>
                        <td className="px-6 text-right font-black">
                          <span className={cn(
                            score > 90 ? "text-emerald-600" : score > 70 ? "text-amber-600" : "text-rose-600"
                          )}>
                            {score}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};
