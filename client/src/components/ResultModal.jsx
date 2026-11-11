import { useState } from 'react';
import { CheckCircle2, Trophy, XCircle } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import { dateTime, money } from '../api';
import { useApp } from '../context';

export default function ResultModal({ result, total, onConfirm, onCancel, onClose }) {
  const { isAdmin } = useApp();
  const [busy, setBusy] = useState(false);
  const run = (fn) => async () => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <Modal title="Kết quả vòng quay" onClose={onClose} locked>
      <div className="result">
        <Trophy size={34} className="trophy" />
        <Avatar name={result.full_name} url={result.avatar_url} size={84} />
        <h2>{result.full_name}</h2>
        <p className="muted">được chọn nhận quỹ</p>
        <dl className="kv">
          <div><dt>Thời gian quay</dt><dd>{dateTime(result.drawn_at)}</dd></div>
          <div><dt>Thứ tự nhận trong vòng</dt><dd>{result.order_no} / {total}</dd></div>
          <div><dt>Số tiền</dt><dd>{money(result.amount)}</dd></div>
        </dl>
        <p className="note">Kết quả chưa có hiệu lực cho đến khi được xác nhận. Trong lúc chờ, chưa thể quay tiếp.</p>
        <div className="row center">
          <button className="btn primary" disabled={busy} onClick={run(onConfirm)}><CheckCircle2 size={18} />Xác nhận</button>
          {isAdmin && <button className="btn danger" disabled={busy} onClick={run(onCancel)}><XCircle size={18} />Hủy kết quả</button>}
        </div>
      </div>
    </Modal>
  );
}
