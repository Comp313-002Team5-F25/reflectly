import { applyCors, readJson } from '../_lib/cors.js';
import { runTurn } from '../_lib/gemini.mjs';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  const t0 = Date.now();
  try {
    const body = await readJson(req);
    const sessionId = String(body.sessionId || '').trim();
    const text = String(body.text || '').trim();
    const tone = body.tone || 'neutral';
    const intent = body.intent || 'go_deep';

    if (!sessionId || !text) {
      res.status(400).json({ error: 'BAD_REQUEST' });
      return;
    }

    // basic safety
    const crisis = /suicide|kill myself|harm myself|overdose|end it/i.test(text);
    if (crisis) {
      const paraphrase = "It sounds like you're going through intense pain.";
      const followUp = "Would you be willing to contact immediate support? I can share options.";
      const tags = ["Empathic Calibration","Transparency"];
      res.status(200).json({ paraphrase, followUp, actionSteps: [], tags, latencyMs: Date.now()-t0 });
      return;
    }

    const out = await runTurn((process.env.GEMINI_API_KEY||'').trim(), {
      text, history: [], tone, intent
    });

    // one combined bubble is built client-side; we just return parts
    res.status(200).json({ ...out, latencyMs: Date.now() - t0 });
  } catch (err) {
    console.error('[Gemini error]', {
      name: err?.name,
      status: err?.status,
      statusText: err?.statusText,
      message: String(err?.message || err),
      errorDetails: err?.errorDetails,
      raw: err?.raw?.slice?.(0, 200),
    });
    res.status(200).json({
      paraphrase: 'I might be having trouble responding right now.',
      followUp: 'Would you like to try again or share more in a different way?',
      actionSteps: [],
      tags: ['Transparency'],
      latencyMs: Date.now() - t0,
      error: true,
      provider: 'google',
      providerStatus: err?.status ?? null,
      providerStatusText: err?.statusText ?? null,
      providerMessage: String(err?.message || ''),
    });
  }
}
