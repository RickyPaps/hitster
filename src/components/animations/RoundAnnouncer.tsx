'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RoundAnnouncerProps {
  roundNumber: number;
  /** Only show when this transitions to true */
  trigger: boolean;
}

export default function RoundAnnouncer({ roundNumber, trigger }: RoundAnnouncerProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (trigger && roundNumber > 0) {
      setVisible(true);
      setExiting(false);
      const exitTimer = setTimeout(() => setExiting(true), 900);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, 1300);
      return () => {
        clearTimeout(exitTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [trigger, roundNumber]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      style={{ background: 'rgba(13, 2, 22, 0.6)' }}
    >
      <AnimatePresence>
        <motion.div
          key={roundNumber}
          initial={{ x: '-100vw', scale: 1.5, opacity: 0 }}
          animate={
            exiting
              ? { x: '100vw', opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } }
              : { x: 0, scale: 1, opacity: 1, transition: { duration: 0.5, type: 'spring', stiffness: 300, damping: 25 } }
          }
          className="flex flex-col items-center"
        >
          <span
            className="text-sm font-black uppercase tracking-[0.4em] mb-2"
            style={{ color: '#00f2ff', textShadow: '0 0 15px rgba(0, 242, 255, 0.5)' }}
          >
            Round
          </span>
          <span
            className="text-8xl sm:text-9xl font-black"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(180deg, #EAB308 0%, #ff6b00 50%, #ff007f 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 30px rgba(234, 179, 8, 0.5)) drop-shadow(0 0 60px rgba(255, 0, 127, 0.3))',
            }}
          >
            {roundNumber}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
