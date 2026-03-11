'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Ember {
  id: number;
  x: number;        // lateral drift (px)
  y: number;        // upward travel (px, negative)
  size: number;
  color: string;
  delay: number;
  duration: number;
  wobble: number;    // lateral sine amplitude
}

interface FlameParticlesProps {
  /** When true, continuously emits fire embers */
  active: boolean;
  /** Number of particles per burst */
  count?: number;
  /** Duration of the entire effect in seconds */
  effectDuration?: number;
  /** Color palette for embers */
  colors?: string[];
  /** Container width constraint */
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

  if (embers.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 30,
      }}
    >
      {embers.map((e) => (
        <motion.div
          key={e.id}
          initial={{
            x: 0,
            y: 0,
            scale: 0,
            opacity: 0.9,
          }}
          animate={{
            x: [0, e.wobble * 0.5, e.x + e.wobble, e.x + e.wobble * 1.5],
            y: [0, e.y * 0.3, e.y * 0.7, e.y],
            scale: [0, 1.2, 0.8, 0],
            opacity: [0, 0.95, 0.7, 0],
          }}
          transition={{
            duration: e.duration,
            delay: e.delay,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '20%',
            width: e.size,
            height: e.size,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${e.color}, transparent)`,
            boxShadow: `0 0 ${e.size * 2}px ${e.color}`,
          }}
        />
      ))}
    </div>
  );
}
