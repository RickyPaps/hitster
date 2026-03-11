'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StreakFlame } from './SVGIcons';

interface StreakCounterProps {
  streak: number;
  broken?: boolean;
}

export default memo(function StreakCounter({ streak, broken }: StreakCounterProps) {
  if (streak < 2 && !broken) return null;

  const flameSize = streak >= 6 ? 28 : streak >= 4 ? 24 : 20;
  const pulseClass = streak >= 6 ? 'streak-pulse-heavy' : streak >= 4 ? 'streak-pulse-medium' : 'streak-pulse-light';

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
          <StreakFlame size={flameSize} className="streak-glow" />
          <span
            className="font-black text-sm"
            style={{ color: '#EAB308', textShadow: '0 0 8px rgba(234,179,8,0.6)' }}
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
          className="flex items-center gap-1"
        >
          <div className={pulseClass}>
            <StreakFlame size={flameSize} className="streak-glow" />
          </div>
          <motion.span
            key={streak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-black text-sm"
            style={{ color: '#EAB308', textShadow: '0 0 8px rgba(234,179,8,0.6)' }}
          >
            {streak}
          </motion.span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});
