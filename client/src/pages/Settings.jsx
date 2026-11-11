import { useEffect, useState } from 'react';
import { Save, Lock } from 'lucide-react';
import api, { errMsg, money } from '../api';
import { useApp } from '../context';

export default function Settings() {
  const { isAdmin, toast } = useApp();
  const [f, setF] = useState(null);
  useEffect(() => { api.get('/settings').then((r) => setF(r.data)).catch((e) => toast(errMsg(e), 'err')); }, [toast]);
  if (!f) return <p className="muted">Đang tải…</p>;
  const save = async (e) => {
    e.preventDefault();
    try { const { data } = await api.put('/settings', f); setF(data); toast('Đã lưu cài đặt'); } catch (er) { toast(errMsg(er), 'err'); }
  };
  return (
    <>
      <div className="page-head"><h1>Cài đặt</h1></div>
      <form className="card form narrow" onSubmit={save}>
        <label>Số tiền mỗi thành viên đóng mỗi tháng (VND)
          <input type="number" min="0" step="1000" disabled={!isAdmin} value={f.monthly_contribution} onChange={(e) => setF({ ...f, monthly_contribution: Number(e.target.value) })} /></label>
        <label>Số thành viên mỗi vòng
          <input type="number" min="2" max="50" disabled={!isAdmin} value={f.group_size} onChange={(e) => setF({ ...f, group_size: Number(e.target.value) })} /></label>
        <p className="muted">Người trúng nhận <b>{money(f.monthly_contribution * f.group_size)}</b> mỗi tháng. Thay đổi chỉ áp dụng cho vòng mới.</p>
        {isAdmin ? <button className="btn primary"><Save size={16} />Lưu cài đặt</button>
          : <p className="note"><Lock size={14} /> Đăng nhập quản trị viên để thay đổi cài đặt.</p>}
      </form>
    </>
  );
}
