'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface RoundAnnouncerProps {
  roundNumber: number;
  /** Only show when this transitions to true */
  trigger: boolean;
}

export default function RoundAnnouncer({ roundNumber, trigger }: RoundAnnouncerProps) {
  const [visible, setVisible] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (trigger && roundNumber > 0) {
      setVisible(true);
    }
  }, [trigger, roundNumber]);

  useEffect(() => {
    if (!visible) return;
    const el = contentRef.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setVisible(false),
      });

      if (reduced) {
        tl.set(el, { x: 0, scale: 1, opacity: 1 })
          .to(el, { opacity: 0, duration: 0.1, delay: 0.9 });
        return;
      }

      // Spring entrance from left
      tl.fromTo(el,
        { x: '-100vw', scale: 1.5, opacity: 0 },
        { x: 0, scale: 1, opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.6)' }
      )
      // Hold
      .to(el, { duration: 0.4 })
      // Exit to right
      .to(el, { x: '100vw', opacity: 0, duration: 0.3, ease: 'power2.in' });
    });

    return () => ctx.revert();
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      style={{ background: 'rgba(13, 2, 22, 0.6)' }}
    >
      <div ref={contentRef} className="flex flex-col items-center" style={{ opacity: 0 }}>
        <span
          className="text-sm font-black uppercase tracking-[0.4em] mb-2"
          style={{ color: '#00f2ff', textShadow: '0 0 15px rgba(0, 242, 255, 0.5)' }}
        >
          Round
        </span>
        <span
          className="text-8xl sm:text-9xl font-black"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(180deg, #EAB308 0%, #ff6b00 50%, #ff007f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 30px rgba(234, 179, 8, 0.5)) drop-shadow(0 0 60px rgba(255, 0, 127, 0.3))',
          }}
        >
          {roundNumber}
        </span>
      </div>
    </div>
  );
}
