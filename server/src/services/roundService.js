import crypto from 'node:crypto';
import { pool, tx, HttpError } from '../db.js';

const TZ = () => process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

export function nowParts(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ(), year: 'numeric', month: 'numeric' })
    .formatToParts(date);
  return {
    month: Number(p.find((x) => x.type === 'month').value),
    year: Number(p.find((x) => x.type === 'year').value),
  };
}

export async function getSettings(conn = pool) {
  const [rows] = await conn.query('SELECT setting_key k, setting_value v FROM settings');
  const s = Object.fromEntries(rows.map((r) => [r.k, r.v]));
  return {
    monthly_contribution: Number(s.monthly_contribution ?? 0),
    group_size: Number(s.group_size ?? 7),
  };
}

/** Trạng thái đầy đủ của 1 vòng (dùng cho trang quay + dashboard). */
export async function buildRoundState(conn, round) {
  const [participants] = await conn.query(
    `SELECT u.id, u.full_name, u.avatar_url FROM round_members rm
     JOIN users u ON u.id = rm.user_id WHERE rm.round_id = ? ORDER BY u.id`, [round.id]);
  const [draws] = await conn.query(
    `SELECT dr.id, dr.round_id, dr.user_id, dr.order_no, dr.status, dr.amount, dr.drawn_at,
            dr.confirmed_at, dr.received_month, dr.received_year, u.full_name, u.avatar_url
     FROM draw_results dr JOIN users u ON u.id = dr.user_id
     WHERE dr.round_id = ? AND dr.status IN ('pending','confirmed') ORDER BY dr.order_no`, [round.id]);
  const confirmed = draws.filter((d) => d.status === 'confirmed');
  const pending = draws.find((d) => d.status === 'pending') || null;
  const taken = new Set(draws.map((d) => d.user_id));
  const eligible = participants.filter((p) => !taken.has(p.id)); // cùng thứ tự ORDER BY u.id như lúc quay
  return {
    round, participants, confirmed, pending, eligible,
    total: round.total_slots,
    receivedCount: confirmed.length,
    canDraw: round.status === 'in_progress' && !pending && eligible.length > 0,
  };
}

export async function getCurrentState() {
  const [[round]] = await pool.query(
    `SELECT * FROM rounds ORDER BY (status='in_progress') DESC, round_number DESC LIMIT 1`);
  const settings = await getSettings();
  const [[{ n: activeMembers }]] = await pool.query("SELECT COUNT(*) n FROM users WHERE status='active'");
  const base = {
    settings, activeMembers,
    canStartNewRound: (!round || round.status === 'completed') && activeMembers === settings.group_size,
  };
  if (!round) return { ...base, round: null };
  return { ...base, ...(await buildRoundState(pool, round)) };
}

/** Bắt đầu vòng mới (admin). */
export async function createRound() {
  return tx(async (c) => {
    const settings = await getSettings(c);
    const [active] = await c.query("SELECT id FROM rounds WHERE status='in_progress' FOR UPDATE");
    if (active.length) throw new HttpError(409, 'Vòng hiện tại chưa hoàn thành');
    const [members] = await c.query("SELECT id FROM users WHERE status='active' ORDER BY id FOR UPDATE");
    if (members.length !== settings.group_size)
      throw new HttpError(400, `Cần đúng ${settings.group_size} thành viên đang hoạt động (hiện có ${members.length})`);
    const [[{ next }]] = await c.query('SELECT COALESCE(MAX(round_number),0)+1 AS next FROM rounds');
    const [r] = await c.query(
      'INSERT INTO rounds (round_number, total_slots, contribution_amount) VALUES (?,?,?)',
      [next, members.length, settings.monthly_contribution]);
    for (const m of members)
      await c.query('INSERT INTO round_members (round_id, user_id) VALUES (?,?)', [r.insertId, m.id]);
    return { id: r.insertId, round_number: next };
  });
}

