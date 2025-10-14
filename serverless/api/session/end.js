import { applyCors, readJson } from '../../_lib/cors.js';

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  try {
    await readJson(req); // accept & ignore (stateless)
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
}
