'use client';

import { memo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { StreakFlame } from './SVGIcons';

interface StreakCounterProps {
  streak: number;
  broken?: boolean;
}

export default memo(function StreakCounter({ streak, broken }: StreakCounterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flameRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Scale intensity with streak
  const pulseScale = streak >= 8 ? 1.2 : streak >= 6 ? 1.15 : streak >= 4 ? 1.1 : 1.05;
  const pulseDuration = streak >= 8 ? 0.4 : streak >= 6 ? 0.6 : streak >= 4 ? 0.8 : 1.2;
  const flameSize = streak >= 8 ? 32 : streak >= 6 ? 28 : streak >= 4 ? 24 : 20;

  // Color escalation
  const flameColor = streak >= 8 ? '#ffffff' : streak >= 6 ? '#00bfff' : '#ff6b00';
  const textColor = streak >= 8 ? '#ffffff' : streak >= 6 ? '#00bfff' : '#EAB308';
  const glowColor = streak >= 8
    ? '0 0 12px rgba(255,255,255,0.9), 0 0 24px rgba(0,191,255,0.6)'
    : streak >= 6
      ? '0 0 10px rgba(0,191,255,0.8), 0 0 20px rgba(0,191,255,0.4)'
      : '0 0 8px rgba(234,179,8,0.6)';

  // Entrance / broken animation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      if (broken) {
        gsap.to(el, { scale: 0, opacity: 0, rotation: 30, duration: 0.4, ease: 'power2.in' });
      } else if (streak >= 2) {
        gsap.fromTo(el,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
        );
      }
    });
    return () => ctx.revert();
  }, [broken, streak >= 2]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pulse animation on flame
  useEffect(() => {
    const el = flameRef.current;
    if (!el || streak < 2 || broken) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        scale: pulseScale,
        duration: pulseDuration / 2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    });
    return () => ctx.revert();
  }, [streak, broken, pulseScale, pulseDuration]);

  // Glow pulse at 5+
  useEffect(() => {
    const el = glowRef.current;
    if (!el || streak < 5 || broken) return;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        opacity: 0.8,
        duration: 0.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    });
    return () => ctx.revert();
  }, [streak, broken]);

  // Number pop on change
  useEffect(() => {
    const el = numberRef.current;
    if (!el || streak < 2) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { scale: 1.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' }
      );
    });
    return () => ctx.revert();
  }, [streak]);

  // Label entrance
  useEffect(() => {
    const el = labelRef.current;
    if (!el || streak < 3) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { opacity: 0, x: -5 },
        { opacity: 0.8, x: 0, duration: 0.3, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, [streak >= 8 ? 8 : streak >= 5 ? 5 : streak >= 3 ? 3 : 0]); // eslint-disable-line react-hooks/exhaustive-deps

  if (streak < 2 && !broken) return null;

  return (
    <div ref={containerRef} className="flex items-center gap-1 relative">
      {/* Fire border glow at 5+ streak */}
      {streak >= 5 && (
        <div
          ref={glowRef}
          className="absolute -inset-2 rounded-full pointer-events-none"
          style={{
            opacity: 0.4,
            background: streak >= 8
              ? 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)'
              : streak >= 6
                ? 'radial-gradient(circle, rgba(0,191,255,0.3), transparent 70%)'
                : 'radial-gradient(circle, rgba(255,107,0,0.3), transparent 70%)',
          }}
        />
      )}
      <div ref={flameRef}>
        <StreakFlame size={flameSize} color={flameColor} className="streak-glow" />
      </div>
      <span
        ref={numberRef}
        className="font-black text-sm"
        style={{ color: textColor, textShadow: glowColor }}
      >
        {streak}
      </span>
      {streak >= 3 && (
        <span
          ref={labelRef}
          className="text-[10px] font-black uppercase tracking-wider"
          style={{ color: textColor, opacity: 0 }}
        >
          {streak >= 8 ? 'LEGENDARY' : streak >= 5 ? 'UNSTOPPABLE' : 'ON FIRE'}
        </span>
      )}
    </div>
  );
});
