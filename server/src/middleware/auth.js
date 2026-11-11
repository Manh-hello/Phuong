import jwt from 'jsonwebtoken';
import { HttpError } from '../db.js';

const secret = () => process.env.JWT_SECRET || 'dev-secret';

export const signToken = () => jwt.sign({ role: 'admin' }, secret(), { expiresIn: '12h' });

export function requireAdmin(req, _res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Cần đăng nhập quản trị viên'));
  try {
    const p = jwt.verify(token, secret());
    if (p.role !== 'admin') throw new Error();
    next();
  } catch {
    next(new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'));
  }
}

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
