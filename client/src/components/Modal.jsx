import { X } from 'lucide-react';

export default function Modal({ title, onClose, children, locked }) {
  return (
    <div className="modal-wrap" onMouseDown={(e) => { if (!locked && e.target === e.currentTarget) onClose?.(); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>{title}</h3>
          {onClose && <button className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={18} /></button>}
        </div>
        {children}
      </div>
    </div>
  );
}
