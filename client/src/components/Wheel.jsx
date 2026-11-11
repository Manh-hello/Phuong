import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#6366f1', '#0ea5e9', '#a855f7', '#14b8a6', '#2563eb', '#7c3aed', '#0891b2'];
const DURATION = 6000; // ms
const R = 200, C = 210;
const pt = (deg, r) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)];

/**
 * Vòng quay chỉ có nhiệm vụ HIỂN THỊ. Người trúng do backend quyết định,
 * `spinTo(index)` chỉ xoay vòng để mũi tên dừng đúng ô của người đó.
 */
const Wheel = forwardRef(function Wheel({ items, size = 420, disabled }, ref) {
  const n = items.length;
  const [rot, setRot] = useState(0);
  const [anim, setAnim] = useState(false);
  const rotRef = useRef(0);
  const timer = useRef();

  // Khi danh sách thay đổi (có người đã nhận) → đặt lại góc, không animation
  useEffect(() => { setAnim(false); rotRef.current = 0; setRot(0); }, [n]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useImperativeHandle(ref, () => ({
    spinTo(index, onDone) {
      const seg = 360 / n;
      const target = (index + 0.5) * seg + (Math.random() - 0.5) * seg * 0.6; // lệch nhẹ trong ô, vẫn nằm trong ô
      const cur = ((rotRef.current % 360) + 360) % 360;
      const delta = ((-target - cur) % 360 + 360) % 360;
      rotRef.current += 360 * 7 + delta;
      setAnim(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setRot(rotRef.current)));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { setAnim(false); onDone?.(); }, DURATION + 150);
    },
  }), [n]);

  const seg = n ? 360 / n : 360;
  return (
    <div className={`wheel-box ${disabled ? 'dim' : ''}`} style={{ width: size, maxWidth: '100%' }}>
      <svg className="pointer" viewBox="0 0 40 50" aria-hidden="true">
        <path d="M20 48 L4 12 A18 18 0 1 1 36 12 Z" fill="#f8fafc" stroke="#0b1020" strokeWidth="3" />
        <circle cx="20" cy="16" r="5" fill="#8b5cf6" />
      </svg>
      <svg viewBox="0 0 420 420" className="wheel"
        style={{ transform: `rotate(${rot}deg)`, transition: anim ? `transform ${DURATION}ms cubic-bezier(0.12, 0.7, 0.08, 1)` : 'none' }}>
        <circle cx={C} cy={C} r={R + 8} fill="#0b1020" stroke="#334155" strokeWidth="2" />
        {n === 0 && <circle cx={C} cy={C} r={R} fill="#1e293b" />}
        {n === 1 && <circle cx={C} cy={C} r={R} fill={COLORS[0]} />}
        {n > 1 && items.map((it, i) => {
          const a0 = i * seg, a1 = (i + 1) * seg;
          const [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R);
          return <path key={it.id} fill={COLORS[i % COLORS.length]} stroke="#0b1020" strokeWidth="2"
            d={`M${C} ${C} L${x0} ${y0} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${x1} ${y1} Z`} />;
        })}
        {items.map((it, i) => {
          const mid = n === 1 ? 0 : (i + 0.5) * seg;
          const label = it.full_name.length > 14 ? it.full_name.slice(0, 13) + '…' : it.full_name;
          return (
            <g key={`t${it.id}`} transform={`rotate(${mid - 90} ${C} ${C})`}>
              <text x={C + R - 16} y={C + 5} textAnchor="end" fill="#fff" fontSize={n > 9 ? 14 : 17} fontWeight="700"
                style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,.25)', strokeWidth: 3 }}>{label}</text>
            </g>
          );
        })}
        <circle cx={C} cy={C} r="34" fill="#0b1020" stroke="#8b5cf6" strokeWidth="4" />
        <circle cx={C} cy={C} r="10" fill="#06b6d4" />
      </svg>
    </div>
  );
});
export default Wheel;
