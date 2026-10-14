import { ACCOUNTING_BUCKETS, ACCOUNTING_LABELS, AccountingBucket, buildRequestAccounting } from '../../utils/requestAccounting';
import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function RequestReconciliation({ counts, scope, selected = 'all', onSelect }: {
  counts: ReturnType<typeof buildRequestAccounting>;
  scope: string;
  selected?: AccountingBucket | 'all';
  onSelect: (bucket: AccountingBucket | 'all') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const breakdownId = useId();
  return <section aria-label="Request reconciliation" className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">Request balance</h2>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${counts.difference ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{counts.difference ? 'Needs review' : 'Balanced'}</span>
        </div>
        <p className="mt-1 text-xs text-slate-600">{scope}</p>
      </div>
      <button type="button" aria-expanded={expanded} aria-controls={breakdownId} onClick={() => setExpanded(value => !value)}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
        {expanded ? 'Hide breakdown' : 'View breakdown'}{expanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
      </button>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2 text-sm">
      <button type="button" onClick={() => onSelect('all')} aria-pressed={selected === 'all'} className="min-h-11 rounded px-1 font-bold text-slate-900 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-blue-600">Total requests: {counts.total}</button>
      <span className="text-slate-600">
        Accounted: {counts.accounted} · Difference: {counts.difference}
      </span>
    </div>
    <div id={breakdownId} hidden={!expanded} className="space-y-3">
    <p className="text-sm text-slate-600">Each request belongs to one category. Select a category to filter Transaction Logs below.</p>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {ACCOUNTING_BUCKETS.map(bucket => <button key={bucket} type="button" aria-pressed={selected === bucket}
        aria-label={`${ACCOUNTING_LABELS[bucket]}: ${counts[bucket]}`}
        onClick={() => onSelect(bucket)} className={`min-h-20 rounded-xl border p-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected === bucket ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
        <span>{ACCOUNTING_LABELS[bucket]}: </span><strong className="mt-1 block text-xl tabular-nums">{counts[bucket]}</strong>
      </button>)}
    </div>
    <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Done = completed + failed + cancelled + declined ({counts.done}). Overdue: {counts.overdue} of {counts.active} active; not added again to the total.{counts.other > 0 && ' Unclassified records need review; they are not hidden.'}</p>
    </div>
  </section>;
}
