'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import { countCompletedLines } from '@/lib/game/bingo';

export default function PlayerProgress() {
  const { bingoCard, settings } = useGameStore();

  if (bingoCard.length === 0) return null;

  const completed = countCompletedLines(bingoCard);
  const marked = bingoCard.filter((c) => c.marked).length;
  const target = settings.winCondition === 9 ? 9 : settings.winCondition;
  const label = settings.winCondition === 9 ? 'cells' : 'rows';
  const current = settings.winCondition === 9 ? marked : completed;
  const pct = Math.min((current / target) * 100, 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(217, 70, 239, 0.8)' }}
        >
          Bingo Progress
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: '#e2e8f0' }}
        >
          {current}/{target}
        </span>
      </div>
      <div
        className="relative w-full h-2.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(30, 20, 60, 0.8)', border: '1px solid rgba(217, 70, 239, 0.2)' }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #d946ef, #8b5cf6, #06b6d4)',
            boxShadow: '0 0 10px rgba(217, 70, 239, 0.5)',
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
