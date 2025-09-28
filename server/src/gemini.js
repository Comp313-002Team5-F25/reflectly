// server/src/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, JSON_CONTRACT } from './prompt.js';

const ENV_MODEL = (process.env.GEMINI_MODEL || '').trim();
// Use only models your key can call (based on your /v1/models listing)
const MODEL_CANDIDATES = [
  ENV_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
  'gemini-pro-latest',
].filter(Boolean);

// Strongly nudge JSON
const TURN_SCHEMA = {
  type: 'object',
  properties: {
    paraphrase:   { type: 'string' },
    followUp:     { type: 'string' },
    actionSteps:  { type: 'array', items: { type: 'string' }, maxItems: 3 },
    tags:         { type: 'array', items: { type: 'string' }, maxItems: 4 }
  },
  required: ['paraphrase'],
  additionalProperties: true
};

const SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    summary:      { type: 'array', items: { type: 'string' }, maxItems: 5 },
    nextPrompt:   { type: 'string' },
    actionSteps:  { type: 'array', items: { type: 'string' }, maxItems: 3 },
    tags:         { type: 'array', items: { type: 'string' }, maxItems: 4 }
  },
  required: ['summary'],
  additionalProperties: true
};

function cleanAndParseJson(text = '') {
  const cleaned = String(text).replace(/```(?:json)?/g, '').trim();
  const s = cleaned.indexOf('{');
  const e = cleaned.lastIndexOf('}');
  if (s < 0 || e < 0) {
    const err = new Error('PARSE_JSON_NOT_FOUND');
    err.raw = cleaned.slice(0, 400);
    throw err;
  }
  return JSON.parse(cleaned.slice(s, e + 1));
}

function shouldTryNextModel(err) {
  const msg = String(err?.message || err || '');
  const status = err?.status;
  // Try next on these “capability/availability” signals
  if (/Not Found|not found for API version|not supported for generateContent/i.test(msg)) return true;
  if (status === 400 && /invalid (model|argument)/i.test(msg)) return true;
  if (status === 429) return true; // quota might differ per model
  return false;
}

async function callOnce(genAI, modelName, prompt, schema) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      temperature: 0.7,
    },
  });
  const res = await model.generateContent(prompt);
  const text = res?.response?.text?.() ?? '';
  return cleanAndParseJson(text);
}

async function tryMany(genAI, prompt, schema) {
  let lastErr;
  for (const name of MODEL_CANDIDATES) {
    try {
      const out = await callOnce(genAI, name, prompt, schema);
      console.log(`[Gemini] using model: ${name}`);
      return { out, model: name };
    } catch (err) {
      lastErr = err;
      if (shouldTryNextModel(err)) continue;
      break;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

export async function paraphraseAndProbe(apiKey, userText, history = [], opts = {}) {
  if (!apiKey) throw new Error('NO_GEMINI_KEY');
  const { tone = 'neutral', intent = 'go_deep' } = opts;
  const genAI = new GoogleGenerativeAI(apiKey.trim());

  const historyText = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const prompt = [
    SYSTEM_PROMPT,
    `Tone: ${tone}`,
    `Intent: ${intent}`,
    '---',
    'RECENT HISTORY (may be empty):',
    historyText || '(none)',
    '---',
    'USER:',
    userText,
    '---',
    JSON_CONTRACT,
  ].join('\n');

  const { out, model } = await tryMany(genAI, prompt, TURN_SCHEMA);

  return {
    paraphrase: out.paraphrase ?? '',
    followUp: out.followUp ?? '',
    actionSteps: Array.isArray(out.actionSteps) ? out.actionSteps.slice(0, 3) : [],
    tags: Array.isArray(out.tags) ? out.tags.slice(0, 4) : [],
    model
  };
}

export async function summarizeSession(apiKey, messages = []) {
  if (!apiKey) throw new Error('NO_GEMINI_KEY');
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
Apply CIA-style listening. Produce ≤5 bullets + 1 next prompt; optional ≤3 action steps.

TRANSCRIPT:
${transcript}

Return ONLY JSON:
{
  "summary": ["point1","point2"],
  "nextPrompt": "string",
  "actionSteps": ["step1","step2"],
  "tags": ["Reflective Mirroring","Empathic Calibration"]
}
  `.trim();

  const { out, model } = await tryMany(genAI, prompt, SUMMARY_SCHEMA);
  return {
    summary: Array.isArray(out.summary) ? out.summary.slice(0, 5) : [],
    nextPrompt: out.nextPrompt ?? '',
    actionSteps: Array.isArray(out.actionSteps) ? out.actionSteps.slice(0, 3) : [],
    tags: Array.isArray(out.tags) ? out.tags.slice(0, 4) : [],
    model
  };
}
