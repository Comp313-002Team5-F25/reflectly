import { connectDB } from './_lib/db.js';

export default async function handler(req, res) {
  try {
    const conn = await connectDB();
    const state = conn?.connection?.readyState; // 1=connected
    return res.status(state === 1 ? 200 : 500).json({ ok: state === 1, state });
  } catch (e) {
    console.error('[dbcheck]', e);
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
