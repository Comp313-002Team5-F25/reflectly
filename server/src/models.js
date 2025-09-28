// server/src/models.js
import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  sessionId: { type: String, index: true },
  role: { type: String, enum: ['user', 'ai'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { versionKey: false });

const MetricSchema = new mongoose.Schema({
  sessionId: { type: String, index: true },
  turns: Number,
  avgLatencyMs: Number,
  errorCount: Number,                 // <- renamed from "errors"
  moodDelta: { type: Number, default: null },
  endedAt: { type: Date, default: Date.now },
}, {
  versionKey: false,
  suppressReservedKeysWarning: true,
});

export const Message = mongoose.model('Message', MessageSchema);
export const Metric  = mongoose.model('Metric',  MetricSchema);
