import { Router } from 'express';
import { pool } from '../db.js';
import { asyncH } from '../middleware/auth.js';
import { getCurrentState, nowParts } from '../services/roundService.js';

const r = Router();
r.get('/', asyncH(async (_req, res) => {
  const s = await getCurrentState();
  const [[{ n: totalMembers }]] = await pool.query('SELECT COUNT(*) n FROM users');
  const [[{ n: completedRounds }]] = await pool.query("SELECT COUNT(*) n FROM rounds WHERE status='completed'");
  const [[last]] = await pool.query(
    `SELECT dr.*, u.full_name, u.avatar_url, r.round_number FROM draw_results dr
     JOIN users u ON u.id = dr.user_id JOIN rounds r ON r.id = dr.round_id
     WHERE dr.status='confirmed' ORDER BY dr.confirmed_at DESC, dr.id DESC LIMIT 1`);
  const received = s.confirmed || [];
  const pend = s.pending ? [{ id: s.pending.user_id, full_name: s.pending.full_name, avatar_url: s.pending.avatar_url, pending: true }] : [];
  res.json({
    totalMembers, activeMembers: s.activeMembers, completedRounds,
    currentMonth: nowParts(),
    round: s.round || null,
    total: s.round?.total_slots ?? 0,
    receivedCount: received.length,
    remainingCount: (s.round?.total_slots ?? 0) - received.length,
    received,
    notReceived: [...(s.eligible || []), ...pend],
    eligible: s.eligible || [],
    pending: s.pending || null,
    canDraw: !!s.canDraw,
    lastReceiver: last || null,
    settings: s.settings,
  });
}));
export default r;