/** Quay: backend chọn ngẫu nhiên bằng CSPRNG, khóa dòng round để tuần tự hóa. */
export async function drawNext(roundId) {
  return tx(async (c) => {
    const [[round]] = await c.query('SELECT * FROM rounds WHERE id = ? FOR UPDATE', [roundId]);
    if (!round) throw new HttpError(404, 'Không tìm thấy vòng');
    if (round.status !== 'in_progress') throw new HttpError(409, 'Vòng này đã hoàn thành');
    const [pend] = await c.query(
      "SELECT id FROM draw_results WHERE round_id = ? AND status='pending' FOR UPDATE", [roundId]);
    if (pend.length) throw new HttpError(409, 'Đang có kết quả chờ xác nhận');
    const [eligible] = await c.query(
      `SELECT u.id, u.full_name, u.avatar_url FROM round_members rm JOIN users u ON u.id = rm.user_id
       WHERE rm.round_id = ? AND rm.user_id NOT IN
         (SELECT user_id FROM draw_results WHERE round_id = ? AND status IN ('pending','confirmed'))
       ORDER BY u.id`, [roundId, roundId]);
    if (!eligible.length) throw new HttpError(409, 'Không còn thành viên nào chưa nhận');
    const winner = eligible[crypto.randomInt(eligible.length)];
    const [[{ n }]] = await c.query(
      "SELECT COUNT(*) n FROM draw_results WHERE round_id = ? AND status='confirmed'", [roundId]);
    const amount = Number(round.contribution_amount) * round.total_slots;
    const [ins] = await c.query(
      "INSERT INTO draw_results (round_id, user_id, order_no, status, amount) VALUES (?,?,?,'pending',?)",
      [roundId, winner.id, n + 1, amount]);
    const [[result]] = await c.query(
      `SELECT dr.*, u.full_name, u.avatar_url FROM draw_results dr JOIN users u ON u.id = dr.user_id
       WHERE dr.id = ?`, [ins.insertId]);
    return { result, eligible, total: round.total_slots, roundNumber: round.round_number };
  });
}

async function lockPending(c, roundId, resultId) {
  const [[round]] = await c.query('SELECT * FROM rounds WHERE id = ? FOR UPDATE', [roundId]);
  if (!round) throw new HttpError(404, 'Không tìm thấy vòng');
  const [[pending]] = await c.query(
    "SELECT * FROM draw_results WHERE round_id = ? AND status='pending' FOR UPDATE", [roundId]);
  if (!pending) throw new HttpError(409, 'Không có kết quả nào đang chờ xác nhận');
  if (resultId && Number(resultId) !== pending.id) throw new HttpError(409, 'Kết quả không còn hiệu lực');
  return { round, pending };
}

export async function confirmResult(roundId, resultId) {
  return tx(async (c) => {
    const { round, pending } = await lockPending(c, roundId, resultId);
    const { month, year } = nowParts();
    await c.query(
      `UPDATE draw_results SET status='confirmed', confirmed_at = NOW(), received_month = ?, received_year = ?
       WHERE id = ?`, [month, year, pending.id]);
    const [[{ n }]] = await c.query(
      "SELECT COUNT(*) n FROM draw_results WHERE round_id = ? AND status='confirmed'", [roundId]);
    const roundCompleted = n >= round.total_slots;
    if (roundCompleted)
      await c.query("UPDATE rounds SET status='completed', completed_at = NOW() WHERE id = ?", [roundId]);
    return { resultId: pending.id, roundCompleted, roundNumber: round.round_number };
  });
}

export async function cancelResult(roundId, resultId) {
  return tx(async (c) => {
    const { pending } = await lockPending(c, roundId, resultId);
    await c.query("UPDATE draw_results SET status='cancelled', cancelled_at = NOW() WHERE id = ?", [pending.id]);
    return { resultId: pending.id };
  });
}
