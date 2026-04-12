// serverless/_lib/gemini.mjs
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, JSON_CONTRACT } from './prompt.js';

const CANDIDATES = [
  (process.env.GEMINI_MODEL || '').trim(),
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
  'gemini-pro-latest'
].filter(Boolean);

function cleanJson(text = '') {
  const cleaned = String(text).replace(/```(?:json)?/g, '').trim();
  const s = cleaned.indexOf('{'); const e = cleaned.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('PARSE_JSON_NOT_FOUND');
  return JSON.parse(cleaned.slice(s, e + 1));
}

async function callOnce(genAI, modelName, prompt) {
  const model = genAI.getGenerativeModel({ model: modelName });
  const r = await model.generateContent(prompt);
  const t = r?.response?.text?.() ?? '';
  return cleanJson(t);
}

export async function paraphraseAndProbe(apiKey, userText, history=[], opts={}) {
  const genAI = new GoogleGenerativeAI((apiKey || '').trim());
  const { tone='neutral', intent='go_deep' } = opts;
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
    JSON_CONTRACT
  ].join('\n');

  let lastErr;
  for (const name of CANDIDATES) {
    try {
      const json = await callOnce(genAI, name, prompt);
      return {
        paraphrase: json.paraphrase ?? '',
        followUp: json.followUp ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0,3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0,4) : [],
        model: name
      };
    } catch (e) {
      const msg = String(e?.message || e);
      // try next on unsupported model / not found
      if (/Not Found|not found for API version|not supported/.test(msg)) { lastErr = e; continue; }
      throw e; // bubble real error
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

export async function summarize(apiKey, transcriptMsgs=[]) {
  const genAI = new GoogleGenerativeAI((apiKey || '').trim());
  const transcript = transcriptMsgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

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

  let lastErr;
  for (const name of CANDIDATES) {
    try {
      const json = await callOnce(genAI, name, prompt);
      return {
        summary: Array.isArray(json.summary) ? json.summary.slice(0,5) : [],
        nextPrompt: json.nextPrompt ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0,3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0,4) : [],
        model: name
      };
    } catch (e) {
      const msg = String(e?.message || e);
      if (/Not Found|not found for API version|not supported/.test(msg)) { lastErr = e; continue; }
      throw e;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

// Back-compat named exports
export { paraphraseAndProbe as runTurn };
export { summarize as summarizeSession };
