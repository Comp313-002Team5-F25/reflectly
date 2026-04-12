// serverless/api/chat.js
import { z } from 'zod';
import { applyCors, readJson } from './_lib/cors.js';
import { connectDB } from './_lib/db.js';
import { Message } from './_lib/models.js';
import { paraphraseAndProbe } from './_lib/gemini.mjs';

export default async function handler(req, res) {
  // CORS + OPTIONS
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  }

  // IMPORTANT: actually read the body
  const body = await readJson(req);

  const Schema = z.object({
    sessionId: z.string().min(6),
    text: z.string().min(1).max(2000),
    tone: z.enum(['calm', 'neutral', 'upbeat']).optional(),
    intent: z.enum(['go_deep', 'solve']).optional(),
  });
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'BAD_REQUEST', details: parsed.error.flatten() });
  }

  const { sessionId, text, tone = 'neutral', intent = 'go_deep' } = parsed.data;

  try {
    await connectDB();

    const GEMINI = (process.env.GEMINI_API_KEY || '').trim();
    if (!GEMINI) {
      return res.status(500).json({ error: 'NO_GEMINI_KEY' });
    }

    // store user msg
    await Message.create({ sessionId, role: 'user', content: text });

    const recent = await Message.find({ sessionId }).sort({ createdAt: -1 }).limit(6).lean();
    const history = recent.reverse().map(m => ({ role: m.role, content: m.content }));

    const out = await paraphraseAndProbe(GEMINI, text, history, { tone, intent });

    // store ai
    const bubble = [
      out.paraphrase,
      intent === 'solve' && out.actionSteps?.length
        ? '\n\nNext steps:\n' + out.actionSteps.map(s => '• ' + s).join('\n')
        : '',
      out.followUp ? '\n\nQ: ' + out.followUp : '',
      out.tags?.length ? '\n\n— ' + out.tags.join(' · ') : '',
    ].join('').trim();

    await Message.create({ sessionId, role: 'ai', content: bubble });

    return res.json(out);
  } catch (err) {
  console.error('[chat]', {
    name: err?.name,
    status: err?.status,
    statusText: err?.statusText,
    message: String(err?.message || err),
    errorDetails: err?.errorDetails
  });
  res.status(200).json({
    paraphrase: 'I might be having trouble responding right now.',
    followUp: 'Would you like to try again or share more in a different way?',
    actionSteps: [],
    tags: ['Transparency'],
    error: true,
    provider: 'google',
    providerStatus: err?.status ?? null,
    providerStatusText: err?.statusText ?? null,
    providerMessage: String(err?.message || '')
  });
}
}
