import { connectDB } from './_lib/db.js';
import { Message } from './_lib/models.js';
import { runTurn } from './_lib/gemini.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
  const { sessionId, text, tone='neutral', intent='go_deep' } = req.body || {};
  if (!sessionId || !text) return res.status(400).json({ error: 'BAD_REQUEST' });

  const t0 = Date.now();
  let dbOk = true;
  try { await connectDB(); } catch (e) { dbOk = false; console.error('[DB] connect failed:', e?.message || e); }

  // lightweight crisis screen (don’t block)
  const crisis = /suicide|kill myself|harm myself|overdose|end it/i.test(text);

  try { if (dbOk) await Message.create({ sessionId, role:'user', content: text }); } catch (e) { console.warn('[DB] write user failed:', e?.message); }

  let history = [];
  try {
    if (dbOk) {
      const recent = await Message.find({ sessionId }).sort({ createdAt: -1 }).limit(6).lean();
      history = recent.reverse().map(m => ({ role: m.role, content: m.content }));
    }
  } catch (e) { console.warn('[DB] history read failed:', e?.message); }

  try {
    if (crisis) {
      const paraphrase = "It sounds like you're going through intense pain.";
      const followUp = "Would you be willing to contact immediate support? I can share options.";
      const payload = { paraphrase, followUp, actionSteps: [], tags: ['Empathic Calibration','Transparency'], latencyMs: Date.now()-t0 };
      try { if (dbOk) await Message.create({ sessionId, role:'ai', content: `${paraphrase}\n\nQ: ${followUp}\n\n— Empathic Calibration · Transparency` }); } catch {}
      return res.json(payload);
    }

    const out = await runTurn(process.env.GEMINI_API_KEY, { text, history, tone, intent });

    let bubble = out.paraphrase + '\n\n';
    if (intent === 'solve' && out.actionSteps.length) bubble += 'Next steps:\n' + out.actionSteps.map(s => `• ${s}`).join('\n') + '\n\n';
    if (out.followUp) bubble += `Q: ${out.followUp}\n\n`;
    if (out.tags.length) bubble += '— ' + out.tags.join(' · ');

    try { if (dbOk) await Message.create({ sessionId, role:'ai', content: bubble.trim() }); } catch (e) { console.warn('[DB] write ai failed:', e?.message); }

    return res.json({ ...out, latencyMs: Date.now()-t0 });
  } catch (e) {
    console.error('[CHAT]', e);
    // expose a small error code so you can see it in the browser devtools
    return res.json({
      paraphrase: 'I might be having trouble responding right now.',
      followUp: 'Want to try again or share a bit more in a different way?',
      actionSteps: [],
      tags: ['Transparency'],
      error: true,
      code: (e?.message || 'UNKNOWN').slice(0, 64),
      latencyMs: Date.now() - t0
    });
  }
}
