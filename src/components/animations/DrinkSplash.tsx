'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';

interface Droplet {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

interface DrinkSplashProps {
  active: boolean;
  count?: number;
}

const LIQUID_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#EAB308', '#fbbf24', '#fcd34d'];

export default function DrinkSplash({ active, count = 12 }: DrinkSplashProps) {
  const [droplets, setDroplets] = useState<Droplet[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(() => {
    const drops: Droplet[] = [];
    for (let i = 0; i < count; i++) {
      drops.push({
        id: i,
        x: Math.random() * 100,
        y: -(10 + Math.random() * 20),
        size: 6 + Math.random() * 10,
        color: LIQUID_COLORS[Math.floor(Math.random() * LIQUID_COLORS.length)],
        delay: Math.random() * 0.4,
        duration: 0.6 + Math.random() * 0.4,
      });
    }
    setDroplets(drops);
  }, [count]);

  useEffect(() => {
    if (active) {
      generate();
      const timer = setTimeout(() => setDroplets([]), 1500);
      return () => clearTimeout(timer);
    }
  }, [active, generate]);

  // Animate droplets with GSAP
  useEffect(() => {
    if (droplets.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const els = container.querySelectorAll('.drink-droplet');
      els.forEach((el, i) => {
        const d = droplets[i];
        if (!d) return;
        gsap.fromTo(el,
          { top: '0%', scale: 0, opacity: 0 },
          {
            keyframes: [
              { top: '0%', scale: 0, opacity: 0, duration: 0 },
              { top: '70%', scale: 1.2, opacity: 0.8, duration: d.duration * 0.6 },
              { top: '100%', scale: 0.4, opacity: 0, duration: d.duration * 0.4 },
            ],
            delay: d.delay,
            ease: 'power2.out',
          }
        );
      });
    });
    return () => ctx.revert();
  }, [droplets]);

  if (droplets.length === 0) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {droplets.map((d) => (
        <div
          key={d.id}
          className="drink-droplet"
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: d.size,
            height: d.size * 1.4,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            background: `radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.4), ${d.color})`,
            boxShadow: `0 0 ${d.size}px ${d.color}`,
            opacity: 0,
            transform: 'scale(0)',
          }}
        />
      ))}
    </div>
  );
}
