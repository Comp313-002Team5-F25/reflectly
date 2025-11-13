export default async function handler(req, res) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || '').trim() || 'auto';
  const cors = (process.env.CORS_ORIGIN || '').trim();

  // CORS (simple)
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  res.json({
    hasKey: !!key,
    keyLen: key.length,
    keyPrefix: key.slice(0, 6), // safe to expose
    model,
    cors,
    node: process.version,
  });
}
