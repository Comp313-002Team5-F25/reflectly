// client/src/lib/api.ts
export type Tone = 'calm' | 'neutral' | 'upbeat';
export type Intent = 'go_deep' | 'solve';

export type Summary = {
  summary: string[];
  nextPrompt?: string;
  actionSteps?: string[];
  tags?: string[];
};

export type SendChatResponse = {
  paraphrase: string;
  followUp?: string;
  actionSteps?: string[];
  tags?: string[];
  latencyMs?: number;
  error?: boolean;
};

// Pull from Vite env and remove trailing slashes
export const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

// tiny helper in case VITE_API_BASE is missing
function assertBase() {
  if (!BASE) {
    // Don’t throw in dev, just warn so local relative calls still work if you want
    console.warn('[api] VITE_API_BASE is empty – calls will be relative to the frontend origin.');
  }
}

// POST with timeout + tolerant JSON parsing (works with 204 No Content too)
async function postJSON<T>(url: string, body: unknown, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    // 204 has no body — avoid throwing on json()
    let data: any = {};
    if (r.status !== 204) {
      try { data = await r.json(); } catch { data = {}; }
    }

    if (!r.ok) {
      throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, data });
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// GET-safe health ping
export async function apiHealth() {
  assertBase();
  try {
    const r = await fetch(`${BASE}/api/health`, { method: 'GET' });
    return await r.json();
  } catch {
    return { ok: false };
  }
}

export async function sendChat(
  sessionId: string,
  text: string,
  tone: Tone,
  intent: Intent
): Promise<SendChatResponse> {
  assertBase();
  return postJSON<SendChatResponse>(`${BASE}/api/chat`, { sessionId, text, tone, intent });
}

export async function endSession(
  sessionId: string,
  stats: { turns: number; avgLatencyMs: number; errorCount: number; moodDelta?: number | null }
) {
  assertBase();
  await postJSON<void>(`${BASE}/api/session/end`, { sessionId, stats });
  return true;
}

export async function getSummary(sessionId: string): Promise<Summary> {
  assertBase();
  const j = await postJSON<Summary>(`${BASE}/api/summary`, { sessionId });

  // normalize so the UI can rely on arrays existing
  return {
    summary: Array.isArray(j.summary) ? j.summary : [],
    nextPrompt: typeof j.nextPrompt === 'string' ? j.nextPrompt : undefined,
    actionSteps: Array.isArray(j.actionSteps) ? j.actionSteps : [],
    tags: Array.isArray(j.tags) ? j.tags : [],
  };
}
