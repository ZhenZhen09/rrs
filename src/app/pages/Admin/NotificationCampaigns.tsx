import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CalendarClock, Copy, Download, History, Loader2, Pause, Play, Plus, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';

type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
type Campaign = {
  id: string; name: string; notification_title: string; notification_body: string; status: CampaignStatus;
  target_type: string; schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string | null;
  send_time: string; weekdays: number[]; repeat_interval_minutes: number | null; max_sends_per_rider: number;
  destination: string; recipient_count: number; delivery_count: number; sent_count: number; failed_count: number;
  skipped_count: number; pending_count: number; acted_count: number; next_run_at?: string | null; last_run_at?: string | null; recipients?: Rider[];
};
type Rider = { id: string; name: string; email: string };
type Delivery = { id: string; rider_name: string; rider_email: string; scheduled_at: string; attempt_number: number; status: string; failure_reason?: string | null; sent_at?: string | null; action_type?: string | null; acted_at?: string | null };

const weekdayOptions = [
  [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [7, 'Sun'],
] as const;
const targetOptions = [
  ['all_riders', 'All riders'], ['selected_riders', 'Selected riders'], ['no_attendance', 'No attendance'],
  ['present', 'Present riders'], ['absent_or_leave', 'Absent or on leave'], ['on_duty', 'On-duty riders'],
  ['off_duty', 'Off-duty riders'], ['active_tasks', 'Riders with active tasks'], ['overdue_tasks', 'Riders with overdue tasks'],
] as const;
const destinationOptions = [
  ['dashboard', 'Rider dashboard'], ['shift', 'Shift controls'], ['today', "Today's tasks"], ['overdue', 'Overdue tasks'], ['inbox', 'Inbox'],
] as const;

const philippineDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
type CampaignForm = {
  name: string; notification_title: string; notification_body: string; target_type: string;
  schedule_type: 'immediate' | 'one_time' | 'recurring'; start_date: string; end_date: string; send_time: string;
  weekdays: number[]; repeat_interval_minutes: string; max_sends_per_rider: number; destination: string; rider_ids: string[];
};
const emptyForm = (): CampaignForm => ({
  name: '', notification_title: '', notification_body: '', target_type: 'all_riders', schedule_type: 'one_time',
  start_date: philippineDate(), end_date: '', send_time: '08:00', weekdays: [1, 2, 3, 4, 5], repeat_interval_minutes: '',
  max_sends_per_rider: 1, destination: 'dashboard', rider_ids: [] as string[],
});

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`/api/notification-campaigns${path}`, {
    credentials: 'include', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Campaign request failed');
  return data;
}

export function NotificationCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [testCampaign, setTestCampaign] = useState<Campaign | null>(null);
  const [testRiderId, setTestRiderId] = useState('');
  const [workerHealth, setWorkerHealth] = useState<any>(null);
  const [historyCampaign, setHistoryCampaign] = useState<Campaign | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const createRequestKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const saveInFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignData, riderData, healthData] = await Promise.all([request('/'), request('/riders'), request('/worker-health')]);
      setCampaigns(campaignData);
      setRiders(riderData);
      setWorkerHealth(healthData);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load campaigns'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter(item => item.status === 'active').length,
    draft: campaigns.filter(item => item.status === 'draft').length,
    paused: campaigns.filter(item => item.status === 'paused').length,
  }), [campaigns]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm()); setEditorOpen(true); };
  const openEdit = async (campaign: Campaign) => {
    try {
      const detail: Campaign = await request(`/${campaign.id}`);
      setEditingId(campaign.id);
      setForm({
        name: detail.name, notification_title: detail.notification_title, notification_body: detail.notification_body,
        target_type: detail.target_type, schedule_type: detail.schedule_type, start_date: detail.start_date.slice(0, 10),
        end_date: detail.end_date?.slice(0, 10) || '', send_time: detail.send_time.slice(0, 5), weekdays: detail.weekdays || [],
        repeat_interval_minutes: detail.repeat_interval_minutes == null ? '' : String(detail.repeat_interval_minutes),
        max_sends_per_rider: detail.max_sends_per_rider, destination: detail.destination,
        rider_ids: detail.recipients?.map(rider => rider.id) || [],
      });
      setEditorOpen(true);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to open campaign'); }
  };

  const saveCampaign = async () => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    try {
      const payload = { ...form, end_date: form.end_date || null,
        repeat_interval_minutes: form.repeat_interval_minutes === '' ? null : Number(form.repeat_interval_minutes) };
      const fingerprint = JSON.stringify(payload);
      let idempotencyKey: string | undefined;
      if (!editingId) {
        if (createRequestKey.current?.fingerprint !== fingerprint) {
          createRequestKey.current = { fingerprint, key: crypto.randomUUID() };
        }
        idempotencyKey = createRequestKey.current.key;
      }
      await request(editingId ? `/${editingId}` : '/', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(payload),
        ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}) });
      toast.success(editingId ? 'Campaign updated' : 'Campaign created');
      createRequestKey.current = null;
      setEditorOpen(false);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save campaign'); }
    finally { saveInFlight.current = false; setSaving(false); }
  };

  const perform = async (campaign: Campaign, action: string) => {
    if (['cancel', 'delete'].includes(action) && !window.confirm(`${action === 'delete' ? 'Permanently delete' : 'Cancel'} “${campaign.name}”?`)) return;
    try {
      await request(action === 'delete' ? `/${campaign.id}` : `/${campaign.id}/${action}`, { method: action === 'delete' ? 'DELETE' : 'POST' });
      toast.success(`Campaign ${action === 'duplicate' ? 'duplicated' : `${action}d`}`);
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Campaign action failed'); }
  };

  const sendTest = async () => {
    if (!testCampaign || !testRiderId) return;
    setSaving(true);
    try {
      await request(`/${testCampaign.id}/test`, { method: 'POST', body: JSON.stringify({ rider_id: testRiderId }) });
      toast.success('Test notification sent'); setTestCampaign(null); setTestRiderId('');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Test notification failed'); }
    finally { setSaving(false); }
  };

  const openHistory = async (campaign: Campaign) => {
    try { setDeliveries(await request(`/${campaign.id}/deliveries`)); setHistoryCampaign(campaign); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load delivery history'); }
  };

  const exportHistory = async (campaign: Campaign) => {
    try {
      const response = await fetch(`/api/notification-campaigns/${campaign.id}/export`, { credentials: 'include' });
      if (!response.ok) throw new Error('Unable to export delivery history');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = `${campaign.name}-deliveries.csv`; link.click();
      URL.revokeObjectURL(url);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to export delivery history'); }
  };

  return <div className="min-h-full bg-slate-50/60 p-4 sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="flex items-center gap-3 text-2xl font-black text-slate-900"><BellRing className="text-primary" />Notification Campaigns</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Schedule rider notifications and monitor delivery from one place.</p>
          <p className="mt-1 text-xs font-bold text-slate-400">Worker: <span className={workerHealth?.last_status === 'healthy' ? 'text-emerald-600' : 'text-amber-600'}>{workerHealth?.last_status || 'checking'}</span>{workerHealth?.last_completed_at ? ` · ${workerHealth.last_completed_at}` : ''}</p></div>
        <Button onClick={openCreate} className="min-h-11"><Plus className="mr-2 h-4 w-4" />New campaign</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Object.entries(stats).map(([label, value]) => <Card key={label} className="p-4"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-900">{value}</p></Card>)}
      </div>

      {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span className="sr-only">Loading campaigns</span></div>
        : campaigns.length === 0 ? <Card className="p-12 text-center"><BellRing className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-black text-slate-700">No campaigns yet</h2><p className="mt-1 text-sm text-slate-500">Create your first rider notification campaign.</p></Card>
        : <div className="grid gap-4 xl:grid-cols-2">{campaigns.map(campaign => <Card key={campaign.id} className="p-5">
          <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-900">{campaign.name}</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600">{campaign.status}</span></div><p className="mt-1 text-sm font-bold text-slate-700">{campaign.notification_title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{campaign.notification_body}</p></div><CalendarClock className="h-5 w-5 shrink-0 text-slate-400" /></div>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs"><div><span className="font-black text-slate-400">TARGET</span><p className="mt-1 font-bold text-slate-700">{targetOptions.find(([id]) => id === campaign.target_type)?.[1]}</p></div><div><span className="font-black text-slate-400">NEXT SEND</span><p className="mt-1 font-bold text-slate-700">{campaign.next_run_at || `${campaign.start_date.slice(0, 10)} · ${campaign.send_time.slice(0, 5)}`}</p></div><div><span className="font-black text-slate-400">DELIVERY</span><p className="mt-1 font-bold text-slate-700">{campaign.sent_count} sent · {campaign.failed_count} failed · {campaign.skipped_count} skipped · {campaign.pending_count} pending</p></div><div><span className="font-black text-slate-400">ACTION</span><p className="mt-1 font-bold text-slate-700">{campaign.acted_count} acted · {campaign.destination}</p></div></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['draft', 'paused'].includes(campaign.status) && <Button size="sm" variant="outline" onClick={() => void openEdit(campaign)}>Edit</Button>}
            {['draft', 'paused'].includes(campaign.status) && <Button size="sm" onClick={() => void perform(campaign, campaign.status === 'paused' ? 'resume' : 'activate')}><Play className="mr-1 h-3.5 w-3.5" />{campaign.status === 'paused' ? 'Resume' : 'Activate'}</Button>}
            {campaign.status === 'active' && <Button size="sm" variant="outline" onClick={() => void perform(campaign, 'pause')}><Pause className="mr-1 h-3.5 w-3.5" />Pause</Button>}
            <Button size="sm" variant="outline" onClick={() => { setTestCampaign(campaign); setTestRiderId(''); }}><Send className="mr-1 h-3.5 w-3.5" />Test</Button>
            <Button size="sm" variant="outline" onClick={() => void perform(campaign, 'duplicate')}><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
            <Button size="sm" variant="outline" onClick={() => void openHistory(campaign)}><History className="mr-1 h-3.5 w-3.5" />History</Button>
            <Button size="sm" variant="outline" onClick={() => void exportHistory(campaign)}><Download className="mr-1 h-3.5 w-3.5" />Export</Button>
            {!['cancelled', 'completed'].includes(campaign.status) && <Button size="sm" variant="outline" className="text-rose-700" onClick={() => void perform(campaign, 'cancel')}><XCircle className="mr-1 h-3.5 w-3.5" />Cancel</Button>}
            {['draft', 'paused', 'completed', 'cancelled'].includes(campaign.status) && <Button size="sm" variant="outline" className="text-rose-700" onClick={() => void perform(campaign, 'delete')}><XCircle className="mr-1 h-3.5 w-3.5" />Delete</Button>}
          </div>
        </Card>)}</div>}
    </div>

    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{editingId ? 'Edit campaign' : 'Create campaign'}</DialogTitle><DialogDescription>Configure the audience and delivery schedule in Philippine time.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Campaign name"><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} maxLength={120} /></Field>
        <Field label="Notification title"><input value={form.notification_title} onChange={event => setForm({ ...form, notification_title: event.target.value })} maxLength={120} /></Field>
        <Field label="Message" wide><textarea value={form.notification_body} onChange={event => setForm({ ...form, notification_body: event.target.value })} maxLength={500} rows={3} /></Field>
        <Field label="Recipients"><select value={form.target_type} onChange={event => setForm({ ...form, target_type: event.target.value })}>{targetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Destination"><select value={form.destination} onChange={event => setForm({ ...form, destination: event.target.value })}>{destinationOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        {form.target_type === 'selected_riders' && <Field label="Select riders" wide><div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">{riders.map(rider => <label key={rider.id} className="flex min-h-10 items-center gap-2 rounded px-2 hover:bg-slate-50"><input type="checkbox" checked={form.rider_ids.includes(rider.id)} onChange={event => setForm({ ...form, rider_ids: event.target.checked ? [...form.rider_ids, rider.id] : form.rider_ids.filter(id => id !== rider.id) })} /><span className="text-sm font-semibold">{rider.name}</span><span className="text-xs text-slate-400">{rider.email}</span></label>)}</div></Field>}
        <Field label="Schedule"><select value={form.schedule_type} onChange={event => setForm({ ...form, schedule_type: event.target.value as CampaignForm['schedule_type'] })}><option value="immediate">Immediate after activation</option><option value="one_time">One time</option><option value="recurring">Recurring</option></select></Field>
        <Field label="Send time (Asia/Manila)"><input type="time" value={form.send_time} onChange={event => setForm({ ...form, send_time: event.target.value })} /></Field>
        <Field label="Start date"><input type="date" value={form.start_date} onChange={event => setForm({ ...form, start_date: event.target.value })} /></Field>
        <Field label="End date (optional)"><input type="date" value={form.end_date} onChange={event => setForm({ ...form, end_date: event.target.value })} /></Field>
        {form.schedule_type === 'recurring' && <Field label="Weekdays" wide><div className="flex flex-wrap gap-2">{weekdayOptions.map(([value, label]) => <button type="button" key={value} onClick={() => setForm({ ...form, weekdays: form.weekdays.includes(value) ? form.weekdays.filter(day => day !== value) : [...form.weekdays, value] })} className={`min-h-10 rounded-lg border px-3 text-xs font-black ${form.weekdays.includes(value) ? 'border-primary bg-primary text-white' : 'border-slate-200'}`}>{label}</button>)}</div></Field>}
        <Field label="Repeat interval in minutes (optional)"><input type="number" min={5} value={form.repeat_interval_minutes} onChange={event => setForm({ ...form, repeat_interval_minutes: event.target.value })} /></Field>
        <Field label="Maximum sends per rider"><input type="number" min={1} max={20} value={form.max_sends_per_rider} onChange={event => setForm({ ...form, max_sends_per_rider: Number(event.target.value) })} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button><Button disabled={saving} onClick={() => void saveCampaign()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingId ? 'Save changes' : 'Create campaign'}</Button></div>
    </DialogContent></Dialog>

    <Dialog open={Boolean(testCampaign)} onOpenChange={open => { if (!open) setTestCampaign(null); }}><DialogContent><DialogHeader><DialogTitle>Send test notification</DialogTitle><DialogDescription>Select one rider device. This creates an inbox entry marked as a test.</DialogDescription></DialogHeader><Field label="Rider"><select value={testRiderId} onChange={event => setTestRiderId(event.target.value)}><option value="">Select a rider</option>{riders.map(rider => <option key={rider.id} value={rider.id}>{rider.name} — {rider.email}</option>)}</select></Field><div className="flex justify-end"><Button disabled={!testRiderId || saving} onClick={() => void sendTest()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send test</Button></div></DialogContent></Dialog>
    <Dialog open={Boolean(historyCampaign)} onOpenChange={open => { if (!open) setHistoryCampaign(null); }}><DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{historyCampaign?.name} delivery history</DialogTitle><DialogDescription>Latest 500 rider delivery attempts and recorded actions.</DialogDescription></DialogHeader>
      {deliveries.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No deliveries recorded yet.</p> : <div className="space-y-2">{deliveries.map(item => <div key={item.id} className="grid gap-2 rounded-xl border border-slate-100 p-3 text-xs sm:grid-cols-5"><div><p className="font-black text-slate-800">{item.rider_name}</p><p className="text-slate-400">{item.rider_email}</p></div><div><p className="font-black uppercase text-slate-400">Scheduled</p><p>{item.scheduled_at}</p></div><div><p className="font-black uppercase text-slate-400">Result</p><p className="font-bold capitalize">{item.status} · attempt {item.attempt_number}</p></div><div><p className="font-black uppercase text-slate-400">Action</p><p>{item.action_type || 'No action recorded'}</p></div><div><p className="font-black uppercase text-slate-400">Details</p><p className="break-words text-rose-600">{item.failure_reason || item.sent_at || '—'}</p></div></div>)}</div>}
    </DialogContent></Dialog>
  </div>;
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`space-y-1.5 text-xs font-black uppercase tracking-wide text-slate-500 ${wide ? 'sm:col-span-2' : ''}`}><span>{label}</span><div className="[&_input]:min-h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:px-3 [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-slate-200 [&_textarea]:p-3 [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm [&_input]:font-medium [&_select]:font-medium [&_textarea]:font-medium [&_input]:normal-case [&_select]:normal-case [&_textarea]:normal-case">{children}</div></label>;
}

export default NotificationCampaigns;
