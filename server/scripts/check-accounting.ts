import { pool } from '../db';
import analytics from '../routes/analytics';
import requestRoutes from '../routes/requests';
import { ACCOUNTING_BUCKETS, ACCOUNTING_BUCKET_SQL, buildRequestAccounting, getAccountingBucket } from '../utils/requestAccounting';

// SELECT-only integration check. Run from server/ so the app's database config is used.
async function invoke(router: any, path: string, query: Record<string, string>) {
  let body: any;
  const response = {
    code: 200,
    status(code: number) { this.code = code; return this; },
    json(value: any) { body = value; return this; },
  };
  const route = router.stack.find((layer: any) => layer.route?.path === path)?.route;
  if (!route) throw new Error(`Missing route ${path}`);
  await route.stack[route.stack.length - 1].handle({ query, user: { role: 'admin', id: 'accounting-verification' } }, response);
  if (response.code !== 200) throw new Error(`${path} returned ${response.code}`);
  return body;
}
function assertCounts(actual: any, expected: ReturnType<typeof buildRequestAccounting>, label: string) {
  for (const key of [...ACCOUNTING_BUCKETS, 'total', 'done', 'overdue', 'difference'] as const) {
    if (Number(actual[key]) !== expected[key]) throw new Error(`${label}: ${key} does not reconcile`);
  }
}

async function main() {
  const [months] = await pool.query<any[]>(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS total
    FROM delivery_requests GROUP BY month ORDER BY month DESC`);
  const full = await invoke(requestRoutes, '/', { all: 'true', limit: '100' });
  const globalCounts = await invoke(requestRoutes, '/counts', {});
  const allCounts = buildRequestAccounting(full.data);
  assertCounts(globalCounts, allCounts, 'Global dispatch');
  const allSummary = await invoke(analytics, '/summary-stats', { scope: 'all' });
  assertCounts(allSummary.counts, allCounts, 'All-date Analytics');
  const allExport = await invoke(analytics, '/export-csv', { scope: 'all' });
  if (allExport.length !== allCounts.total) throw new Error('Incomplete all-date Analytics export');
  if (full.meta.total !== full.data.length || new Set(full.data.map((row: any) => row.request_id)).size !== full.meta.total) throw new Error('Incomplete or duplicate dispatch records');
  console.log('All-date dispatch:', allCounts);
  for (const month of months) {
    if (!month.month) continue;
    const query = { monthYear: month.month };
    const summary = await invoke(analytics, '/summary-stats', query);
    const ledger = buildRequestAccounting(summary.requests);
    assertCounts(summary.counts, ledger, `${month.month} summary`);
    if (ledger.total !== Number(month.total)) throw new Error('Missing monthly database records');
    const dispatch = await invoke(requestRoutes, '/', { ...query, all: 'true' });
    const dispatchCounts = await invoke(requestRoutes, '/counts', query);
    assertCounts(buildRequestAccounting(dispatch.data), ledger, `${month.month} dispatch ledger`);
    assertCounts(dispatchCounts, ledger, `${month.month} dispatch counters`);
    const ids = (rows: any[]) => rows.map(row => row.request_id).sort().join(',');
    const exportRows = await invoke(analytics, '/export-csv', query);
    if (ids(dispatch.data) !== ids(summary.requests) || ids(exportRows) !== ids(summary.requests)) throw new Error('Ledger request IDs differ');
    const trend = await invoke(analytics, '/monthly-trend', query);
    const trendMonth = trend.find((row: any) => row.month_key === month.month);
    if (Number(trendMonth?.completed) !== ledger.completed || Number(trendMonth?.total_tasks) !== ledger.total) throw new Error('Trend does not reconcile');
    for (const path of ['/department-allocation', '/request-categories']) {
      const groups = await invoke(analytics, path, query);
      if (groups.reduce((sum: number, row: any) => sum + Number(row.volume), 0) !== ledger.total) throw new Error(`${path} missing rows`);
    }
    const reasons = await invoke(analytics, '/failure-reasons', query);
    if (reasons.reduce((sum: number, row: any) => sum + Number(row.count), 0) !== ledger.failed) throw new Error('Failure reasons incomplete');
    console.log('Verified monthly Main Stats / Dispatch / export / charts:', month.month, 'total:', ledger.total, 'difference:', ledger.difference);
  }
  const statuses = [null, '', 'pending', 'approved', 'submitted_waiting', 'returned_for_revision', 'cancelled', 'disapproved', 'failed', 'delivered', 'custom'];
  const deliveries = [null, '', 'pending', 'assigned', 'in_progress', 'in_transit', 'picked_up', 'pending_review', 'completed', 'delivered', 'failed', 'cancelled', 'custom'];
  const fixtures = statuses.flatMap(status => deliveries.map(delivery_status => ({ status, delivery_status })));
  const [classification] = await pool.query<any[]>(`SELECT status, delivery_status, (${ACCOUNTING_BUCKET_SQL}) AS bucket FROM (
    ${fixtures.map(() => 'SELECT ? AS status, ? AS delivery_status').join(' UNION ALL ')}
  ) AS fixtures`, fixtures.flatMap(row => [row.status, row.delivery_status]));
  for (const row of classification) if (row.bucket !== getAccountingBucket(row)) throw new Error('SQL/browser classification mismatch');
  console.log('SQL/browser classification parity:', classification.length, 'status combinations');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
