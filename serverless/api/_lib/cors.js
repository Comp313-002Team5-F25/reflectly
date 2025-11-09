// serverless/_lib/cors.js
export function applyCors(req, res) {
  // e.g. "https://reflectly-nh3w.vercel.app, http://localhost:5173"
  const allowList = (process.env.CORS_ORIGIN || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin || '';

  const allowed =
    allowList.includes('*') ||
    allowList.includes(origin);

  if (allowed) {
    // send back the exact origin so the browser is happy
    res.setHeader('Access-Control-Allow-Origin', origin || allowList[0] || '*');
  } else if (allowList.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}
