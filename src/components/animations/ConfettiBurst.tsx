'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ConfettiStar, ConfettiDiamond, MusicalNote } from './SVGIcons';

const NEON_COLORS = ['#d946ef', '#00f2ff', '#8b5cf6', '#22c55e', '#EAB308', '#ff3355', '#bc13fe', '#33ff77'];

const SHAPES = [ConfettiStar, ConfettiDiamond, MusicalNote, null] as const;

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  ShapeComponent: typeof SHAPES[number];
  size: number;
}

interface ConfettiBurstProps {
  active: boolean;
  particleCount?: number;
  colors?: string[];
  duration?: number;
  spread?: number;
}

export default function ConfettiBurst({
  active,
  particleCount = 20,
  colors = NEON_COLORS,
  duration = 1.2,
  spread = 360,
}: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  const generateParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const angle = (spread / particleCount) * i + (Math.random() * 20 - 10);
      const rad = (angle * Math.PI) / 180;
      const distance = 60 + Math.random() * 120;
      newParticles.push({
        id: i,
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance - Math.random() * 40, // gravity pull
        rotation: Math.random() * 720 - 360,
        scale: 0.5 + Math.random() * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        ShapeComponent: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        size: 8 + Math.random() * 10,
      });
    }
    setParticles(newParticles);
  }, [particleCount, colors, spread]);

  useEffect(() => {
    if (active) {
      generateParticles();
      const timer = setTimeout(() => setParticles([]), duration * 1000 + 100);
      return () => clearTimeout(timer);
    }
  }, [active, generateParticles, duration]);

  if (particles.length === 0) return null;

  return (
    <div className="confetti-container">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            x: 0,
            y: 0,
            rotate: 0,
            scale: 0,
            opacity: 1,
          }}
          animate={{
            x: p.x,
            y: p.y + 30, // gravity
            rotate: p.rotation,
            scale: [0, p.scale, p.scale * 0.5],
            opacity: [1, 1, 0],
          }}
          transition={{
            duration,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            pointerEvents: 'none',
          }}
        >
          {p.ShapeComponent ? (
            <p.ShapeComponent size={p.size} color={p.color} />
          ) : (
            <div
              style={{
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: p.color,
              }}
            />
          )}
        </motion.div>
      ))}
    </div>
  );
}
