// serverless/api/diag/gemini.js
import { applyCors } from '../_lib/cors.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  try {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) return res.status(500).json({ ok:false, error:'NO_GEMINI_KEY' });

    const genAI = new GoogleGenerativeAI(key);

    // 1) list models so we see account-visible names
    const listResp = await fetch(
      'https://generativelanguage.googleapis.com/v1/models?key=' + encodeURIComponent(key)
    );
    const listJson = await listResp.json();

    // 2) do a tiny generateContent with a very safe model
    const modelName = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
    let genOk = false, genText = '', genErr = null;
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const out = await model.generateContent('Say "pong" as plain text.');
      genText = out?.response?.text?.() || '';
      genOk = true;
    } catch (e) {
      genErr = {
        name: e?.name, status: e?.status, statusText: e?.statusText,
        message: String(e?.message || e), errorDetails: e?.errorDetails
      };
    }

    res.json({
      ok: true,
      env: {
        hasKey: !!key,
        model: modelName
      },
      listOk: listResp.ok, listCount: Array.isArray(listJson.models) ? listJson.models.length : 0,
      sampleGenerate: { ok: genOk, text: genText },
      sampleError: genErr
    });
  } catch (err) {
    res.status(500).json({
      ok:false,
      error: String(err?.message || err)
    });
  }
}
