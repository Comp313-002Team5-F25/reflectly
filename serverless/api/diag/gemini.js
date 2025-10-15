import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  try {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) return res.status(500).json({ ok:false, error:'NO_GEMINI_KEY' });

    const genAI = new GoogleGenerativeAI(key);
    const models = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + encodeURIComponent(key))
      .then(r => r.json())
      .catch(() => null);

    res.json({
      ok: true,
      sdk: '@google/generative-ai',
      modelEnv: process.env.GEMINI_MODEL || null,
      cors: process.env.CORS_ORIGIN || null,
      modelsCount: Array.isArray(models?.models) ? models.models.length : null,
      has25flash: !!models?.models?.some(m => m.name === 'models/gemini-2.5-flash')
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: String(e?.message || e) });
  }
}
