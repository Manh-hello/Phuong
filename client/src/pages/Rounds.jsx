import { useCallback, useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import api, { dateTime, errMsg, money } from '../api';
import { useApp } from '../context';

export default function Rounds() {
  const { isAdmin, toast } = useApp();
  const [rounds, setRounds] = useState(null);
  const [cur, setCur] = useState(null);
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([api.get('/rounds'), api.get('/rounds/current')]);
      setRounds(a.data); setCur(b.data);
    } catch (e) { toast(errMsg(e), 'err'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);
  if (!rounds) return <p className="muted">Đang tải…</p>;

  const start = async () => {
    const n = (rounds[0]?.round_number ?? 0) + 1;
    if (!window.confirm(`Bắt đầu vòng ${n}? Trạng thái nhận của ${cur.settings.group_size} thành viên sẽ được đặt lại, lịch sử vòng cũ vẫn được giữ.`)) return;
    try { await api.post('/rounds'); toast(`Đã bắt đầu vòng ${n}`); load(); } catch (e) { toast(errMsg(e), 'err'); }
  };
  const nextN = (rounds[0]?.round_number ?? 0) + 1;
  const inProgress = rounds[0]?.status === 'in_progress';
  return (
    <>
      <div className="page-head"><h1>Quản lý vòng</h1>
        {isAdmin && <button className="btn primary" onClick={start} disabled={inProgress || !cur?.canStartNewRound}><Play size={16} />Bắt đầu vòng {nextN}</button>}</div>
      {inProgress && <p className="note">Vòng {rounds[0].round_number} đang diễn ra. Chỉ bắt đầu vòng mới khi vòng này hoàn thành.</p>}
      {!inProgress && cur && !cur.canStartNewRound && <p className="note">Cần đúng {cur.settings.group_size} thành viên đang hoạt động để bắt đầu vòng mới (hiện có {cur.activeMembers}).</p>}
      {!isAdmin && <p className="note">Chỉ quản trị viên mới bắt đầu được vòng mới.</p>}
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Vòng</th><th>Trạng thái</th><th>Tiến độ</th><th>Quỹ mỗi tháng</th><th>Bắt đầu</th><th>Hoàn thành</th></tr></thead>
          <tbody>
            {rounds.map((r) => (
              <tr key={r.id}>
                <td>Vòng {r.round_number}</td>
                <td><span className={`badge ${r.status === 'completed' ? 'confirmed' : 'pending'}`}>{r.status === 'completed' ? 'Đã hoàn thành' : 'Đang diễn ra'}</span></td>
                <td>{r.received_count}/{r.total_slots}</td>
                <td>{money(r.contribution_amount * r.total_slots)}</td>
                <td>{dateTime(r.started_at)}</td>
                <td>{dateTime(r.completed_at)}</td>
              </tr>
            ))}
            {!rounds.length && <tr><td colSpan="6" className="muted">Chưa có vòng nào.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
