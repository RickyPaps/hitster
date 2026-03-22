'use client';

import { memo, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { LightningBolt } from './SVGIcons';

interface FloatingScoreProps {
  points: number;
  color?: string;
}

export default memo(function FloatingScore({ points, color = '#00f2ff' }: FloatingScoreProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { y: 0, opacity: 1, scale: 0.5 },
        { y: -60, opacity: 0, scale: 1.2, duration: 0.8, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '40%',
        left: '50%',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 60,
      }}
    >
      <span
        className="font-black text-2xl flex items-center gap-1"
        style={{
          color,
          textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
        }}
      >
        {points > 100 && <LightningBolt size={18} color={color} />}
        +{points}
      </span>
    </div>
  );
});
