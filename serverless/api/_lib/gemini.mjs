// serverless/_lib/gemini.mjs
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
  'gemini-pro'
].filter(Boolean);

function withTimeout(promise, ms = 20000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), ms)
    ),
  ]);
}

function shouldTryNextModel(err) {
  const msg = String(err?.message || '');
  const status = err?.status;
  if (msg.includes('Not Found')) return true;
  if (msg.includes('not found for API version')) return true;
  if (msg.includes('not supported for generateContent')) return true;
  if (status === 429) return true;
  return false;
}

async function callOnce(genAI, modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const res = await withTimeout(model.generateContent(prompt));
  const text = res?.response?.text?.() ?? '';
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) {
    const err = new Error('PARSE_JSON_NOT_FOUND');
    err.raw = text;
    throw err;
  }
  return JSON.parse(text.slice(s, e + 1));
}

// ---- public fns ----

export async function paraphraseAndProbe(apiKey, userText, history = [], opts = {}) {
  if (!apiKey) throw new Error('NO_GEMINI_KEY');

  const { tone = 'neutral', intent = 'go_deep' } = opts;
  const genAI = new GoogleGenerativeAI(apiKey.trim());

  const historyText = history
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

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
      const json = await callOnce(genAI, name, prompt);
      return {
        paraphrase: json.paraphrase ?? '',
        followUp: json.followUp ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
        model: name,
      };
    } catch (err) {
      lastErr = err;
      if (shouldTryNextModel(err)) continue;
      break;
    }
  }

  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

export async function summarizeSession(apiKey, messages = []) {
  if (!apiKey) throw new Error('NO_GEMINI_KEY');

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `
Apply listening criteria and produce <=5 bullets + 1 next prompt; optional <=3 action steps.

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
      const json = await callOnce(genAI, name, prompt);
      return {
        summary: Array.isArray(json.summary) ? json.summary.slice(0, 5) : [],
        nextPrompt: json.nextPrompt ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
        model: name,
      };
    } catch (err) {
      lastErr = err;
      if (shouldTryNextModel(err)) continue;
      break;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

// keep old names
export { paraphraseAndProbe as runTurn };
export { summarizeSession as summarize };
