import { Router } from 'express';
import crypto from 'node:crypto';
import { HttpError } from '../db.js';
import { signToken, requireAdmin, asyncH } from '../middleware/auth.js';

const r = Router();
const safeEq = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

r.post('/login', asyncH(async (req, res) => {
  const { username, password } = req.body || {};
  const okU = safeEq(username ?? '', process.env.ADMIN_USERNAME || 'admin');
  const okP = safeEq(password ?? '', process.env.ADMIN_PASSWORD || 'admin123');
  if (!(okU && okP)) throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');
  res.json({ token: signToken() });
}));
r.get('/me', requireAdmin, (_req, res) => res.json({ role: 'admin' }));
export default r;
