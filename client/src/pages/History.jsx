import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api, { dateTime, errMsg, money } from '../api';
import Avatar from '../components/Avatar';
import { useApp } from '../context';

const STATUS = { confirmed: 'Đã xác nhận', pending: 'Chờ xác nhận', cancelled: 'Đã hủy' };

export default function History() {
  const { toast } = useApp();
  const [f, setF] = useState({ search: '', round: '', month: '', year: '', status: '', sort: 'desc' });
  const [rows, setRows] = useState(null);
  const [rounds, setRounds] = useState([]);
  useEffect(() => { api.get('/rounds').then((r) => setRounds(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
      api.get('/history', { params }).then((r) => setRows(r.data)).catch((e) => toast(errMsg(e), 'err'));
    }, 250);
    return () => clearTimeout(t);
  }, [f, toast]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const year = new Date().getFullYear();
  return (
    <>
      <div className="page-head"><h1>Lịch sử nhận quỹ</h1><span className="chip">{rows?.length ?? 0} bản ghi</span></div>
      <div className="card filters">
        <div className="search"><Search size={16} /><input placeholder="Tìm theo tên thành viên" value={f.search} onChange={set('search')} /></div>
        <select value={f.round} onChange={set('round')}><option value="">Tất cả vòng</option>{rounds.map((r) => <option key={r.id} value={r.round_number}>Vòng {r.round_number}</option>)}</select>
        <select value={f.month} onChange={set('month')}><option value="">Tất cả tháng</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>Tháng {i + 1}</option>)}</select>
        <select value={f.year} onChange={set('year')}><option value="">Tất cả năm</option>{[year + 1, year, year - 1, year - 2].map((y) => <option key={y}>{y}</option>)}</select>
        <select value={f.status} onChange={set('status')}><option value="">Mọi trạng thái</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={f.sort} onChange={set('sort')}><option value="desc">Mới nhất trước</option><option value="asc">Cũ nhất trước</option></select>
      </div>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>STT</th><th>Thành viên</th><th>Vòng</th><th>Tháng/năm nhận</th><th>Ngày giờ quay</th><th>Số tiền</th><th>Trạng thái</th></tr></thead>
          <tbody>
            {rows?.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td><div className="cell-user"><Avatar name={r.full_name} url={r.avatar_url} size={30} />{r.full_name}</div></td>
                <td>Vòng {r.round_number} · lượt {r.order_no}</td>
                <td>{r.received_month ? `${r.received_month}/${r.received_year}` : '—'}</td>
                <td>{dateTime(r.drawn_at)}</td>
                <td>{money(r.amount)}</td>
                <td><span className={`badge ${r.status}`}>{STATUS[r.status]}</span></td>
              </tr>
            ))}
            {rows && !rows.length && <tr><td colSpan="7" className="muted">Không có bản ghi phù hợp bộ lọc.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="note">Lịch sử chỉ đọc: kết quả đã xác nhận không thể sửa hay xóa.</p>
    </>
  );
}
