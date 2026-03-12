'use client';

import { useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fireStars } from '@/lib/confetti';

interface BingoLineCelebrationProps {
  active: boolean;
  lineCount: number;
  onComplete: () => void;
}

export default memo(function BingoLineCelebration({ active, lineCount, onComplete }: BingoLineCelebrationProps) {
  useEffect(() => {
    if (active) {
      fireStars();
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop flash */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.1] }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.4), rgba(217,70,239,0.4))' }}
          />

          {/* Banner */}
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="relative px-10 py-5 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(135deg, rgba(234,179,8,0.9), rgba(217,70,239,0.9))',
              boxShadow: '0 0 40px rgba(234,179,8,0.5), 0 0 80px rgba(217,70,239,0.3)',
            }}
          >
            <h2
              className="text-3xl font-black uppercase tracking-widest"
              style={{
                fontFamily: 'var(--font-display)',
                color: '#fff',
                textShadow: '0 0 20px rgba(255,255,255,0.5)',
                animation: 'celebration-text-pulse 0.8s ease-in-out infinite',
              }}
            >
              {lineCount > 1 ? 'DOUBLE LINE!' : 'BINGO LINE!'}
            </h2>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
