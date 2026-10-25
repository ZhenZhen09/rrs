import { useEffect, useRef, useState } from 'react';
import { Clock3, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type Revision = { effective_date: string; start_time: string; end_time: string; grace_minutes: number; actor_id: string };
type AutomaticShiftClose = { enabled: boolean; changed_at: string | null; changed_by: string | null };
type ReviewRider = { session_id: string; rider_id: string; rider_name: string; end_time: string; active_task_count_at_end: number; current_active_tasks: number };

export function ShiftHours({ onOpenAttendance }: { onOpenAttendance: () => void }) {
  const [current, setCurrent] = useState<Revision | null>(null);
  const [pending, setPending] = useState<Revision | null>(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('19:00');
  const [graceMinutes, setGraceMinutes] = useState('15');
  const [automaticShiftClose, setAutomaticShiftClose] = useState<AutomaticShiftClose>({ enabled: true, changed_at: null, changed_by: null });
  const [savingAutomaticShiftClose, setSavingAutomaticShiftClose] = useState(false);
  const automaticShiftCloseRequest = useRef(false);
  const [review, setReview] = useState<ReviewRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/shift-schedule', { credentials: 'include' }).then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load shift hours');
        return body;
      }),
      fetch('/api/shift-schedule/cutoff-review', { credentials: 'include' }).then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load cutoff review');
        return body;
      }),
    ]).then(([schedule, cutoff]) => {
      if (!active) return;
      setCurrent(schedule.current);
      setPending(schedule.pending);
      setDate(schedule.date);
      setStartTime(schedule.pending?.start_time || schedule.current?.start_time || '');
      setEndTime(schedule.pending?.end_time || schedule.current?.end_time || '19:00');
      setGraceMinutes(String(schedule.pending?.grace_minutes ?? schedule.current?.grace_minutes ?? 15));
      setAutomaticShiftClose(schedule.automatic_shift_close || { enabled: true, changed_at: null, changed_by: null });
      setReview(cutoff.riders || []);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load shift hours'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleAutomaticShiftClose = async (enabled: boolean) => {
    if (automaticShiftCloseRequest.current) return;
    automaticShiftCloseRequest.current = true;
    setSavingAutomaticShiftClose(true);
    try {
      const response = await fetch('/api/shift-schedule/automatic-close', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Failed to update automatic shift close');
      setAutomaticShiftClose(body.automatic_shift_close);
      toast.success(`Automatic shift close ${enabled ? 'enabled' : 'disabled'}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Failed to update automatic shift close');
    } finally {
      automaticShiftCloseRequest.current = false;
      setSavingAutomaticShiftClose(false);
    }
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!startTime || !endTime || startTime >= endTime) {
      setError('Choose a start time earlier than the end time.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/shift-schedule', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: startTime, end_time: endTime, grace_minutes: Number(graceMinutes) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Failed to save shift hours');
      setPending(body.schedule);
      toast.success(`Shift hours saved for ${body.schedule.effective_date}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to save shift hours');
    } finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
    <header>
      <div className="flex items-center gap-2 text-slate-900"><Clock3 aria-hidden="true" size={20} /><h1 className="text-xl font-bold">Shift Hours</h1></div>
      <p className="mt-1 text-sm text-slate-600">Daily schedule for all riders · Philippine time (UTC+08:00)</p>
    </header>
    {loading ? <p role="status" className="text-sm text-slate-600">Loading shift hours…</p> : <>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Today’s shift hours</h2>
        <p className="mt-1 text-sm text-slate-700">{current ? `${current.start_time}–${current.end_time} · effective since ${current.effective_date}` : 'No shift schedule is active yet.'}</p>
        {pending && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Starts {pending.effective_date}: {pending.start_time}–{pending.end_time}. This schedule repeats daily until changed.</p>}
        <form onSubmit={save} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-800">Earliest shift start
              <input aria-label="Earliest shift start" required type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </label>
            <label className="block text-sm font-medium text-slate-800">Automatic shift end
              <input aria-label="Automatic shift end" required type="time" value={endTime} onChange={event => setEndTime(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </label>
          </div>
          <label className="block text-sm font-medium text-slate-800">Start grace period (minutes)
            <input aria-label="Start grace period" required type="number" min="0" max="120" value={graceMinutes} onChange={event => setGraceMinutes(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            <span className="mt-1 block text-xs font-normal text-slate-500">Riders can start only during this period after the scheduled start time. Default: 15 minutes.</span>
          </label>
          <p className="text-sm text-slate-600">Changes saved today ({date || 'Philippine time'}) take effect tomorrow and repeat daily until changed. At the automatic shift end, all open shifts close, including shifts with unfinished tasks. Riders can access assigned tasks again when their next shift begins.</p>
          <button type="submit" disabled={saving} className="min-h-11 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save daily schedule'}</button>
        </form>
      </section>
      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-semibold text-amber-950">Automatic Shift Closing</h2><p className="mt-1 max-w-2xl text-sm text-amber-900">When this is ON, the system automatically ends open rider shifts at the scheduled end time. When it is OFF, open shifts stay open until the rider or an admin ends them.</p><p className="mt-2 text-xs text-amber-800">Warning: keep this ON for normal operation. Turning it OFF can leave shifts open indefinitely. {automaticShiftClose.changed_at ? `Last changed: ${automaticShiftClose.changed_at}` : 'Currently using the default setting: ON.'}</p></div>
          <button type="button" role="switch" aria-checked={automaticShiftClose.enabled} aria-label="Automatic Shift Closing" disabled={savingAutomaticShiftClose} onClick={() => void toggleAutomaticShiftClose(!automaticShiftClose.enabled)} className={`relative min-h-11 min-w-28 rounded-full px-3 text-sm font-bold transition ${automaticShiftClose.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-500 text-white'} disabled:opacity-60`}><span>{automaticShiftClose.enabled ? 'ON · Turn off' : 'OFF · Turn on'}</span></button>
        </div>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-2 text-amber-900"><AlertTriangle size={18} aria-hidden="true" /><h2 className="font-semibold">Cutoff follow-up</h2></div>
        <p className="mt-1 text-sm text-amber-900">Unfinished tasks remain assigned and visible to admins for review.</p>
        {review.length ? <ul className="mt-3 space-y-2">{review.map(rider => <li key={rider.session_id} className="rounded-lg bg-white p-3 text-sm text-slate-800">{rider.rider_name}: {rider.active_task_count_at_end} unfinished at cutoff, {rider.current_active_tasks} still active</li>)}</ul>
          : <p className="mt-3 text-sm text-amber-900">No riders need cutoff follow-up today.</p>}
        <button type="button" onClick={onOpenAttendance} className="mt-3 min-h-11 rounded-lg border border-amber-500 px-4 text-sm font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Open Attendance</button>
      </section>
    </>}
  </div>;
}
