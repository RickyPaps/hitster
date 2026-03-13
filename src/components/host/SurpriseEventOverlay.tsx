'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SurpriseIcon } from '@/components/animations/SVGIcons';
import { fireConfetti } from '@/lib/confetti';
import type { SurpriseEventType } from '@/types/game';

interface EventConfig {
  title: string;
  getSubtitle: (name: string | null, name2?: string | null) => string;
  color: string;
  colorRgb: string;
  confetti: boolean;
}

const EVENT_CONFIG: Record<SurpriseEventType, EventConfig> = {
  spotlight: {
    title: 'SPOTLIGHT!',
    getSubtitle: (name) => `${name ?? 'A player'} takes a drink!`,
    color: '#ff4da6',
    colorRgb: '255, 77, 166',
    confetti: false,
  },
  doubleRound: {
    title: 'DOUBLE ROUND!',
    getSubtitle: () => 'All scores 2x next round!',
    color: '#ff8833',
    colorRgb: '255, 136, 51',
    confetti: true,
  },
  everybodyCheers: {
    title: 'EVERYBODY CHEERS!',
    getSubtitle: () => 'All players take a drink!',
    color: '#EAB308',
    colorRgb: '234, 179, 8',
    confetti: true,
  },
  categoryCurse: {
    title: 'CATEGORY CURSE!',
    getSubtitle: (name) => `${name ?? 'A player'} loses a marked cell!`,
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    confetti: false,
  },
  luckyStar: {
    title: 'LUCKY STAR!',
    getSubtitle: (name) => `${name ?? 'A player'} gets a free cell!`,
    color: '#33ff77',
    colorRgb: '51, 255, 119',
    confetti: true,
  },
  hotSeat: {
    title: 'HOT SEAT!',
    getSubtitle: (name) => `${name ?? 'A player'}: wrong answer = 2x drinks next round!`,
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    confetti: false,
  },
  timePressure: {
    title: 'TIME PRESSURE!',
    getSubtitle: () => 'Half the time next round — think fast!',
    color: '#f59e0b',
    colorRgb: '245, 158, 11',
    confetti: false,
  },
  streakBreaker: {
    title: 'STREAK BREAKER!',
    getSubtitle: (name) => `${name ?? 'A player'}'s streak has been shattered!`,
    color: '#f97316',
    colorRgb: '249, 115, 22',
    confetti: false,
  },
  scoreSwap: {
    title: 'SCORE SWAP!',
    getSubtitle: (name, name2) => `${name ?? 'A player'} and ${name2 ?? 'another player'} swap scores!`,
    color: '#a855f7',
    colorRgb: '168, 85, 247',
    confetti: true,
  },
  pointThief: {
    title: 'POINT THIEF!',
    getSubtitle: (name, name2) => `${name ?? 'A player'} steals 150 pts from ${name2 ?? 'another player'}!`,
    color: '#dc2626',
    colorRgb: '220, 38, 38',
    confetti: false,
  },
};

interface SurpriseEventOverlayProps {
  event: { type: SurpriseEventType; targetName: string | null; targetName2?: string | null } | null;
  onComplete: () => void;
}

export default function SurpriseEventOverlay({ event, onComplete }: SurpriseEventOverlayProps) {
  useEffect(() => {
    if (event) {
      const config = EVENT_CONFIG[event.type];
      if (config.confetti) {
        fireConfetti({ particleCount: 20, origin: { x: 0.25, y: 0.4 } });
        fireConfetti({ particleCount: 20, origin: { x: 0.75, y: 0.4 } });
      }
      const timer = setTimeout(onComplete, 4000);
      return () => clearTimeout(timer);
    }
  }, [event, onComplete]);

  if (!event) return null;

  const config = EVENT_CONFIG[event.type];

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={event.type + (event.targetName ?? '')}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop flash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0.15] }}
            transition={{ duration: 0.5 }}
            style={{ background: `rgba(${config.colorRgb}, 0.2)` }}
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="relative rounded-3xl p-8 text-center max-w-md mx-4"
            style={{
              background: `linear-gradient(135deg, rgba(${config.colorRgb}, 0.15), rgba(20, 12, 50, 0.95))`,
              border: `2px solid rgba(${config.colorRgb}, 0.5)`,
              boxShadow: `0 0 60px rgba(${config.colorRgb}, 0.3)`,
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
              className="mb-3 flex justify-center"
            >
              <SurpriseIcon size={48} color={config.color} />
            </motion.div>
            <h2
              className="text-3xl font-black uppercase tracking-wider mb-2"
              style={{
                fontFamily: 'var(--font-display)',
                color: config.color,
                textShadow: `0 0 20px rgba(${config.colorRgb}, 0.6)`,
              }}
            >
              {config.title}
            </h2>
            <p
              className="text-lg font-semibold"
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              {config.getSubtitle(event.targetName, event.targetName2)}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
