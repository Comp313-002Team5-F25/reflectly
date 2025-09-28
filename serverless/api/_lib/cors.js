// serverless/api/_lib/cors.js
export function applyCors(req, res) {
  const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.origin || '';

  // If you set "*" in CORS_ORIGIN, we’ll allow all.
  let value = '';
  if (allowed.includes('*')) value = '*';
  else if (allowed.includes(origin)) value = origin;
  else if (allowed.length === 1) value = allowed[0]; // fallback to first

  if (value) res.setHeader('Access-Control-Allow-Origin', value);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // cache preflight

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // handled preflight
  }
  return false;
}
