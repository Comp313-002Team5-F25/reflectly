import { z } from 'zod';
import { connectDB } from './_lib/db.js';
import { Message } from './_lib/models.js';
import { runTurn } from './_lib/gemini.js';

const ChatSchema = z.object({
  sessionId: z.string().min(6),
  text: z.string().min(1).max(2000),
  tone: z.enum(['calm','neutral','upbeat']).optional(),
  intent: z.enum(['go_deep','solve']).optional()
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const parse = ChatSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'BAD_REQUEST' });

  const { sessionId, text, tone='neutral', intent='go_deep' } = parse.data;
  const t0 = Date.now();
  const GEMINI = (process.env.GEMINI_API_KEY || '').trim();
  if (!GEMINI) return res.status(500).json({ error: 'NO_GEMINI_KEY' });

  try {
    await connectDB();

    const crisis = /suicide|kill myself|harm myself|overdose|end it/i.test(text);
    await Message.create({ sessionId, role: 'user', content: text });

    if (crisis) {
      const paraphrase = "It sounds like you're going through intense pain.";
      const followUp = "Would you be willing to contact immediate support? I can share options.";
      const tags = ["Empathic Calibration","Transparency"];
      await Message.create({ sessionId, role: 'ai', content: `${paraphrase}\n\nQ: ${followUp}\n\n— ${tags.join(' · ')}` });
      return res.json({ paraphrase, followUp, actionSteps: [], tags, latencyMs: Date.now()-t0 });
    }

    const recent = await Message.find({ sessionId }).sort({ createdAt: -1 }).limit(6).lean();
    const history = recent.reverse().map(m => ({ role: m.role, content: m.content }));

    const out = await runTurn(GEMINI, { text, history, tone, intent });

    // build bubble string (for DB only)
    let bubble = out.paraphrase + '\n\n';
    if (intent === 'solve' && out.actionSteps.length) {
      bubble += 'Next steps:\n' + out.actionSteps.map(s => `• ${s}`).join('\n') + '\n\n';
    }
    if (out.followUp) bubble += `Q: ${out.followUp}\n\n`;
    if (out.tags.length) bubble += '— ' + out.tags.join(' · ');

    await Message.create({ sessionId, role: 'ai', content: bubble.trim() });

    res.json({ ...out, latencyMs: Date.now()-t0 });
  } catch (e) {
    console.error(e);
    res.json({
      paraphrase: 'I might be having trouble responding right now.',
      followUp: 'Want to try again or share more in a different way?',
      actionSteps: [],
      tags: ['Transparency'],
      latencyMs: Date.now()-t0,
      error: true
    });
  }
}
