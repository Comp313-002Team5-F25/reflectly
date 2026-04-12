import { runTurn } from './_lib/gemini.mjs';

export default async function handler(req, res) {
  try {
    const out = await runTurn(process.env.GEMINI_API_KEY, {
      text: "Say 'ok' in JSON with keys paraphrase and followUp only.",
      history: [], tone: 'neutral', intent: 'go_deep'
    });
    return res.status(200).json(out);
  } catch (e) {
    console.error('[ping-gemini]', e);
    return res.status(500).json({ error: true, message: String(e?.message || e) });
  }
}
