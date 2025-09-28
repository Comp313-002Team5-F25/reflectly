// client/src/components/ToneControl.tsx
import { Sparkles, Heart, Sun } from 'lucide-react';

type Tone = 'calm' | 'neutral' | 'upbeat';
export default function ToneControl({ value, onChange }: { value: Tone; onChange: (t: Tone) => void; }) {
  const btn = 'px-3 py-2 rounded-xl2 border border-white/15 hover:bg-white/5 transition text-sm';
  return (
    <div className="glass rounded-xl2 p-3 flex items-center gap-2">
      <span className="text-sm opacity-70">Tone:</span>
      <button className={`${btn} ${value==='calm'?'bg-white/10':''}`} onClick={()=>onChange('calm')}>
        <Heart size={14} className="inline -mt-0.5 mr-1" /> Calm
      </button>
      <button className={`${btn} ${value==='neutral'?'bg-white/10':''}`} onClick={()=>onChange('neutral')}>
        <Sun size={14} className="inline -mt-0.5 mr-1" /> Neutral
      </button>
      <button className={`${btn} ${value==='upbeat'?'bg-white/10':''}`} onClick={()=>onChange('upbeat')}>
        <Sparkles size={14} className="inline -mt-0.5 mr-1" /> Upbeat
      </button>
    </div>
  );
}
