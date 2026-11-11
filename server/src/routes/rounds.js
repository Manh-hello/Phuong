import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { requireAdmin, asyncH } from '../middleware/auth.js';
import * as svc from '../services/roundService.js';

const r = Router();
const limiter = rateLimit({
  windowMs: 10_000, max: Number(process.env.RATE_LIMIT_MAX || 12), standardHeaders: true, legacyHeaders: false,
  message: { error: 'Bạn thao tác quá nhanh, vui lòng thử lại sau vài giây' },
});

r.get('/current', asyncH(async (_req, res) => res.json(await svc.getCurrentState())));

r.get('/', asyncH(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT r.*, (SELECT COUNT(*) FROM draw_results d WHERE d.round_id = r.id AND d.status='confirmed') AS received_count
     FROM rounds r ORDER BY r.round_number DESC`);
  res.json(rows);
}));

r.post('/', requireAdmin, asyncH(async (_req, res) => res.status(201).json(await svc.createRound())));
r.post('/:id/draw', limiter, asyncH(async (req, res) =>
  res.status(201).json(await svc.drawNext(Number(req.params.id)))));
r.post('/:id/confirm', limiter, asyncH(async (req, res) =>
  res.json(await svc.confirmResult(Number(req.params.id), req.body?.resultId))));
r.post('/:id/cancel', requireAdmin, asyncH(async (req, res) =>
  res.json(await svc.cancelResult(Number(req.params.id), req.body?.resultId))));

export default r;
