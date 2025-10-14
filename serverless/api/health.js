import { applyCors } from '../../_lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;

  res.status(200).json({
    ok: true,
    model: process.env.GEMINI_MODEL || 'auto',
    time: new Date().toISOString()
  });
}
