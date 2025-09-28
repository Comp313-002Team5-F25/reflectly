// client/src/lib/api.ts
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
await fetch(`${BASE}/api/chat`, { /* ... */ });
export async function sendChat(
  sessionId: string,
  text: string,
  tone: 'calm'|'neutral'|'upbeat',
  intent: 'go_deep'|'solve'
) {
  const r = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, text, tone, intent }),
  });
  return r.json();
}

export async function endSession(
  sessionId: string,
  stats: { turns: number; avgLatencyMs: number; errorCount: number; moodDelta?: number | null }
) {
  await fetch(`${BASE}/api/session/end`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, stats }),
  });
}

export async function getSummary(sessionId: string) {
  const r = await fetch(`${BASE}/api/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
  return r.json();
}
