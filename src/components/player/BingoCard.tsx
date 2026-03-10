'use client';

import { motion } from 'framer-motion';
import type { BingoCell, GuessCategory } from '@/types/game';

interface BingoCardProps {
  cells: BingoCell[];
  compact?: boolean;
}

const CATEGORY_ICONS: Record<GuessCategory, string> = {
  year: '\u{1F4C5}',
  'year-approx': '\u{1F570}',
  artist: '\u{1F3A4}',
  title: '\u{1F3B5}',
  album: '\u{1F4BF}',
};

const CATEGORY_LABELS: Record<GuessCategory, string> = {
  year: 'YEAR',
  'year-approx': 'YEAR \u00B13',
  artist: 'ARTIST',
  title: 'SONG TITLE',
  album: 'ALBUM',
};

export default function BingoCard({ cells, compact }: BingoCardProps) {
  if (cells.length === 0) return null;

  return (
    <div className={`grid grid-cols-3 ${compact ? 'gap-1.5 w-36' : 'gap-2.5 w-full max-w-[340px]'}`}>
      {cells.map((cell, i) => {
        const icon = CATEGORY_ICONS[cell.category];
        const label = CATEGORY_LABELS[cell.category];
        const isCenter = i === 4;

        return (
          <motion.div
            key={i}
            animate={cell.marked ? { scale: [1, 1.08, 1] } : {}}
            transition={{ duration: 0.4 }}
            className="relative aspect-square rounded-xl flex flex-col items-center justify-center overflow-hidden"
            style={
              compact
                ? {
                    background: cell.marked
                      ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.5), rgba(139, 92, 246, 0.5))'
                      : 'rgba(30, 20, 60, 0.8)',
                    border: cell.marked
                      ? '2px solid rgba(217, 70, 239, 0.9)'
                      : '1.5px solid rgba(217, 70, 239, 0.3)',
                    boxShadow: cell.marked
                      ? '0 0 12px rgba(217, 70, 239, 0.5), inset 0 0 8px rgba(217, 70, 239, 0.2)'
                      : 'none',
                  }
                : {
                    background: cell.marked
                      ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.45), rgba(139, 92, 246, 0.45))'
                      : isCenter
                        ? 'linear-gradient(135deg, rgba(45, 20, 80, 0.9), rgba(30, 15, 60, 0.9))'
                        : 'rgba(20, 12, 50, 0.85)',
                    border: cell.marked
                      ? '2px solid rgba(217, 70, 239, 0.9)'
                      : '1.5px solid rgba(217, 70, 239, 0.35)',
                    boxShadow: cell.marked
                      ? '0 0 15px rgba(217, 70, 239, 0.5), inset 0 0 10px rgba(217, 70, 239, 0.2)'
                      : '0 0 6px rgba(217, 70, 239, 0.1)',
                  }
            }
          >
            {cell.marked ? (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex flex-col items-center justify-center"
              >
                <span className={compact ? 'text-base' : 'text-2xl'} style={{ filter: 'drop-shadow(0 0 6px rgba(217, 70, 239, 0.8))' }}>
                  {icon}
                </span>
                {!compact && (
                  <span
                    className="text-[10px] font-bold mt-1 tracking-wider"
                    style={{ color: 'rgba(217, 70, 239, 1)', textShadow: '0 0 8px rgba(217, 70, 239, 0.6)' }}
                  >
                    {label}
                  </span>
                )}
                <div
                  className={`absolute ${compact ? 'top-0.5 right-0.5' : 'top-1 right-1'} rounded-full flex items-center justify-center`}
                  style={{
                    width: compact ? '14px' : '20px',
                    height: compact ? '14px' : '20px',
                    background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
                    boxShadow: '0 0 8px rgba(217, 70, 239, 0.6)',
                  }}
                >
                  <span className={compact ? 'text-[8px]' : 'text-[10px]'} style={{ color: '#fff', fontWeight: 800 }}>
                    &#x2713;
                  </span>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <span
                  className={compact ? 'text-base' : 'text-2xl'}
                  style={{ opacity: 0.7, filter: 'grayscale(0.3)' }}
                >
                  {icon}
                </span>
                {!compact && (
                  <span
                    className="text-[10px] font-semibold mt-1 tracking-wider uppercase"
                    style={{ color: 'rgba(148, 120, 200, 0.8)' }}
                  >
                    {label}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
