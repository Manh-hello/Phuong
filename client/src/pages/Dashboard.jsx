import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, CheckCircle2, Clock, CalendarDays, Trophy, Repeat2, Sparkles } from 'lucide-react';
import api, { dateTime, errMsg, money } from '../api';
import Wheel from '../components/Wheel';
import Avatar from '../components/Avatar';
import { useApp } from '../context';

const Stat = ({ icon: Icon, label, value, hint }) => (
  <div className="card stat"><Icon size={22} /><div><div className="stat-v">{value}</div><div className="muted">{label}</div>{hint && <div className="hint">{hint}</div>}</div></div>
);

export default function Dashboard() {
  const { toast } = useApp();
  const [d, setD] = useState(null);
  const wheelRef = useRef();
  useEffect(() => { api.get('/dashboard').then((r) => setD(r.data)).catch((e) => toast(errMsg(e), 'err')); }, [toast]);
  if (!d) return <p className="muted">Đang tải…</p>;
  const pct = d.total ? Math.round((d.receivedCount / d.total) * 100) : 0;
  return (
    <>
      <div className="page-head"><h1>Tổng quan</h1>
        {d.round && <span className="chip">Vòng {d.round.round_number} · {d.round.status === 'completed' ? 'Đã hoàn thành' : 'Đang diễn ra'}</span>}</div>

      <div className="stats">
        <Stat icon={Users} label="Tổng thành viên" value={d.totalMembers} hint={`${d.activeMembers} đang hoạt động`} />
        <Stat icon={CheckCircle2} label="Đã nhận (vòng hiện tại)" value={d.receivedCount} />
        <Stat icon={Clock} label="Chưa nhận" value={d.remainingCount > 0 ? d.remainingCount : 0} />
        <Stat icon={CalendarDays} label="Tháng hiện tại" value={`${d.currentMonth.month}/${d.currentMonth.year}`} />
        <Stat icon={Repeat2} label="Vòng đã hoàn thành" value={d.completedRounds} />
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Tiến độ vòng hiện tại</h3>
          <div className="progress"><div style={{ width: `${pct}%` }} /></div>
          <p className="muted">{d.receivedCount}/{d.total || d.settings.group_size} người đã nhận · {pct}%</p>
          <div className="last">
            <Trophy size={20} />
            {d.lastReceiver
              ? <div><b>{d.lastReceiver.full_name}</b> nhận gần nhất<div className="muted">Vòng {d.lastReceiver.round_number} · {dateTime(d.lastReceiver.confirmed_at)} · {money(d.lastReceiver.amount)}</div></div>
              : <span className="muted">Chưa có ai nhận quỹ</span>}
          </div>
          <div className="two-col">
            <div><h4>Đã nhận</h4><ul className="people">{d.received.map((m) => <li key={m.id}><Avatar name={m.full_name} url={m.avatar_url} size={30} /><span>{m.full_name}</span></li>)}{!d.received.length && <li className="muted">Chưa có</li>}</ul></div>
            <div><h4>Chưa nhận</h4><ul className="people">{d.notReceived.map((m) => <li key={m.id}><Avatar name={m.full_name} url={m.avatar_url} size={30} /><span>{m.full_name}{m.pending ? ' (chờ xác nhận)' : ''}</span></li>)}{!d.notReceived.length && <li className="muted">Chưa có</li>}</ul></div>
          </div>
        </div>

        <div className="card featured">
          <h3>Vòng quay</h3>
          <Wheel ref={wheelRef} items={d.eligible} size={280} disabled={!d.canDraw} />
          <Link to="/spin" className="btn primary"><Sparkles size={18} />{d.canDraw ? 'QUAY NGAY' : d.pending ? 'Xem kết quả chờ xác nhận' : 'Mở vòng quay'}</Link>
        </div>
      </div>
    </>
  );
}
