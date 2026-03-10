'use client';

import { motion } from 'framer-motion';
import { LightningBolt } from './SVGIcons';

interface FloatingScoreProps {
  points: number;
  color?: string;
}

export default function FloatingScore({ points, color = '#00f2ff' }: FloatingScoreProps) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 1, scale: 0.5 }}
      animate={{ y: -60, opacity: 0, scale: 1.2 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
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
    </motion.div>
  );
}
