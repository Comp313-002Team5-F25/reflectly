import { z } from 'zod';
import { applyCors, readJson } from './_lib/cors.js';
import { connectDB } from './_lib/db.js';
import { Message } from './_lib/models.js';
import { summarize } from './_lib/gemini.mjs';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const body = await readJson(req);
  const Schema = z.object({ sessionId: z.string().min(6) });
  const parse = Schema.safeParse(body);
  if (!parse.success) return res.status(400).json({ error: 'BAD_REQUEST' });

  try {
    await connectDB();
    const GEMINI = (process.env.GEMINI_API_KEY || '').trim();
    if (!GEMINI) return res.status(500).json({ error: 'NO_GEMINI_KEY' });

    const msgs = await Message.find({ sessionId: parse.data.sessionId })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    const out = await summarize(GEMINI, msgs);
    return res.json(out);
  } catch (e) {
    console.error('[summary]', e);
    return res.status(500).json({ error: 'SUMMARY_ERROR' });
  }
}
