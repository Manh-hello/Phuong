import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const dir = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(dir, '../../database/schema.sql'), 'utf8');
const conn = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
});
await conn.query(sql);
console.log('✔ Đã tạo database & bảng');
if (process.argv.includes('--seed')) {
  const names = ['Nguyễn Văn A', 'Trần Văn B', 'Lê Văn C', 'Phạm Văn D', 'Hoàng Văn E', 'Đặng Văn F', 'Vũ Văn G'];
  const [[{ n }]] = await conn.query('SELECT COUNT(*) n FROM users');
  if (n === 0) {
    for (const name of names)
      await conn.query('INSERT INTO users (full_name, joined_date) VALUES (?, CURDATE())', [name]);
    console.log('✔ Đã thêm 7 thành viên mẫu');
  } else console.log('• Bảng users đã có dữ liệu, bỏ qua seed');
}
await conn.end();
