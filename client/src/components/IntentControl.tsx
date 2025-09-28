import { Target, Brain } from 'lucide-react';

type Intent = 'go_deep' | 'solve';

export default function IntentControl({
  value, onChange
}: { value: Intent; onChange: (i: Intent)=>void }) {
  const base = 'px-3 py-2 rounded-xl2 border text-sm transition';
  const pill = (active: boolean) =>
    `${base} ${active ? 'bg-accent text-ink border-accent' : 'border-white/15 hover:bg-white/5'}`;

  return (
    <div className="glass rounded-xl2 p-3 flex items-center gap-2" role="radiogroup" aria-label="Intent">
      <span className="text-sm opacity-70">Intent:</span>
      <button
        type="button"
        className={pill(value==='go_deep')}
        role="radio"
        aria-checked={value==='go_deep'}
        onClick={()=>onChange('go_deep')}
      >
        <Brain size={14} className="inline -mt-0.5 mr-1" /> Go deeper
      </button>
      <button
        type="button"
        className={pill(value==='solve')}
        role="radio"
        aria-checked={value==='solve'}
        onClick={()=>onChange('solve')}
      >
        <Target size={14} className="inline -mt-0.5 mr-1" /> Solve it
      </button>
    </div>
  );
}
