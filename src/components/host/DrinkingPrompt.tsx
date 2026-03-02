'use client';

import { motion } from 'framer-motion';

interface DrinkingPromptProps {
  type: 'everybody-drinks' | 'hot-take' | 'rock-off';
  targetPlayer?: string | null;
  onContinue: () => void;
}

export default function DrinkingPrompt({ type, targetPlayer, onContinue }: DrinkingPromptProps) {
  const content = {
    'everybody-drinks': {
      title: 'EVERYBODY DRINKS!',
      subtitle: 'Take a sip!',
      color: '#EAB308',
    },
    'hot-take': {
      title: 'HOT TAKE',
      subtitle: targetPlayer
        ? `${targetPlayer}, give your most unpopular music opinion... or drink!`
        : 'Someone give an unpopular music opinion!',
      color: '#EC4899',
    },
    'rock-off': {
      title: 'ROCK OFF!',
      subtitle: 'Song plays — first to buzz in and name the artist assigns a drink!',
      color: '#14B8A6',
    },
  };

  const c = content[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-6 text-center"
    >
      <motion.h2
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="text-4xl font-black"
        style={{ color: c.color }}
      >
        {c.title}
      </motion.h2>
      <p className="text-xl max-w-md" style={{ color: 'var(--text-secondary)' }}>
        {c.subtitle}
      </p>
      <button
        onClick={onContinue}
        className="mt-4 py-3 px-8 rounded-xl font-bold text-white glow"
        style={{ background: 'var(--accent)' }}
      >
        Continue
      </button>
    </motion.div>
  );
}
