'use client';

import { useEffect, useRef, memo } from 'react';
import gsap from 'gsap';

interface ScreenShakeProps {
  trigger: boolean;
  intensity?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
}

const shakeAmounts = {
  light: 4,
  medium: 8,
  heavy: 12,
};

const shakeDurations = {
  light: 0.35,
  medium: 0.5,
  heavy: 0.65,
};

export default memo(function ScreenShake({ trigger, intensity = 'medium', children }: ScreenShakeProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trigger) return;
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const amt = shakeAmounts[intensity];
    const dur = shakeDurations[intensity];
    const steps = intensity === 'heavy' ? 9 : 7;

    const ctx = gsap.context(() => {
      gsap.to(el, {
        keyframes: Array.from({ length: steps }, (_, i) => {
          if (i === steps - 1) return { x: 0, duration: dur / steps };
          const factor = 1 - i / steps;
          return {
            x: (i % 2 === 0 ? -1 : 1) * amt * factor,
            duration: dur / steps,
          };
        }),
        ease: 'power1.inOut',
      });
    });
    return () => ctx.revert();
  }, [trigger, intensity]);

  return <div ref={ref}>{children}</div>;
});
