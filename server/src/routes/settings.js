import { Router } from 'express';
import { pool, HttpError } from '../db.js';
import { requireAdmin, asyncH } from '../middleware/auth.js';
import { getSettings } from '../services/roundService.js';

const r = Router();
r.get('/', asyncH(async (_req, res) => res.json(await getSettings())));
r.put('/', requireAdmin, asyncH(async (req, res) => {
  const mc = Number(req.body.monthly_contribution);
  const gs = Number(req.body.group_size);
  if (!Number.isInteger(mc) || mc < 0) throw new HttpError(400, 'Số tiền đóng góp không hợp lệ');
  if (!Number.isInteger(gs) || gs < 2 || gs > 50) throw new HttpError(400, 'Số thành viên mỗi vòng phải từ 2 đến 50');
  const [act] = await pool.query("SELECT 1 FROM rounds WHERE status='in_progress' LIMIT 1");
  const cur = await getSettings();
  if (act.length && gs !== cur.group_size)
    throw new HttpError(409, 'Không đổi số thành viên khi vòng đang diễn ra');
  await pool.query(
    "INSERT INTO settings (setting_key, setting_value) VALUES ('monthly_contribution', ?), ('group_size', ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
    [String(mc), String(gs)]);
  res.json(await getSettings());
}));
export default r;
