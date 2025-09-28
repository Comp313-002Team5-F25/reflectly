// client/src/components/IntentControl.tsx
import { Target, Brain } from 'lucide-react';

type Intent = 'go_deep' | 'solve';

export default function IntentControl({
  value, onChange
}: { value: Intent; onChange: (i: Intent)=>void }) {
  const btn = 'px-3 py-2 rounded-xl2 border border-white/15 hover:bg-white/5 transition text-sm';
  return (
    <div className="glass rounded-xl2 p-3 flex items-center gap-2">
      <span className="text-sm opacity-70">Intent:</span>
      <button className={`${btn} ${value==='go_deep'?'bg-white/10':''}`} onClick={()=>onChange('go_deep')}>
        <Brain size={14} className="inline -mt-0.5 mr-1" /> Go deeper
      </button>
      <button className={`${btn} ${value==='solve'?'bg-white/10':''}`} onClick={()=>onChange('solve')}>
        <Target size={14} className="inline -mt-0.5 mr-1" /> Solve it
      </button>
    </div>
  );
}
