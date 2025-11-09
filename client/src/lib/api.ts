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
  // in error cases from server we sometimes send these:
  provider?: string | null;
  providerStatus?: number | null;
  providerStatusText?: string | null;
  providerMessage?: string | null;
};

// 1) try Vercel/Vite env
// 2) otherwise fall back to local API
const RAW_BASE = import.meta.env.VITE_API_BASE;
const BASE = (RAW_BASE && RAW_BASE.trim().length > 0
  ? RAW_BASE
  : 'http://localhost:4000'
).replace(/\/+$/, ''); // remove trailing /

function assertBase() {
  if (!RAW_BASE || RAW_BASE.trim().length === 0) {
    // this means prod didn't inject it; we'll still use localhost fallback
    console.warn(
      '[api] VITE_API_BASE is empty – using http://localhost:4000. Set VITE_API_BASE in Vercel for production.'
    );
  }
}

// generic POST with timeout; safe for 204
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

    let data: any = {};
    if (r.status !== 204) {
      try {
        data = await r.json();
      } catch {
        data = {};
      }
    }

    if (!r.ok) {
      throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, data });
    }

    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

// --- public fns -----------------------------------------------------

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
  return {
    summary: Array.isArray(j.summary) ? j.summary : [],
    nextPrompt: typeof j.nextPrompt === 'string' ? j.nextPrompt : undefined,
    actionSteps: Array.isArray(j.actionSteps) ? j.actionSteps : [],
    tags: Array.isArray(j.tags) ? j.tags : [],
  };
}
