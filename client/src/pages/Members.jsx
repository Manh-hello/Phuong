import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Lock } from 'lucide-react';
import api, { errMsg } from '../api';
import Avatar from '../components/Avatar';
import Modal from '../components/Modal';
import { useApp } from '../context';

const today = () => new Date().toISOString().slice(0, 10);

function MemberForm({ initial, onClose, onSaved }) {
  const { toast } = useApp();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      if (f.id) await api.put(`/members/${f.id}`, f); else await api.post('/members', f);
      toast('Đã lưu thành viên'); onSaved();
    } catch (er) { toast(errMsg(er), 'err'); } finally { setBusy(false); }
  };
  return (
    <Modal title={f.id ? 'Sửa thành viên' : 'Thêm thành viên'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Họ và tên<input required maxLength={100} value={f.full_name} onChange={set('full_name')} autoFocus /></label>
        <label>Ảnh đại diện (URL, không bắt buộc)<input value={f.avatar_url || ''} onChange={set('avatar_url')} placeholder="https://…" /></label>
        <label>Ngày tham gia<input type="date" required value={f.joined_date} onChange={set('joined_date')} /></label>
        <label>Trạng thái<select value={f.status} onChange={set('status')}><option value="active">Đang hoạt động</option><option value="inactive">Không hoạt động</option></select></label>
        <button className="btn primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
      </form>
    </Modal>
  );
}

export default function Members() {
  const { isAdmin, toast } = useApp();
  const [list, setList] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = useCallback(() => api.get('/members').then((r) => setList(r.data)).catch((e) => toast(errMsg(e), 'err')), [toast]);
  useEffect(() => { load(); }, [load]);

  const del = async (m) => {
    if (!window.confirm(`Xóa thành viên "${m.full_name}"?`)) return;
    try { await api.delete(`/members/${m.id}`); toast('Đã xóa thành viên'); load(); } catch (e) { toast(errMsg(e), 'err'); }
  };
  if (!list) return <p className="muted">Đang tải…</p>;
  return (
    <>
      <div className="page-head"><h1>Thành viên</h1>
        {isAdmin && <button className="btn primary" onClick={() => setEdit({ full_name: '', avatar_url: '', joined_date: today(), status: 'active' })}><Plus size={17} />Thêm thành viên</button>}</div>
      {!isAdmin && <p className="note"><Lock size={14} /> Đăng nhập quản trị viên để thêm, sửa, xóa thành viên.</p>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Thành viên</th><th>Ngày tham gia</th><th>Trạng thái</th><th>Quỹ vòng này</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td><div className="cell-user"><Avatar name={m.full_name} url={m.avatar_url} />{m.full_name}</div></td>
                <td>{m.joined_date}</td>
                <td><span className={`badge ${m.status}`}>{m.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}</span></td>
                <td>{m.has_received ? <span className="badge confirmed">Đã có lịch sử nhận</span> : <span className="muted">—</span>}</td>
                {isAdmin && <td className="actions">
                  <button className="icon-btn" onClick={() => setEdit(m)} aria-label="Sửa"><Pencil size={16} /></button>
                  <button className="icon-btn danger" onClick={() => del(m)} aria-label="Xóa" disabled={!!m.has_history} title={m.has_history ? 'Đã có lịch sử, không thể xóa' : 'Xóa'}><Trash2 size={16} /></button>
                </td>}
              </tr>
            ))}
            {!list.length && <tr><td colSpan="6" className="muted">Chưa có thành viên. Hãy thêm thành viên đầu tiên.</td></tr>}
          </tbody>
        </table>
      </div>
      {edit && <MemberForm initial={{ ...edit, avatar_url: edit.avatar_url || '' }} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </>
  );
}
