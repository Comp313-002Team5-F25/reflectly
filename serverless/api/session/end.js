import { z } from 'zod';
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
  if (req.method !== 'POST') return res.status(405).end();

  // backward compat: map 'errors' -> 'errorCount'
  const body = { ...req.body };
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
    res.status(204).end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'END_SESSION_ERROR' });
  }
}
