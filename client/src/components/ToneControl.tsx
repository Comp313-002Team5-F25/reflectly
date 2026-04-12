import { Sparkles, Heart, Sun } from 'lucide-react';

type Tone = 'calm' | 'neutral' | 'upbeat';

export default function ToneControl({
  value, onChange
}: { value: Tone; onChange: (t: Tone) => void }) {
  const base = 'px-3 py-2 rounded-xl2 border text-sm transition';
  const pill = (active: boolean) =>
    `${base} ${active ? 'bg-accent text-ink border-accent' : 'border-white/15 hover:bg-white/5'}`;

  return (
    <div className="glass rounded-xl2 p-3 flex items-center gap-2" role="radiogroup" aria-label="Tone">
      <span className="text-sm opacity-70">Tone:</span>
      <button
        type="button"
        className={pill(value==='calm')}
        role="radio"
        aria-checked={value==='calm'}
        onClick={()=>onChange('calm')}
      >
        <Heart size={14} className="inline -mt-0.5 mr-1" /> Calm
      </button>
      <button
        type="button"
        className={pill(value==='neutral')}
        role="radio"
        aria-checked={value==='neutral'}
        onClick={()=>onChange('neutral')}
      >
        <Sun size={14} className="inline -mt-0.5 mr-1" /> Neutral
      </button>
      <button
        type="button"
        className={pill(value==='upbeat')}
        role="radio"
        aria-checked={value==='upbeat'}
        onClick={()=>onChange('upbeat')}
      >
        <Sparkles size={14} className="inline -mt-0.5 mr-1" /> Upbeat
      </button>
    </div>
  );
}
