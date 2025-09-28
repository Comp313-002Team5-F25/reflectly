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

      <Hero subtitle={role ? `Mode: ${role.replace('_',' ')}` : undefined} />
      <main className="max-w-6xl mx-auto px-6 -mt-10 space-y-6">
        <AccessibilityPanel onChange={setPrefs} />
        <ToneControl value={tone} onChange={setTone} />
        <IntentControl value={intent} onChange={setIntent} />
        <Chat tone={tone} intent={intent} />
        <section id="about" className="glass rounded-xl2 p-6 mt-10">
          <h3 className="text-lg font-semibold">How it works</h3>
          <p className="mt-2 text-mist/80">
            We paraphrase your words to show understanding, then ask one gentle question—or offer 2–3 steps—based on your intent.
            Sessions are ephemeral; only minimal metrics are kept.
          </p>
        </section>
      </main>
    </div>
  );
}
