import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, FileText } from 'lucide-react';
import { sendChat, endSession, getSummary, type Summary } from '../lib/api';

type Role = 'user' | 'ai';
type Tone = 'calm' | 'neutral' | 'upbeat';
type Intent = 'go_deep' | 'solve';

type Msg = {
  role: Role;
  content: string;
  meta?: { tags?: string[]; steps?: string[] };
};

function newSessionId() {
  return 's_' + Math.random().toString(36).slice(2, 10);
}

export default function Chat({ tone, intent }: { tone: Tone; intent: Intent }) {
  const [sessionId, setSessionId] = useState(() =>
    localStorage.getItem('sessionId') || newSessionId()
  );
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [turns, setTurns] = useState(0);
  const [latencies, setLatencies] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [loading, setLoading] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('sessionId', sessionId); }, [sessionId]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs.length]);

  async function onSend() {
    const content = text.trim();
    if (!content || loading) return;
    setMsgs(m => [...m, { role: 'user', content }]);
    setText(''); setLoading(true);
    const t0 = performance.now();
    try {
      const res = await sendChat(sessionId, content, tone, intent);
      const t1 = performance.now();
      const latency = res?.latencyMs ?? (t1 - t0);
      setLatencies(a => [...a, latency]); setTurns(n => n + 1);
      if (res?.error) setErrors(e => e + 1);

      let ai = (res?.paraphrase || '') + '\n\n';
      if (intent === 'solve' && Array.isArray(res?.actionSteps) && res.actionSteps.length) {
        ai += 'Next steps:\n' + res.actionSteps.map((s: string) => `• ${s}`).join('\n') + '\n\n';
      }
      if (res?.followUp) ai += `Q: ${res.followUp}\n\n`;
      const tags = Array.isArray(res?.tags) ? res.tags : [];
      if (tags.length) ai += '— ' + tags.join(' · ');

      setMsgs(m => [
        ...m,
        { role: 'ai', content: ai.trim(), meta: { tags, steps: res?.actionSteps || [] } }
      ]);
    } catch {
      setErrors(e => e + 1);
      setMsgs(m => [...m, { role: 'ai', content: '[fallback] I had trouble responding. Try again?' }]);
    } finally {
      setLoading(false);
    }
  }

  // end session on unload / 10 min idle
  useEffect(() => {
    const handler = () => {
      const avg = latencies.length
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0;
      endSession(sessionId, { turns, avgLatencyMs: avg, errorCount: errors }).catch(() => {});
      localStorage.removeItem('sessionId');
      setSessionId(newSessionId());
      setMsgs([]); setTurns(0); setLatencies([]); setErrors(0);
    };
    window.addEventListener('beforeunload', handler);
    const idle = setTimeout(handler, 10 * 60 * 1000);
    return () => { window.removeEventListener('beforeunload', handler); clearTimeout(idle); };
  }, [sessionId, turns, latencies, errors]);

  async function onSummary() {
    try {
      const s = await getSummary(sessionId); // typed as Summary
      setSummary(s);
    } catch {
      setSummary({
        summary: ['(Couldn’t generate a summary right now)'],
        nextPrompt: 'What feels most important to talk about next?'
      });
    } finally {
      setSummaryOpen(true);
    }
  }

  return (
    <section id="chat" className="max-w-4xl mx-auto px-6 -mt-16 relative">
      <div className="glass rounded-xl2 p-4 md:p-6 shadow-soft border border-white/10">
        <header className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-xl font-medium">Conversation</h2>
          <div className="flex items-center gap-2">
            <button onClick={onSummary} className="px-3 py-2 rounded-xl2 border border-white/15 hover:bg-white/5 text-sm inline-flex items-center gap-2">
              <FileText size={14}/> Summary
            </button>
            <span className="text-xs text-mist/70">session: {sessionId}</span>
          </div>
        </header>

        <div ref={listRef} className="h-[48vh] overflow-y-auto space-y-3 pr-1">
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}
              className={`rounded-xl2 p-3 whitespace-pre-wrap ${m.role==='user' ? 'bg-white/5' : 'bg-accent/10 border border-accent/20'}`}>
              <div className="text-[11px] uppercase tracking-wide opacity-60 mb-1">{m.role}</div>
              <div>{m.content}</div>
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}
              className="rounded-xl2 p-3 bg-accent/5 border border-accent/10">
              <div className="text-[11px] uppercase tracking-wide opacity-60 mb-1">ai</div>
              <div className="animate-pulse">Reflectly is thinking…</div>
            </motion.div>
          )}
        </div>

        <form onSubmit={(e)=>{e.preventDefault(); onSend();}} className="mt-4 flex items-center gap-3">
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a thought…"
                 className="flex-1 glass rounded-xl2 px-4 py-3 outline-none focus:ring-2 focus:ring-accent/40" disabled={loading}/>
          <button type="submit" disabled={loading}
            className="px-4 py-3 rounded-xl2 bg-accent text-ink hover:opacity-90 transition inline-flex items-center gap-2 disabled:opacity-50">
            <Send size={16}/> Send
          </button>
        </form>

        <p className="mt-3 text-xs text-mist/60">
          This is a non-clinical tool. If you are in danger, call local emergency services or a crisis hotline.
        </p>
      </div>

      {/* Summary modal */}
      {summaryOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass max-w-lg w-full rounded-xl2 p-5 border border-white/15">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Session summary</h3>
              <button onClick={()=>setSummaryOpen(false)} className="text-sm opacity-70 hover:opacity-100">Close</button>
            </div>
            <div className="space-y-2">
              <ul className="list-disc pl-5">
                {(summary?.summary || []).map((s,i)=> <li key={i} className="text-mist/90">{s}</li>)}
              </ul>
              {summary?.nextPrompt && (
                <div className="mt-2 text-sm">
                  <span className="opacity-70">Next prompt: </span>
                  <span className="font-medium">{summary.nextPrompt}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
