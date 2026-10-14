import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../../db', () => ({ pool: { query } }));
import analytics from '../analytics';
const app = express();
app.use((req, _res, next) => {
  const role = req.headers['x-test-role'];
  if (role) (req as any).user = { id: 'test-user', role };
  next();
});
app.use('/analytics', analytics);
beforeEach(() => { query.mockReset(); query.mockResolvedValue([[], []]); });
describe('detailed accounting reports authorization', () => {
  for (const path of ['/summary-stats', '/export-csv']) {
    it.each(['rider', 'personnel'])(`${path} rejects %s before querying any request details`, async role => {
      const result = await request(app).get(`/analytics${path}`).set('x-test-role', role);
      expect(result.status).toBe(403);
      expect(query).not.toHaveBeenCalled();
    });
    it(`${path} requires an authenticated user`, async () => {
      expect((await request(app).get(`/analytics${path}`)).status).toBe(401);
      expect(query).not.toHaveBeenCalled();
    });
  }
  it('allows an admin to retrieve the export ledger', async () => {
    expect((await request(app).get('/analytics/export-csv').set('x-test-role', 'admin')).status).toBe(200);
    expect(query).toHaveBeenCalledOnce();
  });
});
