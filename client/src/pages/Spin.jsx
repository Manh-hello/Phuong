import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { Sparkles, PartyPopper, AlertCircle, Eye, Play } from 'lucide-react';
import api, { errMsg } from '../api';
import Wheel from '../components/Wheel';
import ResultModal from '../components/ResultModal';
import Avatar from '../components/Avatar';
import { useApp } from '../context';

function celebrate() {
  const end = Date.now() + 2200;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f8fafc'] });
    confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: ['#3b82f6', '#8b5cf6', '#06b6d4', '#f8fafc'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function Spin() {
  const { toast, isAdmin } = useApp();
  const [state, setState] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [modal, setModal] = useState(null); // kết quả đang hiển thị trong hộp thoại
  const wheel = useRef();
  const lock = useRef(false); // chặn bấm liên tiếp ở client (backend vẫn là lớp bảo vệ chính)

  const load = useCallback(async () => {
    const { data } = await api.get('/rounds/current');
    setState(data); return data;
  }, []);

  useEffect(() => {
    load().then((d) => { if (d.pending) setModal(d.pending); }).catch((e) => toast(errMsg(e), 'err'));
  }, [load, toast]);

  if (!state) return <p className="muted">Đang tải…</p>;
  const { round, eligible = [], pending, canDraw, total = 0, receivedCount = 0 } = state;
  const completed = round?.status === 'completed';

  const spin = async () => {
    if (lock.current || spinning) return;
    lock.current = true; setSpinning(true);
    try {
      const { data } = await api.post(`/rounds/${round.id}/draw`);
      const idx = data.eligible.findIndex((m) => m.id === data.result.user_id);
      // danh sách trả về từ backend khớp danh sách đang hiển thị trên vòng quay
      setState((s) => ({ ...s, pending: data.result, canDraw: false }));
      wheel.current.spinTo(idx, () => { celebrate(); setModal(data.result); setSpinning(false); lock.current = false; });
    } catch (e) {
      toast(errMsg(e), 'err'); setSpinning(false); lock.current = false;
      load().then((d) => { if (d.pending) setModal(d.pending); });
    }
  };

  const confirm = async () => {
    try {
      const { data } = await api.post(`/rounds/${round.id}/confirm`, { resultId: modal.id });
      setModal(null); await load();
      toast(data.roundCompleted ? `Đã hoàn thành vòng ${data.roundNumber}` : 'Đã xác nhận kết quả');
    } catch (e) { toast(errMsg(e), 'err'); await load(); setModal(null); }
  };
  const cancel = async () => {
    try {
      await api.post(`/rounds/${round.id}/cancel`, { resultId: modal.id });
      setModal(null); await load(); toast('Đã hủy kết quả, có thể quay lại');
    } catch (e) { toast(errMsg(e), 'err'); }
  };
  const startRound = async () => {
    try { await api.post('/rounds'); toast('Đã bắt đầu vòng mới'); await load(); } catch (e) { toast(errMsg(e), 'err'); }
  };

  return (
    <>
      <div className="page-head"><h1>Vòng quay</h1>
        {round && <span className="chip">Vòng {round.round_number} · {receivedCount}/{total} đã nhận</span>}</div>

      {!round && (
        <div className="card empty"><AlertCircle size={32} /><h3>Chưa có vòng nào</h3>
          <p className="muted">Quản trị viên cần bắt đầu vòng đầu tiên.</p>
          {isAdmin && <button className="btn primary" onClick={startRound} disabled={!state.canStartNewRound}><Play size={16} />Bắt đầu vòng 1</button>}
          {isAdmin && !state.canStartNewRound && <p className="note">Cần đúng {state.settings.group_size} thành viên đang hoạt động (hiện có {state.activeMembers}).</p>}
          {!isAdmin && <Link to="/members" className="btn ghost">Xem thành viên</Link>}
        </div>
      )}

      {round && (
        <div className="spin-layout">
          <div className="card wheel-card">
            {completed ? (
              <div className="done"><PartyPopper size={54} /><h2>ĐÃ HOÀN THÀNH VÒNG {round.round_number}</h2>
                <p className="muted">Cả {total} thành viên đã nhận quỹ. Vòng quay đã được vô hiệu hóa.</p>
                {isAdmin
                  ? <button className="btn primary big" onClick={startRound} disabled={!state.canStartNewRound}><Play size={18} />BẮT ĐẦU VÒNG {round.round_number + 1}</button>
                  : <p className="note">Chờ quản trị viên bắt đầu vòng tiếp theo.</p>}
                {isAdmin && !state.canStartNewRound && <p className="note">Cần đúng {state.settings.group_size} thành viên đang hoạt động (hiện có {state.activeMembers}).</p>}
              </div>
            ) : (
              <>
                <Wheel ref={wheel} items={eligible} disabled={!canDraw && !spinning} />
                {canDraw && <button className="btn primary big" onClick={spin} disabled={spinning}><Sparkles size={20} />{spinning ? 'ĐANG QUAY…' : 'QUAY NGAY'}</button>}
                {pending && !spinning && (
                  <div className="pending-banner"><AlertCircle size={18} />Có kết quả đang chờ xác nhận: <b>{pending.full_name}</b>
                    <button className="btn ghost sm" onClick={() => setModal(pending)}><Eye size={15} />Xem</button></div>
                )}
              </>
            )}
          </div>

          <div className="card side-list">
            <h3>Chưa nhận ({eligible.length})</h3>
            <ul className="people">
              {eligible.map((m) => <li key={m.id}><Avatar name={m.full_name} url={m.avatar_url} /><span>{m.full_name}</span></li>)}
              {!eligible.length && <li className="muted">Không còn ai trong danh sách quay</li>}
            </ul>
            <h3>Đã nhận ({state.confirmed?.length ?? 0})</h3>
            <ul className="people received">
              {state.confirmed?.map((m) => (
                <li key={m.id}><Avatar name={m.full_name} url={m.avatar_url} /><span>{m.full_name}</span>
                  <em>#{m.order_no} · T{m.received_month}/{m.received_year}</em></li>
              ))}
              {!state.confirmed?.length && <li className="muted">Chưa có ai</li>}
            </ul>
          </div>
        </div>
      )}

      {modal && <ResultModal result={modal} total={total} onConfirm={confirm} onCancel={cancel} onClose={() => setModal(null)} />}
    </>
  );
}
