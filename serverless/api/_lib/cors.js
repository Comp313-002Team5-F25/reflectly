const ALLOW = (process.env.CORS_ORIGIN || '').split(',').map(s=>s.trim()).filter(Boolean);
// Example env on Vercel (Production):
// CORS_ORIGIN=https://reflectly-nh3w.vercel.app

export function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOW.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
}
