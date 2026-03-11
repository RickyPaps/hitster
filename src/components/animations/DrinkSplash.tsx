'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

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

  const generate = useCallback(() => {
    const drops: Droplet[] = [];
    for (let i = 0; i < count; i++) {
      drops.push({
        id: i,
        x: Math.random() * 100, // % across screen width
        y: -(10 + Math.random() * 20), // start above viewport
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

  if (droplets.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {droplets.map((d) => (
        <motion.div
          key={d.id}
          initial={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            scale: 0,
            opacity: 0,
          }}
          animate={{
            top: ['0%', '70%', '100%'],
            scale: [0, 1.2, 0.4],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: d.duration,
            delay: d.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{
            position: 'absolute',
            left: `${d.x}%`,
            width: d.size,
            height: d.size * 1.4,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            background: `radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.4), ${d.color})`,
            boxShadow: `0 0 ${d.size}px ${d.color}`,
          }}
        />
      ))}
    </div>
  );
}
