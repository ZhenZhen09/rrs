import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { pool } from '../../server/db';
import analyticsRoutes from '../../server/routes/analytics';

// Mock the db pool
vi.mock('../../server/db', () => ({
  pool: {
    query: vi.fn(),
  },
}));

// Mock auth middleware to bypass auth for tests
vi.mock('../../server/middleware/auth', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  authorize: () => (req: any, res: any, next: any) => next(),
}));

const app = express();
app.use('/api/analytics', analyticsRoutes);

describe('Analytics Performance Fix: Route Efficiency Decimation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses GROUP BY for location logs to prevent memory overflow on 30-day queries', async () => {
    (pool.query as any).mockResolvedValue([[]]); // Return empty rows

    await request(app).get('/api/analytics/route-efficiency?timeframe=monthly');

    expect(pool.query).toHaveBeenCalledTimes(2);

    const logsQueryCall = (pool.query as any).mock.calls[1][0]; // 2nd query is for location_logs
    
    // Assert the query decimation logic is present
    expect(logsQueryCall).toContain('UNIX_TIMESTAMP(timestamp) DIV 300');
    expect(logsQueryCall).toContain('GROUP BY request_id,');
  });
});
