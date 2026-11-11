import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Disc3, Users, History, Repeat2, Settings, Menu, X, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../context';
import Modal from './Modal';
import { errMsg } from '../api';

const NAV = [
  ['/', 'Dashboard', LayoutDashboard], ['/spin', 'Vòng quay', Disc3], ['/members', 'Thành viên', Users],
  ['/history', 'Lịch sử nhận quỹ', History], ['/rounds', 'Quản lý vòng', Repeat2], ['/settings', 'Cài đặt', Settings],
];

function LoginModal({ onClose }) {
  const { login, toast } = useApp();
  const [f, setF] = useState({ username: '', password: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await login(f.username, f.password); toast('Đã đăng nhập quản trị viên'); onClose(); }
    catch (er) { toast(errMsg(er), 'err'); } finally { setBusy(false); }
  };
  return (
    <Modal title="Đăng nhập quản trị viên" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Tên đăng nhập<input autoFocus value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
        <label>Mật khẩu<input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button className="btn primary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </Modal>
  );
}

export default function Layout() {
  const { isAdmin, logout } = useApp();
  const [open, setOpen] = useState(false);
  const [login, setLogin] = useState(false);
  return (
    <div className="shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><Disc3 size={26} /><span>Quỹ Anh Em</span></div>
        <nav>
          {NAV.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
              <Icon size={19} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          {isAdmin
            ? <button className="btn ghost full" onClick={logout}><LogOut size={16} />Đăng xuất</button>
            : <button className="btn ghost full" onClick={() => setLogin(true)}><LogIn size={16} />Quản trị viên</button>}
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
          <div className="spacer" />
          {isAdmin && <span className="chip admin"><ShieldCheck size={15} />Quản trị viên</span>}
        </header>
        <main className="content"><Outlet /></main>
      </div>
      {login && <LoginModal onClose={() => setLogin(false)} />}
    </div>
  );
}
