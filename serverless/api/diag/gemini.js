import { applyCors } from '../../../_lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    const hint = process.env.GEMINI_MODEL || '(auto)';
    const r = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${key}`);
    const ok = r.ok;
    const models = ok ? (await r.json())?.models?.slice(0, 8).map(m => m.name) : [];
    res.status(200).json({ ok: true, keySet: Boolean(key), listOk: ok, modelHint: hint, models });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
}
