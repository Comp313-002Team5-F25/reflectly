// serverless/api/chat.js
import { z } from 'zod';
import { applyCors, readJson } from './_lib/cors.js';
import { connectDB } from './_lib/db.js';
import { Message } from './_lib/models.js';
import { paraphraseAndProbe } from './_lib/gemini.mjs';

const ChatSchema = z.object({
  sessionId: z.string().min(6),
  text: z.string().min(1).max(2000),
  tone: z.enum(['calm', 'neutral', 'upbeat']).optional(),
  intent: z.enum(['go_deep', 'solve']).optional(),
});

export default async function handler(req, res) {
  // CORS + preflight
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    // 🔴 this was missing before
    const body = await readJson(req);
    const parse = ChatSchema.safeParse(body);
    if (!parse.success) {
      res.status(400).json({ error: 'BAD_REQUEST', issues: parse.error.issues });
      return;
    }

    const GEMINI = (process.env.GEMINI_API_KEY || '').trim();
    if (!GEMINI) {
      res.status(500).json({ error: 'NO_GEMINI_KEY' });
      return;
    }

    // make sure we can write messages
    await connectDB();

    const { sessionId, text, tone = 'neutral', intent = 'go_deep' } = parse.data;

    // store user message
    await Message.create({ sessionId, role: 'user', content: text });

    // pull short history
    const recent = await Message.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();
    const history = recent.reverse().map((m) => ({ role: m.role, content: m.content }));

    // call Gemini (your mjs version)
    const out = await paraphraseAndProbe(GEMINI, text, history, { tone, intent });

    // store AI bubble text like your express version
    const bubbleParts = [out.paraphrase];
    if (intent === 'solve' && out.actionSteps?.length) {
      bubbleParts.push(
        '',
        'Next steps:',
        ...out.actionSteps.map((s) => `• ${s}`)
      );
    }
    if (out.followUp) {
      bubbleParts.push('', `Q: ${out.followUp}`);
    }
    if (out.tags?.length) {
      bubbleParts.push('', '— ' + out.tags.join(' · '));
    }

    await Message.create({
      sessionId,
      role: 'ai',
      content: bubbleParts.join('\n').trim(),
    });

    res.status(200).json(out);
  } catch (err) {
    console.error('[serverless /api/chat] fatal', err);
    res.status(500).json({
      paraphrase: 'I might be having trouble responding right now.',
      followUp: 'Would you like to try again or share more in a different way?',
      actionSteps: [],
      tags: ['Transparency'],
      error: true,
      // forward debug for your frontend
      providerMessage: String(err?.message || err),
    });
  }
}
