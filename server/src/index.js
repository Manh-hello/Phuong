import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import auth from './routes/auth.js';
import members from './routes/members.js';
import rounds from './routes/rounds.js';
import history from './routes/history.js';
import dashboard from './routes/dashboard.js';
import settings from './routes/settings.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, max: 20,
  message: { error: 'Đăng nhập sai quá nhiều lần, thử lại sau' } }));
app.use('/api/auth', auth);
app.use('/api/members', members);
app.use('/api/rounds', rounds);
app.use('/api/history', history);
app.use('/api/dashboard', dashboard);
app.use('/api/settings', settings);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Không tìm thấy API' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Dữ liệu bị trùng hoặc vừa có thao tác khác xảy ra, vui lòng tải lại' });
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'Dữ liệu đang được tham chiếu, không thể xóa' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Lỗi máy chủ' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`API chạy tại http://localhost:${port}`));
