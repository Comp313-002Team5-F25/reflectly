import { useEffect, useState } from 'react';
import { X, Heart, GraduationCap, UserRound, Shield, Stethoscope, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tone = 'calm' | 'neutral' | 'upbeat';
type Intent = 'go_deep' | 'solve';

type Prefs = { reduceMotion: boolean; highContrast: boolean; fontScale: number };

type Role =
  | 'reflector'
  | 'older_adult'
  | 'access_privacy'
  | 'clinician';

export default function OnboardingModal({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (payload: {
    role: Role;
    subrole?: string;
    tone: Tone;
    intent: Intent;
    prefs: Prefs;
  }) => void;
}) {
  const [showReflectorExtras, setShowReflectorExtras] = useState(false);

  useEffect(() => {
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);

  function choose(payload: Parameters<typeof onComplete>[0]) {
    // persist basics so we don’t re-ask next visit
    localStorage.setItem('role', payload.role);
    if (payload.subrole) localStorage.setItem('subrole', payload.subrole);
    localStorage.setItem('tone', payload.tone);
    localStorage.setItem('intent', payload.intent);
    localStorage.setItem('prefs', JSON.stringify(payload.prefs));
    onComplete(payload);
    onClose();
  }

  // Card components
  const cardBase =
    'rounded-xl2 p-4 border border-white/15 hover:border-white/30 hover:bg-white/5 transition cursor-pointer h-full flex flex-col';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          aria-modal="true" role="dialog" aria-label="Welcome to Reflectly"
        >
          <motion.div
            className="glass max-w-3xl w-full rounded-2xl p-6 border border-white/15"
            initial={{ scale: .96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: .96, opacity: 0, y: 6 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Welcome to Reflectly</h2>
                <p className="text-mist/80 mt-1">
                  <strong>One paraphrase + one gentle question</strong> — feel heard, think clearer.
                </p>
              </div>
              <button onClick={onClose} className="opacity-70 hover:opacity-100"><X /></button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Reflector */}
              <div
                className={cardBase}
                onClick={() =>
                  choose({
                    role: 'reflector',
                    subrole: 'general',
                    tone: 'neutral',
                    intent: 'go_deep',
                    prefs: { reduceMotion: false, highContrast: false, fontScale: 1 },
                  })
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="opacity-80" />
                  <h3 className="font-medium">Reflector</h3>
                  <span className="text-xs opacity-60">(Student / Recently single / Widow[er])</span>
                </div>
                <p className="text-sm text-mist/80">
                  “Solve it” gives 2–3 concrete steps; “Go deeper” keeps it reflective. Tone softens high-stress moments.
                </p>

                {/* More options */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowReflectorExtras(v => !v); }}
                  className="mt-3 inline-flex items-center gap-1 text-xs opacity-80 hover:opacity-100"
                >
                  More options <ChevronDown size={14} />
                </button>

                <AnimatePresence>
                  {showReflectorExtras && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-3 grid grid-cols-2 gap-2"
                    >
                      <button
                        className="px-3 py-2 rounded-xl2 border border-white/15 hover:bg-white/5 text-sm inline-flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          choose({
                            role: 'reflector',
                            subrole: 'student',
                            tone: 'neutral',
                            intent: 'go_deep',
                            prefs: { reduceMotion: false, highContrast: false, fontScale: 1 },
                          });
                        }}
                      >
                        <GraduationCap size={14}/> Student
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl2 border border-white/15 hover:bg-white/5 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          choose({
                            role: 'reflector',
                            subrole: 'recently_single',
                            tone: 'calm',
                            intent: 'go_deep',
                            prefs: { reduceMotion: false, highContrast: false, fontScale: 1 },
                          });
                        }}
                      >
                        Recently single
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl2 border border-white/15 hover:bg-white/5 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          choose({
                            role: 'reflector',
                            subrole: 'widow_widower',
                            tone: 'calm',
                            intent: 'go_deep',
                            prefs: { reduceMotion: false, highContrast: false, fontScale: 1 },
                          });
                        }}
                      >
                        Widow / Widower
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl2 border border-white/15 hover:bg-white/5 text-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          choose({
                            role: 'reflector',
                            subrole: 'other',
                            tone: 'neutral',
                            intent: 'go_deep',
                            prefs: { reduceMotion: false, highContrast: false, fontScale: 1 },
                          });
                        }}
                      >
                        Other / not listed
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Older Adult */}
              <div
                className={cardBase}
                onClick={() =>
                  choose({
                    role: 'older_adult',
                    tone: 'calm',
                    intent: 'go_deep',
                    prefs: { reduceMotion: true, highContrast: false, fontScale: 1.1 },
                  })
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <UserRound className="opacity-80" />
                  <h3 className="font-medium">Older Adult</h3>
                </div>
                <p className="text-sm text-mist/80">
                  Simple choices reduce cognitive load; Calm tone by default; typing indicator reassures it’s working.
                </p>
              </div>

              {/* Access / Privacy-Sensitive */}
              <div
                className={cardBase}
                onClick={() =>
                  choose({
                    role: 'access_privacy',
                    tone: 'neutral',
                    intent: 'go_deep',
                    prefs: { reduceMotion: true, highContrast: true, fontScale: 1 },
                  })
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="opacity-80" />
                  <h3 className="font-medium">Access / Privacy-Sensitive</h3>
                </div>
                <p className="text-sm text-mist/80">
                  No sign-in, ephemeral sessions, on-demand summary. High contrast + reduced motion enabled.
                </p>
              </div>

              {/* Clinician Stakeholder (future) */}
              <div
                className={cardBase}
                onClick={() =>
                  choose({
                    role: 'clinician',
                    tone: 'neutral',
                    intent: 'go_deep',
                    prefs: { reduceMotion: false, highContrast: false, fontScale: 1 },
                  })
                }
              >
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="opacity-80" />
                  <h3 className="font-medium">Clinician Stakeholder (future)</h3>
                </div>
                <p className="text-sm text-mist/80">
                  Optional session summary (user-requested) for quick reflective recap; no server-stored transcripts.
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-xs text-mist/70">
                Non-clinical tool. If you’re in danger, contact local emergency services or a crisis hotline.
              </p>
              <button
                onClick={() => {
                  // Skip = generic reflector defaults
                  choose({
                    role: 'reflector',
                    subrole: 'general',
                    tone: 'neutral',
                    intent: 'go_deep',
                    prefs: { reduceMotion: false, highContrast: false, fontScale: 1 },
                  });
                }}
                className="text-sm opacity-80 hover:opacity-100"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
