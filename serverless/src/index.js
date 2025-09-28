// serverless/src/index.js (or wherever your routes are)
import fetch from 'node-fetch'; // if not already available

app.get('/api/diag/gemini', async (_req, res) => {
  try {
    const key = (process.env.GEMINI_API_KEY || '').trim();
    if (!key) return res.status(500).json({ ok:false, reason:'NO_KEY' });

    const r = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${encodeURIComponent(key)}`);
    const json = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok:false, status:r.status, json });

    // return just the names (no secrets)
    const names = Array.isArray(json.models) ? json.models.map(m => m.name) : [];
    res.json({ ok:true, names });
  } catch (e) {
    res.status(500).json({ ok:false, error:String(e) });
  }
});
