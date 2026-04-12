// serverless/api/health.js
import { applyCors } from './_lib/cors.js';

export default async function handler(req, res) {
  try {
    if (applyCors(req, res)) return;        // handles OPTIONS

    res.status(200).json({
      ok: true,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      time: new Date().toISOString(),
      env: {
        hasKey: !!(process.env.GEMINI_API_KEY || '').trim(),
        hasMongo: !!(process.env.MONGODB_URI || '').trim(),
      }
    });
  } catch (err) {
    // never throw from health; always return JSON so Vercel doesn't 500
    res.status(200).json({ ok: false, error: String(err?.message || err) });
  }
}
