'use client';

import { motion } from 'framer-motion';

interface RoundFeedbackProps {
  correct: boolean | null;
  message?: string;
}

export default function RoundFeedback({ correct, message }: RoundFeedbackProps) {
  if (correct === null) return null;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center p-4 rounded-xl"
      style={{
        background: correct ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        border: `2px solid ${correct ? 'var(--success)' : 'var(--error)'}`,
      }}
    >
      <p className="text-3xl mb-2">{correct ? '✓' : '✗'}</p>
      <p className="font-bold" style={{ color: correct ? 'var(--success)' : 'var(--error)' }}>
        {correct ? 'Correct!' : 'Wrong!'}
      </p>
      {message && (
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
      )}
    </motion.div>
  );
}
