import { pool } from '../db';
import analytics from '../routes/analytics';

async function main() {
  // Run from server/ to use the same .env and pool configuration as the backend.
  // This executes only SELECT queries; it does not seed or modify the database.
  const layer = (analytics as any).stack.find((item: any) => item.route?.path === '/weekly-schedule');
  const response = {
    code: 200,
    status(code: number) { this.code = code; return this; },
    json(body: any) {
      if (this.code !== 200) throw new Error(`Weekly route returned ${this.code}: ${body.error}`);
      console.log('Complete weekly route:', { status: this.code, weekStart: body.weekStart, rows: body.requests.length, unique: new Set(body.requests.map((row: any) => row.request_id)).size });
    },
  };
  const weeks = process.argv.slice(2);
  if (!weeks.length) throw new Error('Supply one or more weekStart dates (YYYY-MM-DD).');
  for (const weekStart of weeks) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) throw new Error('Invalid weekStart date');
    const [expected] = await pool.query<any[]>(`SELECT COUNT(*) AS total FROM delivery_requests
      WHERE delivery_date >= ? AND delivery_date < DATE_ADD(?, INTERVAL 7 DAY)`, [weekStart, weekStart]);
    response.json = (body: any) => {
      if (response.code !== 200) throw new Error(`Weekly route returned ${response.code}`);
      const unique = new Set(body.requests.map((row: any) => row.request_id)).size;
      if (unique !== expected[0].total || body.requests.length !== unique) throw new Error('Weekly totals do not reconcile');
      console.log('Verified complete route:', { status: response.code, weekStart, rows: body.requests.length, expected: expected[0].total, unique });
    };
    await layer.route.stack[0].handle({ query: { weekStart } }, response);
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
