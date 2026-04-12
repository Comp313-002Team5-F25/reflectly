// serverless/src/index.js
import fetch from 'node-fetch';

app.get('/api/diag/gemini', async (_req, res) => {
  try {
    const key = (process.env.GEMINI_API_KEY || '').trim();

    if (!key) {
      return res.status(500).json({
        ok: false,
        reason: 'NO_KEY',
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`;

    const r = await fetch(url, { method: 'GET' });

    let json = {};
    try {
      json = await r.json();
    } catch {
      json = {};
    }

    if (!r.ok) {
      return res.status(r.status).json({
        ok: false,
        reason: 'GEMINI_REQUEST_FAILED',
        status: r.status,
        statusText: r.statusText,
        json,
      });
    }

    const names = Array.isArray(json.models)
      ? json.models.map((m) => m.name)
      : [];

    return res.json({
      ok: true,
      count: names.length,
      names,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      reason: 'SERVER_ERROR',
      error: String(e),
    });
  }
});