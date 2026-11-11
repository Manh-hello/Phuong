// Kiểm thử tích hợp. CHẠY TRÊN DATABASE THỬ NGHIỆM: script sẽ tạo vòng và quay hết vòng.
// Yêu cầu: server đang chạy, đã db:seed, chưa có vòng đang dở.
import 'dotenv/config';
const BASE = `http://localhost:${process.env.PORT || 4000}/api`;
let token = '';
const call = async (m, p, body, auth = false) => {
  const r = await fetch(BASE + p, { method: m,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? '✔' : '✘'} ${msg}`); if (!c) fails++; };

token = (await call('POST', '/auth/login', { username: process.env.ADMIN_USERNAME || 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' })).data.token;
ok(!!token, 'Đăng nhập admin');
ok((await call('POST', '/rounds', null, false)).status === 401, 'Tạo vòng không có token bị từ chối');

let cur = (await call('GET', '/rounds/current')).data;
if (!cur.round || cur.round.status === 'completed') {
  const c = await call('POST', '/rounds', null, true);
  ok(c.status === 201, 'Tạo vòng mới'); cur = (await call('GET', '/rounds/current')).data;
}
const rid = cur.round.id;
ok((await call('POST', '/rounds', null, true)).status === 409, 'Không tạo được vòng thứ 2 khi vòng đang diễn ra');

const winners = [];
for (let i = 0; i < cur.total; i++) {
  const burst = await Promise.all(Array.from({ length: 4 }, () => call('POST', `/rounds/${rid}/draw`)));
  const wins = burst.filter((x) => x.status === 201);
  ok(wins.length === 1, `Lượt ${i + 1}: 4 request quay song song → đúng 1 thành công (${wins.length})`);
  const res = wins[0].data.result;
  ok((await call('POST', `/rounds/${rid}/draw`)).status === 409, `Lượt ${i + 1}: không quay tiếp khi chưa xác nhận`);
  const pend = (await call('GET', '/rounds/current')).data.pending;
  ok(pend?.id === res.id, `Lượt ${i + 1}: tải lại vẫn thấy kết quả chờ xác nhận`);
  const conf = await Promise.all([1, 2].map(() => call('POST', `/rounds/${rid}/confirm`, { resultId: res.id })));
  ok(conf.filter((x) => x.status === 200).length === 1, `Lượt ${i + 1}: xác nhận 2 lần song song → đúng 1 thành công`);
  winners.push(res.user_id);
}
ok(new Set(winners).size === cur.total, `${cur.total} lượt quay ra ${new Set(winners).size} người khác nhau`);
const after = (await call('GET', '/rounds/current')).data;
ok(after.round.status === 'completed', 'Vòng tự chuyển sang HOÀN THÀNH');
ok((await call('POST', `/rounds/${rid}/draw`)).status === 409, 'Không quay được khi vòng đã hoàn thành');
console.log(fails ? `\n${fails} kiểm thử THẤT BẠI` : '\nTất cả kiểm thử đạt'); process.exit(fails ? 1 : 0);
