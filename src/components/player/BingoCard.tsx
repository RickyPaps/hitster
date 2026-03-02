'use client';

import { motion } from 'framer-motion';
import type { BingoCell } from '@/types/game';
import { WHEEL_SEGMENTS } from '@/types/game';

interface BingoCardProps {
  cells: BingoCell[];
  compact?: boolean;
}

export default function BingoCard({ cells, compact }: BingoCardProps) {
  if (cells.length === 0) return null;

  return (
    <div className={`grid grid-cols-3 gap-1.5 ${compact ? 'w-36' : 'w-full max-w-[280px]'}`}>
      {cells.map((cell, i) => {
        const segment = WHEEL_SEGMENTS.find((s) => s.category === cell.category);
        return (
          <motion.div
            key={i}
            animate={cell.marked ? { scale: [1, 1.15, 1] } : {}}
            className={`aspect-square rounded-lg flex items-center justify-center font-bold relative overflow-hidden ${
              compact ? 'text-[10px]' : 'text-xs'
            }`}
            style={{
              backgroundColor: cell.marked ? segment?.color : 'var(--bg-secondary)',
              opacity: cell.marked ? 1 : 0.6,
              border: cell.marked ? 'none' : `2px solid ${segment?.color}40`,
            }}
          >
            {cell.marked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className={compact ? 'text-lg' : 'text-2xl'}>✓</span>
              </motion.div>
            )}
            {!cell.marked && (
              <span style={{ color: segment?.color }}>
                {segment?.label}
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
