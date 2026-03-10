'use client';

import { motion } from 'framer-motion';
import type { Player } from '@/types/game';
import { TrophyIcon, SparkleIcon } from '@/components/animations/SVGIcons';
import ConfettiBurst from '@/components/animations/ConfettiBurst';

interface WinnerScreenProps {
  winner: Player;
  onPlayAgain?: () => void;
}

export default function WinnerScreen({ winner, onPlayAgain }: WinnerScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex flex-col items-center justify-center gap-6 text-center min-h-[60vh]"
    >
      {/* Confetti bursts - left and right */}
      <div className="absolute left-[25%] top-[30%] pointer-events-none">
        <ConfettiBurst active={true} particleCount={40} duration={2} />
      </div>
      <div className="absolute right-[25%] top-[30%] pointer-events-none">
        <ConfettiBurst active={true} particleCount={40} duration={2} />
      </div>

      {/* Trophy */}
      <motion.div
        initial={{ y: -100, scale: 0, rotate: -30 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <TrophyIcon size={96} color="#EAB308" />
      </motion.div>

      {/* Winner name with sparkles */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 20 }}
        className="relative flex items-center gap-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <SparkleIcon size={24} color="#EAB308" />
        </motion.div>
        <h1 className="text-4xl font-black" style={{ color: '#ff007f', textShadow: '0 0 20px rgba(255, 0, 127, 0.5)' }}>
          {winner.name} WINS!
        </h1>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <SparkleIcon size={24} color="#d946ef" />
        </motion.div>
      </motion.div>

      {/* Stats */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-xl"
        style={{ color: 'var(--text-secondary)' }}
      >
        {winner.completedRows} line{winner.completedRows !== 1 ? 's' : ''} completed — {winner.score.toLocaleString()} points
      </motion.p>

      {/* Play again button */}
      {onPlayAgain && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
          className="mt-4 py-3 px-8 rounded-xl font-bold text-white cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #ff007f, #bc13fe)',
            boxShadow: '0 0 20px rgba(255, 0, 127, 0.4)',
          }}
        >
          Play Again
        </motion.button>
      )}
    </motion.div>
  );
}
