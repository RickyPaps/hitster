'use client';

import { memo, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { BingoCell, GuessCategory } from '@/types/game';
import { SparkleIcon, BingoCalendar, BingoArtist, BingoSongTitle, BingoAlbum, BingoYearApprox, BingoDecade } from '@/components/animations/SVGIcons';
import ConfettiBurst from '@/components/animations/ConfettiBurst';
import CellDisintegrate from '@/components/animations/CellDisintegrate';
import { useAudio } from '@/hooks/useAudio';
import type { ComponentType, SVGProps } from 'react';

interface BingoIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

interface BingoCardProps {
  cells: BingoCell[];
  compact?: boolean;
  pickableIndices?: Set<number>;
  onCellPick?: (index: number) => void;
}

const CATEGORY_LABELS: Partial<Record<GuessCategory, string>> = {
  year: 'YEAR',
  'year-approx': 'YEAR \u00B11',
  artist: 'ARTIST',
  title: 'SONG TITLE',
  album: 'ALBUM',
  decade: 'DECADE',
  director: 'DIRECTOR',
  'movie-title': 'MOVIE',
  genre: 'GENRE',
};

const CATEGORY_SVG: Partial<Record<GuessCategory, ComponentType<BingoIconProps>>> = {
  year: BingoCalendar,
  'year-approx': BingoYearApprox,
  artist: BingoArtist,
  title: BingoSongTitle,
  album: BingoAlbum,
  decade: BingoDecade,
  // Movie categories reuse closest icons
  director: BingoArtist,
  'movie-title': BingoSongTitle,
  genre: BingoAlbum,
};

// Compact mode still uses emoji for tiny cards
const CATEGORY_ICONS_COMPACT: Partial<Record<GuessCategory, string>> = {
  year: '\u{1F4C5}',
  'year-approx': '\u{1F570}',
  artist: '\u{1F3A4}',
  title: '\u{1F3B5}',
  album: '\u{1F4BF}',
  decade: '\u{1F4C6}',
  director: '\u{1F3AC}',
  'movie-title': '\u{1F3AC}',
  genre: '\u{1F3AD}',
};

interface BingoCellItemProps {
  cell: BingoCell;
  index: number;
  isNewlyMarked: boolean;
  isFlashing: boolean;
  isNearBingo: boolean;
}

const BingoCellItem = memo(function BingoCellItem({ cell, index: i, isNewlyMarked, isFlashing, isNearBingo }: BingoCellItemProps) {
  const label = CATEGORY_LABELS[cell.category];
  const SvgIcon = CATEGORY_SVG[cell.category];
  const isCenter = i === 4;

  // Colors: unmarked = muted fuchsia, marked = bright fuchsia, center = teal accent
  const unmarkedBg = isCenter
    ? 'linear-gradient(145deg, #1c0e35 0%, #2a1245 100%)'
    : 'linear-gradient(145deg, #1a0a30 0%, #250d3d 100%)';
  const markedBg = 'linear-gradient(145deg, rgba(217, 70, 239, 0.35) 0%, rgba(139, 92, 246, 0.35) 100%)';

  const unmarkedBorder = isCenter
    ? '2px solid rgba(45, 212, 191, 0.6)'
    : '1.5px solid rgba(217, 70, 239, 0.25)';
  const markedBorder = '2px solid rgba(217, 70, 239, 0.8)';

  const unmarkedShadow = isCenter
    ? '0 0 15px rgba(45, 212, 191, 0.3), inset 0 0 12px rgba(45, 212, 191, 0.08)'
    : 'inset 0 1px 0 rgba(255,255,255,0.03)';
  const markedShadow = '0 0 18px rgba(217, 70, 239, 0.5), inset 0 0 12px rgba(217, 70, 239, 0.15)';

  const iconColor = cell.marked
    ? '#d946ef'
    : isCenter ? '#2dd4bf' : 'rgba(180, 140, 220, 0.6)';

  return (
    <motion.div
      animate={cell.marked ? { scale: [1, 1.06, 1] } : {}}
      transition={{ duration: 0.4 }}
      className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center overflow-hidden ${isFlashing ? 'bingo-line-flash' : ''}`}
      style={{
        background: cell.marked ? markedBg : unmarkedBg,
        border: cell.marked ? markedBorder : unmarkedBorder,
        boxShadow: cell.marked ? markedShadow : unmarkedShadow,
      }}
    >
      {/* Near-bingo pulse overlay */}
      {isNearBingo && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none near-bingo-pulse"
          style={{ border: '1.5px solid rgba(234,179,8,0.35)' }}
        />
      )}

      {/* Sparkle overlay on newly marked cells */}
      {isNewlyMarked && (
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <SparkleIcon size={44} color="#d946ef" />
        </motion.div>
      )}

      {/* Icon */}
      <div className="flex flex-col items-center justify-center gap-1.5">
        {SvgIcon && (
          <SvgIcon
            size={30}
            color={iconColor}
            style={{
              filter: cell.marked
                ? 'drop-shadow(0 0 8px rgba(217, 70, 239, 0.7))'
                : 'none',
              transition: 'filter 0.3s',
            }}
          />
        )}
        <span
          className="text-[9px] font-black tracking-[0.15em] uppercase leading-none"
          style={{
            color: cell.marked
              ? '#d946ef'
              : isCenter ? '#2dd4bf' : 'rgba(180, 140, 220, 0.7)',
            textShadow: cell.marked
              ? '0 0 8px rgba(217, 70, 239, 0.5)'
              : 'none',
            transition: 'color 0.3s, text-shadow 0.3s',
          }}
        >
          {label}
        </span>
      </div>

      {/* Checkmark badge */}
      {cell.marked && (
        <motion.div
          initial={isNewlyMarked ? { scale: 0 } : { scale: 1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center"
          style={{
            width: '20px', height: '20px',
            background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
            boxShadow: '0 0 8px rgba(217, 70, 239, 0.6)',
          }}
        >
          <span className="text-[10px]" style={{ color: '#fff', fontWeight: 800 }}>&#x2713;</span>
        </motion.div>
      )}
    </motion.div>
  );
});

export default function BingoCard({ cells, compact, pickableIndices, onCellPick }: BingoCardProps) {
  const prevCellsRef = useRef<BingoCell[]>([]);
  const [newlyMarked, setNewlyMarked] = useState<Set<number>>(new Set());
  const [flashingLines, setFlashingLines] = useState<Set<number>>(new Set());
  const [showLineConfetti, setShowLineConfetti] = useState(false);
  const [disintegratingCells, setDisintegratingCells] = useState<Set<number>>(new Set());
  const { playSound } = useAudio();

  const handleDisintegrateComplete = useCallback((cellIdx: number) => {
    setDisintegratingCells((prev) => {
      const next = new Set(prev);
      next.delete(cellIdx);
      return next;
    });
  }, []);

  // Detect newly marked AND newly unmarked cells
  useEffect(() => {
    if (cells.length === 0 || prevCellsRef.current.length === 0) {
      prevCellsRef.current = cells;
      return;
    }

    const newMarks = new Set<number>();
    const newUnmarks = new Set<number>();

    cells.forEach((cell, i) => {
      const prev = prevCellsRef.current[i];
      if (cell.marked && !prev?.marked) {
        newMarks.add(i);
      }
      if (!cell.marked && prev?.marked) {
        newUnmarks.add(i);
      }
    });

    // Handle newly unmarked cells (block/curse) — disintegration effect
    if (newUnmarks.size > 0) {
      setDisintegratingCells(newUnmarks);
      playSound('cellBreak');
    }

    if (newMarks.size > 0) {
      setNewlyMarked(newMarks);
      const timer = setTimeout(() => setNewlyMarked(new Set()), 700);

      // Check for new line completions
      const prevCompleted = LINES.filter(line =>
        line.every(i => prevCellsRef.current[i]?.marked)
      ).length;
      const currentCompleted = LINES.filter(line =>
        line.every(i => cells[i]?.marked)
      ).length;

      if (currentCompleted > prevCompleted) {
        const newLines = new Set<number>();
        LINES.forEach((line) => {
          const wasComplete = line.every(i => prevCellsRef.current[i]?.marked);
          const isComplete = line.every(i => cells[i]?.marked);
          if (isComplete && !wasComplete) {
            line.forEach(i => newLines.add(i));
          }
        });
        setFlashingLines(newLines);
        setShowLineConfetti(true);
        setTimeout(() => {
          setFlashingLines(new Set());
          setShowLineConfetti(false);
        }, 1600);
      }

      prevCellsRef.current = cells;
      return () => clearTimeout(timer);
    }

    prevCellsRef.current = cells;
  }, [cells, playSound]);

  // Compute near-bingo cells
  const nearBingoCells = useMemo(() => {
    const near = new Set<number>();
    for (const line of LINES) {
      const unmarked = line.filter(i => !cells[i]?.marked);
      if (unmarked.length === 1) {
        near.add(unmarked[0]);
      }
    }
    return near;
  }, [cells]);

  if (cells.length === 0) {
    // Loading skeleton — 3x3 grid of pulsing placeholders
    return (
      <div className={`grid grid-cols-3 gap-2 ${compact ? 'w-36' : 'w-full max-w-[340px]'}`}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square rounded-2xl animate-pulse"
            style={{
              background: 'linear-gradient(145deg, rgba(26, 10, 48, 0.8), rgba(37, 13, 61, 0.8))',
              border: '1.5px solid rgba(217, 70, 239, 0.15)',
            }}
          />
        ))}
      </div>
    );
  }

  // ── Compact mode (small card in game-over, etc.) ──
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-1.5 w-36">
        {cells.map((cell, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-lg flex items-center justify-center"
            style={{
              background: cell.marked
                ? 'linear-gradient(135deg, rgba(217, 70, 239, 0.5), rgba(139, 92, 246, 0.5))'
                : 'rgba(30, 20, 60, 0.8)',
              border: cell.marked
                ? '2px solid rgba(217, 70, 239, 0.9)'
                : '1.5px solid rgba(217, 70, 239, 0.3)',
              boxShadow: cell.marked
                ? '0 0 12px rgba(217, 70, 239, 0.5), inset 0 0 8px rgba(217, 70, 239, 0.2)'
                : 'none',
            }}
          >
            <span className="text-base" style={{ opacity: cell.marked ? 1 : 0.6 }}>
              {CATEGORY_ICONS_COMPACT[cell.category]}
            </span>
            {cell.marked && (
              <div
                className="absolute top-0.5 right-0.5 rounded-full flex items-center justify-center"
                style={{
                  width: '14px', height: '14px',
                  background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
                  boxShadow: '0 0 6px rgba(217, 70, 239, 0.6)',
                }}
              >
                <span className="text-[8px]" style={{ color: '#fff', fontWeight: 800 }}>&#x2713;</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Full-size bingo card ──
  return (
    <div className="relative grid grid-cols-3 gap-2 w-full max-w-[340px]">
      {/* Mini confetti on line completion */}
      {showLineConfetti && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <ConfettiBurst active={showLineConfetti} particleCount={12} duration={1.2} />
        </div>
      )}

      {cells.map((cell, i) => {
        const label = CATEGORY_LABELS[cell.category];
        const SvgIcon = CATEGORY_SVG[cell.category];
        const isCenter = i === 4;
        const isNewlyMarked = newlyMarked.has(i);
        const isFlashing = flashingLines.has(i);
        const isNearBingo = nearBingoCells.has(i) && !cell.marked;
        const isDisintegrating = disintegratingCells.has(i);
        const isPickable = pickableIndices?.has(i) ?? false;

        // Colors: unmarked = muted fuchsia, marked = bright fuchsia, center = teal accent
        const unmarkedBg = isCenter
          ? 'linear-gradient(145deg, #1c0e35 0%, #2a1245 100%)'
          : 'linear-gradient(145deg, #1a0a30 0%, #250d3d 100%)';
        const markedBg = 'linear-gradient(145deg, rgba(217, 70, 239, 0.35) 0%, rgba(139, 92, 246, 0.35) 100%)';

        const unmarkedBorder = isCenter
          ? '2px solid rgba(45, 212, 191, 0.6)'
          : '1.5px solid rgba(217, 70, 239, 0.25)';
        const markedBorder = '2px solid rgba(217, 70, 239, 0.8)';

        const unmarkedShadow = isCenter
          ? '0 0 15px rgba(45, 212, 191, 0.3), inset 0 0 12px rgba(45, 212, 191, 0.08)'
          : 'inset 0 1px 0 rgba(255,255,255,0.03)';
        const markedShadow = '0 0 18px rgba(217, 70, 239, 0.5), inset 0 0 12px rgba(217, 70, 239, 0.15)';

        const iconColor = cell.marked
          ? '#d946ef'
          : isCenter ? '#2dd4bf' : 'rgba(180, 140, 220, 0.6)';

        return (
          <motion.div
            key={i}
            animate={
              isDisintegrating
                ? { scale: [1, 1.05, 0.95], opacity: [1, 0.8, 0.3] }
                : cell.marked
                  ? { scale: [1, 1.06, 1] }
                  : {}
            }
            transition={{ duration: isDisintegrating ? 0.3 : 0.4 }}
            onClick={isPickable ? () => onCellPick?.(i) : undefined}
            className={`relative aspect-square rounded-2xl flex flex-col items-center justify-center overflow-hidden ${isFlashing ? 'bingo-line-flash' : ''} ${isPickable ? 'cursor-pointer' : ''}`}
            style={{
              background: isDisintegrating
                ? 'linear-gradient(145deg, rgba(239, 68, 68, 0.2), rgba(30, 15, 50, 0.8))'
                : cell.marked ? markedBg : unmarkedBg,
              border: isDisintegrating
                ? '2px solid rgba(239, 68, 68, 0.6)'
                : isPickable
                  ? '2px solid rgba(217, 70, 239, 0.8)'
                  : cell.marked ? markedBorder : unmarkedBorder,
              boxShadow: isDisintegrating
                ? '0 0 20px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.2)'
                : cell.marked ? markedShadow : unmarkedShadow,
            }}
          >
            {/* Disintegration overlay */}
            {isDisintegrating && (
              <CellDisintegrate
                active
                onComplete={() => handleDisintegrateComplete(i)}
              />
            )}

            {/* Pickable cell glow overlay */}
            {isPickable && (
              <motion.div
                animate={{
                  boxShadow: [
                    'inset 0 0 10px rgba(217, 70, 239, 0.2), 0 0 12px rgba(217, 70, 239, 0.3)',
                    'inset 0 0 20px rgba(217, 70, 239, 0.5), 0 0 24px rgba(217, 70, 239, 0.6)',
                    'inset 0 0 10px rgba(217, 70, 239, 0.2), 0 0 12px rgba(217, 70, 239, 0.3)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="absolute inset-0 rounded-2xl pointer-events-none z-10"
              >
                <span
                  className="absolute bottom-1.5 left-0 right-0 text-center text-[8px] font-black uppercase tracking-widest"
                  style={{ color: '#d946ef', textShadow: '0 0 6px rgba(217, 70, 239, 0.6)' }}
                >
                  TAP
                </span>
              </motion.div>
            )}

            {/* Near-bingo pulse overlay */}
            {isNearBingo && !isPickable && (
              <motion.div
                animate={{
                  boxShadow: [
                    'inset 0 0 8px rgba(234,179,8,0.15), 0 0 6px rgba(234,179,8,0.1)',
                    'inset 0 0 15px rgba(234,179,8,0.35), 0 0 12px rgba(234,179,8,0.25)',
                    'inset 0 0 8px rgba(234,179,8,0.15), 0 0 6px rgba(234,179,8,0.1)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ border: '1.5px solid rgba(234,179,8,0.35)' }}
              />
            )}

            {/* Sparkle overlay on newly marked cells */}
            {isNewlyMarked && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: [0, 1.5, 0], opacity: [1, 1, 0] }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              >
                <SparkleIcon size={44} color="#d946ef" />
              </motion.div>
            )}

            {/* Icon */}
            <div className="flex flex-col items-center justify-center gap-1.5">
              {SvgIcon ? (
                <SvgIcon
                  size={30}
                  color={isDisintegrating ? 'rgba(239, 68, 68, 0.5)' : iconColor}
                  style={{
                    filter: cell.marked && !isDisintegrating
                      ? 'drop-shadow(0 0 8px rgba(217, 70, 239, 0.7))'
                      : isDisintegrating
                        ? 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))'
                        : 'none',
                    transition: 'filter 0.3s, color 0.3s',
                  }}
                />
              ) : (
                <span style={{ fontSize: 24, color: isDisintegrating ? 'rgba(239, 68, 68, 0.5)' : iconColor }}>{CATEGORY_ICONS_COMPACT[cell.category] ?? '?'}</span>
              )}
              <span
                className="text-[9px] font-black tracking-[0.15em] uppercase leading-none"
                style={{
                  color: isDisintegrating
                    ? 'rgba(239, 68, 68, 0.6)'
                    : cell.marked
                      ? '#d946ef'
                      : isCenter ? '#2dd4bf' : 'rgba(180, 140, 220, 0.7)',
                  textShadow: isDisintegrating
                    ? '0 0 6px rgba(239, 68, 68, 0.4)'
                    : cell.marked
                      ? '0 0 8px rgba(217, 70, 239, 0.5)'
                      : 'none',
                  transition: 'color 0.3s, text-shadow 0.3s',
                }}
              >
                {label}
              </span>
            </div>

            {/* Checkmark badge */}
            {cell.marked && !isDisintegrating && (
              <motion.div
                initial={isNewlyMarked ? { scale: 0 } : { scale: 1 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center"
                style={{
                  width: '20px', height: '20px',
                  background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
                  boxShadow: '0 0 8px rgba(217, 70, 239, 0.6)',
                }}
              >
                <span className="text-[10px]" style={{ color: '#fff', fontWeight: 800 }}>&#x2713;</span>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
