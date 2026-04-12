import { z } from 'zod';
import { applyCors, readJson } from '../_lib/cors.js';
import { connectDB } from '../_lib/db.js';
import { Metric, Message } from '../_lib/models.js';

const EndSchema = z.object({
  sessionId: z.string().min(6),
  stats: z.object({
    turns: z.number(),
    avgLatencyMs: z.number(),
    errorCount: z.number().default(0),
    moodDelta: z.number().nullable().optional(),
  }),
});

export default async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const body = await readJson(req);

  // backward compat
  if (body?.stats && body.stats.errors != null && body.stats.errorCount == null) {
    body.stats.errorCount = body.stats.errors;
  }

  const parse = EndSchema.safeParse(body);
  if (!parse.success) return res.status(400).json({ error: 'BAD_REQUEST' });

  try {
    await connectDB();
    const { sessionId, stats } = parse.data;

    await Metric.findOneAndUpdate(
      { sessionId },
      { ...stats, endedAt: new Date() },
      { upsert: true, new: true }
    );

    if ((process.env.PRUNE_ON_END || 'true').toLowerCase() === 'true') {
      await Message.deleteMany({ sessionId });
    }

    return res.status(204).end();
  } catch (e) {
    console.error('[end]', e);
    return res.status(500).json({ error: 'END_SESSION_ERROR' });
  }
}
