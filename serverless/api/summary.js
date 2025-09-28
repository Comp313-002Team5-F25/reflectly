import { z } from 'zod';
import { connectDB } from './_lib/db.js';
import { Message } from './_lib/models.js';
import { summarize } from './_lib/gemini.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const Schema = z.object({ sessionId: z.string().min(6) });
  const parse = Schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'BAD_REQUEST' });

  try {
    await connectDB();
    const { sessionId } = parse.data;
    const GEMINI = (process.env.GEMINI_API_KEY || '').trim();
    if (!GEMINI) return res.status(500).json({ error: 'NO_GEMINI_KEY' });

    const msgs = await Message.find({ sessionId }).sort({ createdAt: 1 }).limit(20).lean();
    const out = await summarize(GEMINI, msgs);
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SUMMARY_ERROR' });
  }
}
