// client/src/components/Hero.tsx
import { motion, useScroll, useTransform } from 'framer-motion';

type HeroProps = {
  subtitle?: string;
};

export default function Hero({ subtitle }: HeroProps) {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 400], [0, 60]);
  const y2 = useTransform(scrollY, [0, 400], [0, -40]);
  const scale = useTransform(scrollY, [0, 400], [1, 0.95]);

  return (
    <section className="relative overflow-hidden h-[68vh] gradient-blob">
      <motion.div style={{ y: y2 }} className="absolute -top-20 right-0 w-[50vw] h-[50vh] rounded-full blur-3xl opacity-40 bg-accent/30" />
      <motion.div style={{ y: y1 }} className="absolute -left-20 top-20 w-[40vw] h-[40vh] rounded-full blur-3xl opacity-30 bg-amber/30" />

      <div className="relative max-w-6xl mx-auto h-full flex items-center px-6">
        <motion.div style={{ scale }} className="glass rounded-xl2 p-8 shadow-soft">
          <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">Reflectly</h1>

          {/* subtitle under the title if provided */}
          {subtitle && (
            <p className="mt-2 text-mist/70 text-sm">{subtitle}</p>
          )}

          <p className="mt-4 max-w-2xl text-mist/80 text-lg">
            A calming space to be heard. We paraphrase your thoughts and gently ask one question to help you go deeper.
          </p>
          <div className="mt-6 flex gap-3">
            <a href="#chat" className="px-5 py-3 rounded-xl2 bg-accent text-ink font-medium hover:opacity-90 transition">Start reflecting</a>
            <a href="#about" className="px-5 py-3 rounded-xl2 border border-white/15 hover:bg-white/5 transition">Learn more</a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
