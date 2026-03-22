'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ALL_WHEEL_SEGMENTS } from '@/types/game';

interface CategoryBadgeProps {
  category: string;
  large?: boolean;
}

export default function CategoryBadge({ category, large }: CategoryBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const segment = ALL_WHEEL_SEGMENTS.find((s) => s.category === category);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { scale: 1, opacity: 1 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
      );
    });
    return () => ctx.revert();
  }, [category]);

  if (!segment) return null;

  return (
    <span
      ref={ref}
      className={`inline-block rounded-full font-bold ${large ? 'px-6 py-2 text-xl' : 'px-3 py-1 text-sm'}`}
      style={{ backgroundColor: segment.color, color: '#fff', opacity: 0, transform: 'scale(0)' }}
    >
      {segment.label}
    </span>
  );
}
