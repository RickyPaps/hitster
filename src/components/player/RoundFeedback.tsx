'use client';

import { motion } from 'framer-motion';

interface RoundFeedbackProps {
  correct: boolean | null;
  shouldDrink?: boolean;
  noGuess?: boolean;
  message?: string;
}

export default function RoundFeedback({ correct, shouldDrink, noGuess, message }: RoundFeedbackProps) {
  if (correct === null) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center p-5 rounded-2xl"
      style={{
        background: correct
          ? 'rgba(34, 197, 94, 0.1)'
          : 'rgba(239, 68, 68, 0.1)',
        border: `2px solid ${correct ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'}`,
        boxShadow: correct
          ? '0 0 20px rgba(34, 197, 94, 0.2), inset 0 0 15px rgba(34, 197, 94, 0.05)'
          : '0 0 20px rgba(239, 68, 68, 0.2), inset 0 0 15px rgba(239, 68, 68, 0.05)',
      }}
    >
      <motion.p
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
        className="text-4xl mb-2"
        style={{
          filter: correct
            ? 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.8))'
            : 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))',
        }}
      >
        {correct ? '\u2713' : '\u2717'}
      </motion.p>
      <p
        className="font-bold text-lg"
        style={{
          color: correct ? '#22c55e' : '#ef4444',
          textShadow: correct
            ? '0 0 10px rgba(34, 197, 94, 0.5)'
            : '0 0 10px rgba(239, 68, 68, 0.5)',
        }}
      >
        {correct ? 'Correct!' : noGuess ? 'No Guess!' : 'Wrong!'}
      </p>

      {/* Drink prompt */}
      {shouldDrink && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 pt-3"
          style={{ borderTop: '1px solid rgba(234, 179, 8, 0.3)' }}
        >
          <motion.p
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
            className="text-2xl font-black uppercase italic"
            style={{
              color: '#EAB308',
              textShadow: '0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3)',
            }}
          >
            Take a Drink!
          </motion.p>
          <p className="text-3xl mt-1">&#x1F37A;</p>
        </motion.div>
      )}

      {/* Score update for correct answers */}
      {correct && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-sm font-bold"
          style={{ color: '#00f2ff', textShadow: '0 0 8px rgba(0, 242, 255, 0.4)' }}
        >
          +100 points!
        </motion.p>
      )}

      {message && (
        <p className="text-sm mt-1.5" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
          {message}
        </p>
      )}
    </motion.div>
  );
}
