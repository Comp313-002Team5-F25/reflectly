// serverless/_lib/cors.js
export function applyCors(req, res) {
  const allowList = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin || '';

  // Safe helpers
  const isLocal =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  let host = '';
  try { host = origin ? new URL(origin).hostname : ''; } catch { host = ''; }
  const isVercel = /\.vercel\.app$/i.test(host);

  const allowStar = allowList.includes('*');
  const allowExact = allowList.includes(origin);
  // Optional: allow simple prefix matches you might have configured
  const allowPrefix = allowList.some(p => p && origin.startsWith(p));

  const allowed = allowStar || allowExact || allowPrefix || isLocal || isVercel;

  // Always set the standard CORS headers
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (allowed) {
    // Echo exact origin when possible; fall back to * if you configured it
    res.setHeader('Access-Control-Allow-Origin', allowStar ? '*' : origin || '*');
  } else {
    // If not allowed, don't set A-C-A-Origin (browser will block)
  }

  // Handle preflight early
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

// Convenience JSON reader for Node serverless
export async function readJson(req) {
  if (req.body && typeof req.body !== 'string') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  try { return JSON.parse(raw || '{}'); } catch { return {}; }
}
