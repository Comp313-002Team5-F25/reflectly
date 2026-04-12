import { useEffect, useState } from 'react';
import Hero from './components/Hero';
import Chat from './components/Chat';
import AccessibilityPanel from './components/AccessibilityPanel';
import ToneControl from './components/ToneControl';
import IntentControl from './components/IntentControl';
import OnboardingModal from './components/OnboardingModal';

type Tone = 'calm'|'neutral'|'upbeat';
type Intent = 'go_deep'|'solve';
type Prefs = { reduceMotion: boolean; highContrast: boolean; fontScale: number };

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try { return JSON.parse(localStorage.getItem('prefs') || '') || { reduceMotion:false, highContrast:false, fontScale:1 }; }
    catch { return { reduceMotion:false, highContrast:false, fontScale:1 }; }
  });
  const [tone, setTone] = useState<Tone>(() => (localStorage.getItem('tone') as Tone) || 'neutral');
  const [intent, setIntent] = useState<Intent>(() => (localStorage.getItem('intent') as Intent) || 'go_deep');
  const [role, setRole] = useState<string>(() => localStorage.getItem('role') || '');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !role);

  useEffect(() => { localStorage.setItem('prefs', JSON.stringify(prefs)); }, [prefs]);
  useEffect(() => { localStorage.setItem('tone', tone); }, [tone]);
  useEffect(() => { localStorage.setItem('intent', intent); }, [intent]);

  function handleOnboardingComplete(payload: {
    role: string; subrole?: string; tone: Tone; intent: Intent; prefs: Prefs;
  }) {
    setRole(payload.role);
    setTone(payload.tone);
    setIntent(payload.intent);
    setPrefs(payload.prefs);
    setShowOnboarding(false);
  }


return (
  <div
    style={{
      filter: prefs.highContrast ? 'contrast(1.2) saturate(1.05)' : undefined,
      fontSize: `${prefs.fontScale}em`,
    }}
    className={prefs.reduceMotion ? 'motion-reduce' : ''}
  >
    <OnboardingModal
      open={showOnboarding}
      onClose={() => setShowOnboarding(false)}
      onComplete={handleOnboardingComplete}
    />

    {/* Background + Hero spacing */}
    <div className="relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white via-white to-slate-50" />
      <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(900px_circle_at_20%_20%,rgba(99,102,241,0.10),transparent_45%),radial-gradient(900px_circle_at_80%_10%,rgba(14,165,233,0.10),transparent_40%)]" />
      <Hero subtitle={role ? `Mode: ${role.replace('_', ' ')}` : undefined} />
    </div>

    <main className="max-w-6xl mx-auto px-6 -mt-10 space-y-6">
      <AccessibilityPanel onChange={setPrefs} />
      <ToneControl value={tone} onChange={setTone} />
      <IntentControl value={intent} onChange={setIntent} />
      <Chat tone={tone} intent={intent} />

      <section id="about" className="glass rounded-xl2 p-6 mt-10">
        <h3 className="text-lg font-semibold text-slate-900">How it works</h3>
         <section className="glass rounded-xl2 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Built like a real product
          </h3>

          <ul className="mt-4 grid gap-3 md:grid-cols-3 text-sm text-slate-600">
            <li className="rounded-xl bg-white/40 p-4">
              <div className="font-medium text-slate-900">Accessibility</div>
              <div className="mt-1">
                Keyboard-first navigation, reduced motion, high-contrast modes.
              </div>
            </li>

            <li className="rounded-xl bg-white/40 p-4">
              <div className="font-medium text-slate-900">Privacy-first</div>
              <div className="mt-1">
                Ephemeral sessions. No accounts. No transcript storage.
              </div>
            </li>

            <li className="rounded-xl bg-white/40 p-4">
              <div className="font-medium text-slate-900">Intent-aware AI</div>
              <div className="mt-1">
                Reflect deeper or switch to structured guidance when you choose.
              </div>
            </li>
          </ul>
        </section>

        <p className="mt-2 text-slate-600 leading-relaxed max-w-2xl">
          We paraphrase your words to show understanding, then ask one gentle question—or offer 2–3 steps—based on your intent.
          Sessions are ephemeral; only minimal metrics are kept.
        </p>
      </section>
    </main>
  </div>
);

}
