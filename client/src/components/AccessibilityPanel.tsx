import { useEffect, useState } from 'react';
import { Accessibility, Contrast, Type } from 'lucide-react';

type Props = {
  onChange: (prefs: { reduceMotion: boolean; highContrast: boolean; fontScale: number }) => void;
};

export default function AccessibilityPanel({ onChange }: Props) {
  const [reduceMotion, setReduce] = useState(false);
  const [highContrast, setContrast] = useState(false);
  const [fontScale, setScale] = useState(1);

  useEffect(() => {
    onChange({ reduceMotion, highContrast, fontScale });
  }, [reduceMotion, highContrast, fontScale, onChange]);

  return (
    <div className="glass rounded-xl2 p-3 flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Accessibility size={16} /> <label>Reduce motion</label>
        <input type="checkbox" className="ml-2" checked={reduceMotion} onChange={(e) => setReduce(e.target.checked)} />
      </div>
      <div className="flex items-center gap-2">
        <Contrast size={16} /> <label>High contrast</label>
        <input type="checkbox" className="ml-2" checked={highContrast} onChange={(e) => setContrast(e.target.checked)} />
      </div>
      <div className="flex items-center gap-2">
        <Type size={16} /> <label>Font</label>
        <input
          type="range"
          min="0.9"
          max="1.3"
          step="0.05"
          value={fontScale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
        />
      </div>
    </div>
  );
}
