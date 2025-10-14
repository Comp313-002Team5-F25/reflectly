import { applyCors, readJson } from '../_lib/cors.js';
import { summarize } from '../_lib/gemini.mjs';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const body = await readJson(req);
    const transcript = Array.isArray(body?.transcript) ? body.transcript : [];

    if (!transcript.length) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        hint: 'Send { transcript: [{role:"user"|"ai", content:"..."}] }'
      });
      return;
    }

    const out = await summarize((process.env.GEMINI_API_KEY || '').trim(), transcript);
    res.status(200).json(out);
  } catch (e) {
    console.error('[Summary error]', e);
    res.status(500).json({ error: 'SUMMARY_ERROR' });
  }
}
