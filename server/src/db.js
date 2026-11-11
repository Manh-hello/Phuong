import mysql from 'mysql2/promise';
import 'dotenv/config';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fund_wheel',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
  dateStrings: ['DATE'],
});

// Mọi TIMESTAMP lưu theo UTC, trình duyệt sẽ tự đổi sang giờ địa phương
pool.pool.on('connection', (c) => c.query("SET time_zone = '+00:00'"));

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Chạy fn trong một transaction; tự commit / rollback. */
export async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
