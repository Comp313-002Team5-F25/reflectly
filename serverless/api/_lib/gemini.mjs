import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, JSON_CONTRACT } from './prompt.js';

const CANDIDATES = [
  (process.env.GEMINI_MODEL || '').trim(),
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-lite-001'
].filter(Boolean);

function parseJsonBlock(text = '') {
  const cleaned = String(text).replace(/```(?:json)?/g, '').trim();
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('PARSE_JSON_NOT_FOUND');
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function callOnce(genAI, model, prompt) {
  const m = genAI.getGenerativeModel({ model });
  const res = await m.generateContent(prompt);
  return parseJsonBlock(res?.response?.text?.() ?? '');
}

export async function runTurn(apiKey, { text, history, tone = 'neutral', intent = 'go_deep' }) {
  if (!apiKey) throw new Error('NO_GEMINI_KEY');

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const historyText = (history || []).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

  const prompt = [
    SYSTEM_PROMPT,
    `Tone: ${tone}`,
    `Intent: ${intent}`,
    '---',
    'RECENT HISTORY (may be empty):',
    historyText || '(none)',
    '---',
    'USER:',
    text,
    '---',
    JSON_CONTRACT,
  ].join('\n');

  let lastErr;
  for (const model of CANDIDATES) {
    try {
      const json = await callOnce(genAI, model, prompt);
      return {
        paraphrase: json.paraphrase ?? '',
        followUp: json.followUp ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
        model
      };
    } catch (err) {
      const msg = String(err?.message || err);
      if (/Not Found|not found for API version|not supported/i.test(msg)) {
        lastErr = err; continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

export async function summarize(apiKey, transcriptMsgs = []) {
  if (!apiKey) throw new Error('NO_GEMINI_KEY');

  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const transcript = (transcriptMsgs || [])
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  const prompt = `
Apply CIA listening and produce ≤5 bullets + 1 next prompt; optional ≤3 steps.

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
  for (const model of CANDIDATES) {
    try {
      const res = await genAI.getGenerativeModel({ model }).generateContent(prompt);
      const json = parseJsonBlock(res?.response?.text?.() ?? '');
      return {
        summary: Array.isArray(json.summary) ? json.summary.slice(0, 5) : [],
        nextPrompt: json.nextPrompt ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0, 3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0, 4) : [],
        model
      };
    } catch (err) {
      const msg = String(err?.message || err);
      if (/Not Found|not found for API version|not supported/i.test(msg)) {
        lastErr = err; continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

// Back-compat names your handlers import:
export { runTurn as paraphraseAndProbe, summarize as summarizeSession };
