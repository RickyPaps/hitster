'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface TimerProps {
  seconds: number;
  maxSeconds: number;
}

export default function Timer({ seconds, maxSeconds }: TimerProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const pct = (seconds / maxSeconds) * 100;
  const isLow = seconds <= 5;

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    gsap.to(el, { width: `${pct}%`, duration: 0.3, ease: 'none' });
  }, [pct]);

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-48 h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
        <div
          ref={barRef}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: isLow ? 'var(--error)' : 'var(--accent)',
            width: `${pct}%`,
          }}
        />
      </div>
      <span
        className={`text-2xl font-bold tabular-nums ${isLow ? 'animate-pulse' : ''}`}
        style={{ color: isLow ? 'var(--error)' : 'var(--text-primary)' }}
      >
        {seconds}s
      </span>
    </div>
  );
}
