// server/src/index.js
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { z } from 'zod';

import { Message, Metric } from './models.js';
import { paraphraseAndProbe, summarizeSession } from './gemini.js';

const app = express();
const PORT = process.env.PORT || 4000;
const GEMINI = (process.env.GEMINI_API_KEY || '').trim();

if (!process.env.MONGODB_URI) { console.error('❌ Missing MONGODB_URI'); process.exit(1); }
if (!GEMINI) { console.error('❌ Missing GEMINI_API_KEY'); process.exit(1); }

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({ origin: (process.env.CORS_ORIGIN || '*').split(',') }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 60 }));

mongoose.connect(process.env.MONGODB_URI, { dbName: 'reflectly' })
  .then(() => console.log('Mongo connected'))
  .catch(err => { console.error('Mongo error', err); process.exit(1); });

const ChatSchema = z.object({
  sessionId: z.string().min(6),
  text: z.string().min(1).max(2000),
  tone: z.enum(['calm','neutral','upbeat']).optional(),
  intent: z.enum(['go_deep','solve']).optional(),
});

const EndSchema = z.object({
  sessionId: z.string().min(6),
  stats: z.object({
    turns: z.number(),
    avgLatencyMs: z.number(),
    errorCount: z.number().default(0),
    moodDelta: z.number().nullable().optional(),
  }),
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    model: process.env.GEMINI_MODEL || 'auto',
    mongo: mongoose.connection.readyState, // 1=connected
    time: new Date().toISOString(),
  });
});

app.post('/api/chat', async (req, res) => {
  const parse = ChatSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'BAD_REQUEST' });
  const { sessionId, text, tone='neutral', intent='go_deep' } = parse.data;

  const t0 = Date.now();
  try {
    // light safety screen
    const crisis = /suicide|kill myself|harm myself|overdose|end it/i.test(text);
    await Message.create({ sessionId, role: 'user', content: text });

    const recent = await Message.find({ sessionId }).sort({ createdAt: -1 }).limit(6).lean();
    const history = recent.reverse().map(m => ({ role: m.role, content: m.content }));

    if (crisis) {
      const paraphrase = "It sounds like you're going through intense pain.";
      const followUp = "Would you be willing to contact immediate support? I can share options.";
      const tags = ["Empathic Calibration","Transparency"];
      await Message.create({ sessionId, role:'ai', content: `${paraphrase}\n\nQ: ${followUp}\n\n— ${tags.join(' · ')}` });
      return res.json({ paraphrase, followUp, actionSteps: [], tags, latencyMs: Date.now() - t0 });
    }

    const { paraphrase, followUp, actionSteps, tags } =
      await paraphraseAndProbe(GEMINI, text, history, { tone, intent });

    let bubble = paraphrase + '\n\n';
    if (intent === 'solve' && actionSteps?.length) {
      bubble += 'Next steps:\n' + actionSteps.map(s => `• ${s}`).join('\n') + '\n\n';
      if (followUp) bubble += `Q: ${followUp}\n\n`;
    } else if (followUp) {
      bubble += `Q: ${followUp}\n\n`;
    }
    if (tags?.length) bubble += '— ' + tags.join(' · ');

    await Message.create({ sessionId, role: 'ai', content: bubble.trim() });

    res.json({ paraphrase, followUp, actionSteps, tags, latencyMs: Date.now() - t0 });
  } catch (err) {
    console.error(err);
    await Message.create({ sessionId, role:'ai', content:'[fallback] I had trouble responding. Want to try again?' });
    res.json({
      paraphrase:'I might be having trouble responding right now.',
      followUp:'Would you like to try again or share more in a different way?',
      actionSteps:[],
      tags:['Transparency'],
      latencyMs: Date.now()-t0,
      error:true
    });
  }
});

app.post('/api/summary', async (req, res) => {
  const SessionSchema = z.object({ sessionId: z.string().min(6) });
  const parse = SessionSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'BAD_REQUEST' });

  const { sessionId } = parse.data;
  try {
    const recent = await Message.find({ sessionId }).sort({ createdAt: 1 }).limit(20).lean();
    const json = await summarizeSession(GEMINI, recent);
    res.json(json);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'SUMMARY_ERROR' });
  }
});

app.post('/api/session/end', async (req, res) => {
  // backward-compat: map 'errors' -> 'errorCount'
  const body = { ...req.body };
  if (body?.stats && body.stats.errors != null && body.stats.errorCount == null) {
    body.stats.errorCount = body.stats.errors;
  }
  const parse = EndSchema.safeParse(body);
  if (!parse.success) return res.status(400).json({ error: 'BAD_REQUEST' });

  const { sessionId, stats } = parse.data;
  try {
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
});

app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
