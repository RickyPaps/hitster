'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/types/game';

interface WinnerScreenProps {
  winner: Player;
  onPlayAgain?: () => void;
}

export default function WinnerScreen({ winner, onPlayAgain }: WinnerScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center gap-6 text-center min-h-[60vh]"
    >
      <motion.div
        animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-8xl"
      >
        🏆
      </motion.div>
      <h1 className="text-4xl font-black glow-text" style={{ color: 'var(--accent)' }}>
        {winner.name} WINS!
      </h1>
      <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
        {winner.completedRows} line{winner.completedRows !== 1 ? 's' : ''} completed
      </p>
      {onPlayAgain && (
        <button
          onClick={onPlayAgain}
          className="mt-4 py-3 px-8 rounded-xl font-bold text-white glow"
          style={{ background: 'var(--accent)' }}
        >
          Play Again
        </button>
      )}
    </motion.div>
  );
}
