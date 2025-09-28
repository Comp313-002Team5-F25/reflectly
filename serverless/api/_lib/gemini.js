import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, JSON_CONTRACT } from './prompt.js';

const CANDIDATES = [
  (process.env.GEMINI_MODEL || '').trim(),
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-001',
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-1.0-pro',
  'gemini-pro'
].filter(Boolean);

function withTimeout(p, ms=12000) {
  return Promise.race([p, new Promise((_,r)=>setTimeout(()=>r(new Error('AI_TIMEOUT')),ms))]);
}

async function callModel(genAI, model, prompt) {
  const m = genAI.getGenerativeModel({ model });
  const res = await withTimeout(m.generateContent(prompt));
  const text = res.response.text();
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('PARSE_JSON_NOT_FOUND');
  return JSON.parse(text.slice(s, e+1));
}

export async function runTurn(apiKey, { text, history, tone='neutral', intent='go_deep' }) {
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const historyText = (history||[]).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

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
    JSON_CONTRACT
  ].join('\n');

  let lastErr;
  for (const model of CANDIDATES) {
    try {
      const json = await callModel(genAI, model, prompt);
      return {
        paraphrase: json.paraphrase ?? '',
        followUp: json.followUp ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0,3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0,4) : [],
        model
      };
    } catch (err) {
      const msg = String(err?.message||err);
      if (msg.includes('Not Found') || msg.includes('not supported')) { lastErr = err; continue; }
      throw err;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}

export async function summarize(apiKey, transcriptMsgs=[]) {
  const genAI = new GoogleGenerativeAI(apiKey.trim());
  const transcript = transcriptMsgs.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

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
`;

  let lastErr;
  for (const model of CANDIDATES) {
    try {
      const m = genAI.getGenerativeModel({ model });
      const res = await withTimeout(m.generateContent(prompt));
      const text = res.response.text();
      const s = text.indexOf('{'), e = text.lastIndexOf('}');
      const json = JSON.parse(text.slice(s, e+1));
      return {
        summary: Array.isArray(json.summary) ? json.summary.slice(0,5) : [],
        nextPrompt: json.nextPrompt ?? '',
        actionSteps: Array.isArray(json.actionSteps) ? json.actionSteps.slice(0,3) : [],
        tags: Array.isArray(json.tags) ? json.tags.slice(0,4) : [],
        model
      };
    } catch (err) {
      const msg = String(err?.message||err);
      if (msg.includes('Not Found') || msg.includes('not supported')) { lastErr = err; continue; }
      throw err;
    }
  }
  throw lastErr || new Error('NO_WORKING_GEMINI_MODEL');
}
