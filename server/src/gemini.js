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

function withTimeout(promise, ms = 12000) {
  return Promise.race([
    promise,
    new Promise((_, r) => setTimeout(() => r(new Error('AI_TIMEOUT')), ms)),
  ]);
}

async function callOnce(genAI, modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const res = await withTimeout(model.generateContent(prompt));
  const text = res.response.text();

  const s = text.indexOf('{'); const e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('PARSE_JSON_NOT_FOUND');

  const json = JSON.parse(text.slice(s, e + 1));
  return json;
}

async function tryMany(genAI, prompt) {
  let lastErr;
  for (const name of MODEL_CANDIDATES) {
    try {
      const out = await callOnce(genAI, name, prompt);
      console.log(`[Gemini] using model: ${name}`);
      return out;
    } catch (err) {
      const msg = String(err?.message || err);
      const okToTryNext =
        msg.includes('Not Found') ||
        msg.includes('not found for API version') ||
        msg.includes('not supported for generateContent');
      lastErr = err;
      if (!okToTryNext) continue;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

/**
 * Turn-by-turn response (Go deeper / Solve it) using CIA listening criteria.
 */
export async function paraphraseAndProbe(apiKey, userText, history = [], opts = {}) {
  const { tone = 'neutral', intent = 'go_deep' } = opts; // 'go_deep' | 'solve'
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

  // normalize minimal surface we return to router
  const out = {
    paraphrase: json.paraphrase ?? '',
    followUp: json.followUp ?? '',
    actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
    tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
  };
  if (!out.paraphrase) throw new Error('PARSE_JSON_KEYS_MISSING');
  return out;
}

/**
 * Summarize a session per CIA “listening/responding” playbook.
 * Returns: { summary: string[], nextPrompt: string, actionSteps?: string[], tags: string[] }
 */
export async function summarizeSession(apiKey, messages = []) {
  const genAI = new GoogleGenerativeAI((apiKey || '').trim());
  const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = `
You are Reflectly. Apply the CIA-style listening/response priorities:
- Reflective Mirroring, Clarifying Extension, Empathic Calibration,
  Strategic Framing, Transparency (at least 2 should be evident).

Summarize this conversation in <=5 concise bullets capturing BOTH content and feeling.
Then propose ONE gentle next prompt to continue reflection.
If appropriate, add up to 3 concrete next steps ("actionSteps") phrased as small, doable actions.

TRANSCRIPT:
${transcript}

Return ONLY JSON:
{
  "summary": ["point1","point2","point3"],
  "nextPrompt": "string",
  "actionSteps": ["step1","step2"],   // optional, <=3
  "tags": ["Reflective Mirroring","Empathic Calibration"]  // which criteria you applied
}
`;

  const json = await tryMany(genAI, prompt);

  // normalize / clamp
  return {
    summary: Array.isArray(json.summary) ? json.summary.slice(0, 5) : [],
    nextPrompt: json.nextPrompt ?? '',
    actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
    tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
  };
}
