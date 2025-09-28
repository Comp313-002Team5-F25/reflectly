// server/src/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, JSON_CONTRACT } from './prompt.js';

const ENV_MODEL = (process.env.GEMINI_MODEL || '').trim();
const MODEL_CANDIDATES = [
  ENV_MODEL,
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-1.0-pro',
  'gemini-pro',
].filter(Boolean);

function withTimeout(promise, ms = 20000) {
  return Promise.race([
    promise,
    new Promise((_, r) => setTimeout(() => r(Object.assign(new Error('AI_TIMEOUT'), { status: 408 })), ms)),
  ]);
}

function shouldTryNextModel(err) {
  const msg = String(err?.message || err || '');
  const status = err?.status;

  if (msg.includes('Not Found') || msg.includes('not supported for generateContent') || msg.includes('not found for API version')) {
    return true;
  }
  if (status === 400 && (msg.toLowerCase().includes('invalid model') || msg.toLowerCase().includes('invalid argument'))) {
    return true;
  }
  if (status === 429) return true; // quota sometimes varies by model

  return false;
}

async function callOnce(genAI, modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const res = await withTimeout(model.generateContent(prompt));
  const text = res.response.text();
  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw Object.assign(new Error('PARSE_JSON_NOT_FOUND'), { raw: text });
  return JSON.parse(text.slice(s, e + 1));
}

async function tryMany(genAI, prompt) {
  let lastErr;
  for (const name of MODEL_CANDIDATES) {
    try {
      const out = await callOnce(genAI, name, prompt);
      console.log(`[Gemini] using model: ${name}`);
      return out;
    } catch (err) {
      lastErr = err;
      if (shouldTryNextModel(err)) continue;
      break; // fatal; don't keep looping
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
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

  const json = await tryMany(genAI, prompt);
  return {
    paraphrase: json.paraphrase ?? '',
    followUp: json.followUp ?? '',
    actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
    tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
  };
}

export async function summarizeSession(apiKey, messages = []) {
  const genAI = new GoogleGenerativeAI((apiKey || '').trim());
  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
Return ONLY JSON:
{
  "summary": ["point1","point2","point3"],
  "nextPrompt": "string",
  "actionSteps": ["step1","step2"],
  "tags": ["Reflective Mirroring","Empathic Calibration"]
}

TRANSCRIPT:
${transcript}
`.trim();

  const json = await tryMany(genAI, prompt);
  return {
    summary: Array.isArray(json.summary) ? json.summary.slice(0, 5) : [],
    nextPrompt: json.nextPrompt ?? '',
    actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
    tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
  };
}
