// Allow one or more exact origins from env (comma-separated), or * (debug only)
const ALLOW = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);

export function applyCors(req, res) {
  const origin = req.headers.origin;

  // If you want to temporarily allow everything while debugging, uncomment:
  // const allow = origin || '*';
  // res.setHeader('Access-Control-Allow-Origin', allow);

  if (origin && ALLOW.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight early
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // signal "handled"
  }
  return false;
}
