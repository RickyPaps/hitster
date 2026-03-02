'use client';

import { motion } from 'framer-motion';
import type { GuessResult, Track } from '@/types/game';
import CategoryBadge from '@/components/shared/CategoryBadge';

interface RoundResultsProps {
  guesses: GuessResult[];
  track: Track | null;
  category: string | null;
  onNextRound: () => void;
}

export default function RoundResults({ guesses, track, category, onNextRound }: RoundResultsProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 w-full max-w-lg"
    >
      <h2 className="text-2xl font-bold">Round Results</h2>

      {track && (
        <div className="text-center">
          <p className="text-xl font-bold">{track.name}</p>
          <p style={{ color: 'var(--text-secondary)' }}>{track.artist} - {track.album} ({track.year})</p>
        </div>
      )}

      {category && <CategoryBadge category={category} />}

      <div className="w-full space-y-2">
        {guesses.length === 0 ? (
          <p className="text-center" style={{ color: 'var(--text-secondary)' }}>No guesses submitted</p>
        ) : (
          guesses.map((g, i) => (
            <motion.div
              key={g.playerId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 rounded-lg p-3"
              style={{ background: 'var(--bg-card)' }}
            >
              <span className={`w-3 h-3 rounded-full ${g.correct ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium flex-1">{g.playerName}</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>"{g.guess}"</span>
              {g.similarity !== undefined && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {Math.round(g.similarity * 100)}%
                </span>
              )}
            </motion.div>
          ))
        )}
      </div>

      <button
        onClick={onNextRound}
        className="py-3 px-8 rounded-xl font-bold text-white glow"
        style={{ background: 'var(--accent)' }}
      >
        Next Round
      </button>
    </motion.div>
  );
}
