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

function normalizeBase(url?: string) {
  return (url || '').trim().replace(/\/+$/, '');
}

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

// 1) try Vercel/Vite env
// 2) if local browser, fall back to local API
// 3) otherwise fall back to same-origin production/serverless API
const RAW_BASE = import.meta.env.VITE_API_BASE;
const BASE = normalizeBase(
  RAW_BASE && RAW_BASE.trim().length > 0
    ? RAW_BASE
    : isLocalHost()
      ? 'http://localhost:4000'
      : typeof window !== 'undefined'
        ? window.location.origin
        : ''
);

function assertBase() {
  if (!RAW_BASE || RAW_BASE.trim().length === 0) {
    if (isLocalHost()) {
      console.warn(
        '[api] VITE_API_BASE is empty – using http://localhost:4000 for local development.'
      );
    } else {
      console.warn(
        '[api] VITE_API_BASE is empty – using same-origin API. Set VITE_API_BASE only if production API is hosted on a different domain.'
      );
    }
  }
}

function buildUrl(path: string) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${cleanPath}`;
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
    const r = await fetch(buildUrl('/api/health'), { method: 'GET' });
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
  return postJSON<SendChatResponse>(buildUrl('/api/chat'), { sessionId, text, tone, intent });
}

export async function endSession(
  sessionId: string,
  stats: { turns: number; avgLatencyMs: number; errorCount: number; moodDelta?: number | null }
) {
  assertBase();
  await postJSON<void>(buildUrl('/api/session/end'), { sessionId, stats });
  return true;
}

export async function getSummary(sessionId: string): Promise<Summary> {
  assertBase();
  const j = await postJSON<Summary>(buildUrl('/api/summary'), { sessionId });
  return {
    summary: Array.isArray(j.summary) ? j.summary : [],
    nextPrompt: typeof j.nextPrompt === 'string' ? j.nextPrompt : undefined,
    actionSteps: Array.isArray(j.actionSteps) ? j.actionSteps : [],
    tags: Array.isArray(j.tags) ? j.tags : [],
  };
}