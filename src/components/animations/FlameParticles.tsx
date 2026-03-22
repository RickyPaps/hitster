'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';

interface Ember {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  wobble: number;
}

interface FlameParticlesProps {
  active: boolean;
  count?: number;
  effectDuration?: number;
  colors?: string[];
  width?: number;
}

const FIRE_COLORS = ['#ff4500', '#ff6b00', '#ff9500', '#ffb700', '#EAB308', '#fff176', '#ffffff'];

export default function FlameParticles({
  active,
  count = 20,
  effectDuration = 2,
  colors = FIRE_COLORS,
  width = 120,
}: FlameParticlesProps) {
  const [embers, setEmbers] = useState<Ember[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateEmbers = useCallback(() => {
    const newEmbers: Ember[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / count;
      newEmbers.push({
        id: i,
        x: (Math.random() - 0.5) * width,
        y: -(40 + Math.random() * 80),
        size: 3 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: t * effectDuration * 0.4,
        duration: 0.6 + Math.random() * 0.8,
        wobble: (Math.random() - 0.5) * 30,
      });
    }
    setEmbers(newEmbers);
  }, [count, effectDuration, colors, width]);

  useEffect(() => {
    if (active) {
      generateEmbers();
      const timer = setTimeout(() => setEmbers([]), effectDuration * 1000 + 200);
      return () => clearTimeout(timer);
    } else {
      setEmbers([]);
    }
  }, [active, generateEmbers, effectDuration]);

  // Animate embers with GSAP
  useEffect(() => {
    if (embers.length === 0) return;
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const els = container.querySelectorAll('.flame-ember');
      els.forEach((el, i) => {
        const e = embers[i];
        if (!e) return;
        gsap.fromTo(el,
          { x: 0, y: 0, scale: 0, opacity: 0.9 },
          {
            keyframes: [
              { x: 0, y: 0, scale: 0, opacity: 0.9, duration: 0 },
              { x: e.wobble * 0.5, y: e.y * 0.3, scale: 1.2, opacity: 0.95, duration: e.duration * 0.3 },
              { x: e.x + e.wobble, y: e.y * 0.7, scale: 0.8, opacity: 0.7, duration: e.duration * 0.4 },
              { x: e.x + e.wobble * 1.5, y: e.y, scale: 0, opacity: 0, duration: e.duration * 0.3 },
            ],
            delay: e.delay,
            ease: 'power2.out',
          }
        );
      });
    });
    return () => ctx.revert();
  }, [embers]);

  if (embers.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 30,
      }}
    >
      {embers.map((e) => (
        <div
          key={e.id}
          className="flame-ember"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '20%',
            width: e.size,
            height: e.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${e.color}, transparent)`,
            boxShadow: `0 0 ${e.size * 2}px ${e.color}`,
            opacity: 0,
            transform: 'scale(0)',
          }}
        />
      ))}
    </div>
  );
}
