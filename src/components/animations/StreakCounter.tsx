'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { StreakFlame } from './SVGIcons';

interface StreakCounterProps {
  streak: number;
  broken?: boolean;
}

export default function StreakCounter({ streak, broken }: StreakCounterProps) {
  if (streak < 2 && !broken) return null;

  // Scale intensity with streak
  const pulseScale = streak >= 8 ? 1.2 : streak >= 6 ? 1.15 : streak >= 4 ? 1.1 : 1.05;
  const pulseDuration = streak >= 8 ? 0.4 : streak >= 6 ? 0.6 : streak >= 4 ? 0.8 : 1.2;
  const flameSize = streak >= 8 ? 32 : streak >= 6 ? 28 : streak >= 4 ? 24 : 20;

  // Color escalation: orange → blue → white-hot
  const flameColor = streak >= 8 ? '#ffffff' : streak >= 6 ? '#00bfff' : '#ff6b00';
  const textColor = streak >= 8 ? '#ffffff' : streak >= 6 ? '#00bfff' : '#EAB308';
  const glowColor = streak >= 8
    ? '0 0 12px rgba(255,255,255,0.9), 0 0 24px rgba(0,191,255,0.6)'
    : streak >= 6
      ? '0 0 10px rgba(0,191,255,0.8), 0 0 20px rgba(0,191,255,0.4)'
      : '0 0 8px rgba(234,179,8,0.6)';

  return (
    <AnimatePresence>
      {broken ? (
        <motion.div
          key="broken"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 0, opacity: 0, rotate: 30 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-1"
        >
          <StreakFlame size={flameSize} color={flameColor} className="streak-glow" />
          <span
            className="font-black text-sm"
            style={{ color: textColor, textShadow: glowColor }}
          >
            {streak}
          </span>
        </motion.div>
      ) : streak >= 2 ? (
        <motion.div
          key="streak"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="flex items-center gap-1 relative"
        >
          {/* Fire border glow at 5+ streak */}
          {streak >= 5 && (
            <motion.div
              className="absolute -inset-2 rounded-full pointer-events-none"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{
                background: streak >= 8
                  ? 'radial-gradient(circle, rgba(255,255,255,0.3), transparent 70%)'
                  : streak >= 6
                    ? 'radial-gradient(circle, rgba(0,191,255,0.3), transparent 70%)'
                    : 'radial-gradient(circle, rgba(255,107,0,0.3), transparent 70%)',
              }}
            />
          )}
          <motion.div
            animate={{ scale: [1, pulseScale, 1] }}
            transition={{ repeat: Infinity, duration: pulseDuration }}
          >
            <StreakFlame size={flameSize} color={flameColor} className="streak-glow" />
          </motion.div>
          <motion.span
            key={streak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-black text-sm"
            style={{ color: textColor, textShadow: glowColor }}
          >
            {streak}
          </motion.span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
