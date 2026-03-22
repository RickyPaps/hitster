'use client';

import { useEffect, useRef, memo } from 'react';
import gsap from 'gsap';
import { fireStars } from '@/lib/confetti';

interface BingoLineCelebrationProps {
  active: boolean;
  lineCount: number;
  onComplete: () => void;
}

export default memo(function BingoLineCelebration({ active, lineCount, onComplete }: BingoLineCelebrationProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;

    fireStars();

    const overlay = overlayRef.current;
    const backdrop = backdropRef.current;
    const banner = bannerRef.current;
    if (!overlay || !backdrop || !banner) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(overlay, { opacity: 1 });
      gsap.set(banner, { y: 0, opacity: 1, scale: 1 });
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Fade in overlay
      tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.3 });

      // Backdrop flash
      tl.fromTo(backdrop,
        { opacity: 0 },
        { opacity: 0.3, duration: 0.2, ease: 'power2.out' },
        0
      ).to(backdrop, { opacity: 0.1, duration: 0.4 }, 0.2);

      // Banner spring in
      tl.fromTo(banner,
        { y: -100, opacity: 0, scale: 0.8 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' },
        0.1
      );
    });

    const timer = setTimeout(onComplete, 2000);
    return () => {
      clearTimeout(timer);
      ctx.revert();
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ opacity: 0 }}
    >
      {/* Backdrop flash */}
      <div
        ref={backdropRef}
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.4), rgba(217,70,239,0.4))', opacity: 0 }}
      />

      {/* Banner */}
      <div
        ref={bannerRef}
        className="relative px-10 py-5 rounded-2xl text-center"
        style={{
          background: 'linear-gradient(135deg, rgba(234,179,8,0.9), rgba(217,70,239,0.9))',
          boxShadow: '0 0 40px rgba(234,179,8,0.5), 0 0 80px rgba(217,70,239,0.3)',
          opacity: 0,
        }}
      >
        <h2
          className="text-3xl font-black uppercase tracking-widest"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#fff',
            textShadow: '0 0 20px rgba(255,255,255,0.5)',
            animation: 'celebration-text-pulse 0.8s ease-in-out infinite',
          }}
        >
          {lineCount > 1 ? 'DOUBLE LINE!' : 'BINGO LINE!'}
        </h2>
      </div>
    </div>
  );
});
