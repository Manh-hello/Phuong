import { Router } from 'express';
import { pool, HttpError } from '../db.js';
import { asyncH } from '../middleware/auth.js';

const r = Router();
const SELECT = `SELECT dr.id, dr.round_id, r.round_number, dr.user_id, u.full_name, u.avatar_url, dr.order_no,
  dr.status, dr.amount, dr.drawn_at, dr.confirmed_at, dr.received_month, dr.received_year
  FROM draw_results dr JOIN users u ON u.id = dr.user_id JOIN rounds r ON r.id = dr.round_id`;

r.get('/', asyncH(async (req, res) => {
  const { search, round, month, year, status, sort } = req.query;
  const where = []; const args = [];
  if (search) { where.push('u.full_name LIKE ?'); args.push(`%${search}%`); }
  if (round) { where.push('r.round_number = ?'); args.push(Number(round)); }
  if (month) { where.push('dr.received_month = ?'); args.push(Number(month)); }
  if (year) { where.push('dr.received_year = ?'); args.push(Number(year)); }
  if (['pending', 'confirmed', 'cancelled'].includes(status)) { where.push('dr.status = ?'); args.push(status); }
  const dir = sort === 'asc' ? 'ASC' : 'DESC';
  const [rows] = await pool.query(
    `${SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY dr.drawn_at ${dir}, dr.id ${dir}`, args);
  res.json(rows);
}));

r.get('/:id', asyncH(async (req, res) => {
  const [[row]] = await pool.query(`${SELECT} WHERE dr.id = ?`, [Number(req.params.id)]);
  if (!row) throw new HttpError(404, 'Không tìm thấy bản ghi');
  res.json(row);
}));

export default r;
