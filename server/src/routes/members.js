import { Router } from 'express';
import { pool, HttpError } from '../db.js';
import { requireAdmin, asyncH } from '../middleware/auth.js';

const r = Router();

function clean(body) {
  const name = String(body.full_name ?? '').trim();
  if (!name) throw new HttpError(400, 'Họ và tên không được để trống');
  if (name.length > 100) throw new HttpError(400, 'Họ và tên tối đa 100 ký tự');
  const status = body.status ?? 'active';
  if (!['active', 'inactive'].includes(status)) throw new HttpError(400, 'Trạng thái không hợp lệ');
  const joined = body.joined_date || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(joined)) throw new HttpError(400, 'Ngày tham gia không hợp lệ');
  return { full_name: name, avatar_url: body.avatar_url?.trim() || null, joined_date: joined, status };
}

const inCurrentRound = async (id) => {
  const [x] = await pool.query(
    `SELECT 1 FROM round_members rm JOIN rounds r ON r.id = rm.round_id
     WHERE rm.user_id = ? AND r.status='in_progress' LIMIT 1`, [id]);
  return x.length > 0;
};

r.get('/', asyncH(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT u.*, EXISTS(SELECT 1 FROM draw_results d WHERE d.user_id = u.id AND d.status='confirmed') AS has_received,
            EXISTS(SELECT 1 FROM round_members m WHERE m.user_id = u.id) AS has_history
     FROM users u ORDER BY u.id`);
  res.json(rows);
}));

r.post('/', requireAdmin, asyncH(async (req, res) => {
  const d = clean(req.body);
  const [ins] = await pool.query(
    'INSERT INTO users (full_name, avatar_url, joined_date, status) VALUES (?,?,?,?)',
    [d.full_name, d.avatar_url, d.joined_date, d.status]);
  res.status(201).json({ id: ins.insertId, ...d });
}));

r.put('/:id', requireAdmin, asyncH(async (req, res) => {
  const id = Number(req.params.id);
  const d = clean(req.body);
  const [[cur]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!cur) throw new HttpError(404, 'Không tìm thấy thành viên');
  if (cur.status === 'active' && d.status === 'inactive' && (await inCurrentRound(id)))
    throw new HttpError(409, 'Thành viên đang thuộc vòng chưa hoàn thành, không thể chuyển sang Không hoạt động');
  await pool.query(
    'UPDATE users SET full_name=?, avatar_url=?, joined_date=?, status=? WHERE id=?',
    [d.full_name, d.avatar_url, d.joined_date, d.status, id]);
  res.json({ id, ...d });
}));

r.delete('/:id', requireAdmin, asyncH(async (req, res) => {
  const id = Number(req.params.id);
  const [[u]] = await pool.query('SELECT id FROM users WHERE id = ?', [id]);
  if (!u) throw new HttpError(404, 'Không tìm thấy thành viên');
  const [h] = await pool.query(
    `SELECT 1 FROM draw_results WHERE user_id = ? UNION SELECT 1 FROM round_members WHERE user_id = ? LIMIT 1`, [id, id]);
  if (h.length) throw new HttpError(409, 'Thành viên đã có lịch sử tham gia vòng quay, không thể xóa. Hãy chuyển sang "Không hoạt động".');
  await pool.query('DELETE FROM users WHERE id = ?', [id]);
  res.json({ ok: true });
}));

export default r;
