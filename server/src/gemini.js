// server/src/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, JSON_CONTRACT } from './prompt.js';

const MODEL_CANDIDATES = [
  (process.env.GEMINI_MODEL || '').trim(),
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001',
].filter(Boolean);

// ---- schemas WITHOUT `additionalProperties` ----
const TURN_JSON_SCHEMA = {
  type: 'object',
  properties: {
    paraphrase: { type: 'string' },
    followUp: { type: 'string' },
    actionSteps: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 4 }
  },
  required: ['paraphrase']
};

const SUMMARY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    nextPrompt: { type: 'string' },
    actionSteps: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    tags: { type: 'array', items: { type: 'string' }, maxItems: 4 }
  },
  required: ['summary']
};

function cleanAndParseJson(text = '') {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  const s = cleaned.indexOf('{');
  const e = cleaned.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('PARSE_JSON_NOT_FOUND');
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function callOnce(genAI, modelName, prompt, schema) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      // keep the schema (now valid) or comment this line out completely if you prefer:
      responseSchema: schema
    }
  });

  const res = await model.generateContent(prompt);
  const text = res?.response?.text?.() ?? '';
  return cleanAndParseJson(text);
}

export async function paraphraseAndProbe(apiKey, userText, history = [], opts = {}) {
  const { tone = 'neutral', intent = 'go_deep' } = opts;
  const genAI = new GoogleGenerativeAI((apiKey || '').trim());
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

  let lastErr;
  for (const name of MODEL_CANDIDATES) {
    try {
      const json = await callOnce(genAI, name, prompt, TURN_JSON_SCHEMA);
      return {
        paraphrase: json.paraphrase ?? '',
        followUp: json.followUp ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
        model: name
      };
    } catch (err) {
      const msg = String(err?.message || err);
      if (/Not Found|not found for API version|not supported/.test(msg)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

export async function summarizeSession(apiKey, messages = []) {
  const genAI = new GoogleGenerativeAI((apiKey || '').trim());
  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
Apply listening criteria and produce ≤5 bullets + 1 next prompt; optional ≤3 action steps.

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

  let lastErr;
  for (const name of MODEL_CANDIDATES) {
    try {
      const json = await callOnce(genAI, name, prompt, SUMMARY_JSON_SCHEMA);
      return {
        summary: Array.isArray(json.summary) ? json.summary.slice(0, 5) : [],
        nextPrompt: json.nextPrompt ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
        model: name
      };
    } catch (err) {
      const msg = String(err?.message || err);
      if (/Not Found|not found for API version|not supported/.test(msg)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}
