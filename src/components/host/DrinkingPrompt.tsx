'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '@/hooks/useAudio';
import { LightningBolt } from '@/components/animations/SVGIcons';
import { fireGoldConfetti } from '@/lib/confetti';

interface DrinkingPromptProps {
  type: 'everybody-drinks' | 'rock-off';
  isMovie?: boolean;
  onContinue: () => void;
}

export default function DrinkingPrompt({ type, isMovie, onContinue }: DrinkingPromptProps) {
  const { playSound } = useAudio();

  // Play alert sound on mount + confetti for everybody-drinks
  useEffect(() => {
    playSound('ding');
    if (type === 'everybody-drinks') fireGoldConfetti();
  }, [playSound, type]);

  const content = {
    'everybody-drinks': {
      title: 'EVERYBODY DRINKS!',
      subtitle: 'Take a sip!',
      color: '#EAB308',
    },
    'rock-off': {
      title: 'ROCK OFF!',
      subtitle: isMovie
        ? 'Soundtrack plays — first to buzz in and name the movie assigns a drink!'
        : 'Song plays — first to buzz in and name the artist assigns a drink!',
      color: '#14B8A6',
    },
  };

  const c = content[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center justify-center gap-6 text-center"
    >
      <div className="flex items-center gap-3">
        {type === 'rock-off' && (
          <motion.div
            animate={{ opacity: [1, 0.3, 1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <LightningBolt size={32} color="#14B8A6" />
          </motion.div>
        )}
        <motion.h2
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-2xl sm:text-4xl font-black"
          style={{ color: c.color, textShadow: `0 0 20px ${c.color}80` }}
        >
          {c.title}
        </motion.h2>
        {type === 'rock-off' && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <LightningBolt size={32} color="#14B8A6" />
          </motion.div>
        )}
      </div>
      <p className="text-base sm:text-xl max-w-md px-4" style={{ color: 'var(--text-secondary)' }}>
        {c.subtitle}
      </p>
      <button
        onClick={onContinue}
        className="mt-4 py-2.5 sm:py-3 px-6 sm:px-8 rounded-xl font-bold text-white cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #ff007f, #bc13fe)',
          boxShadow: '0 0 20px rgba(255, 0, 127, 0.4)',
        }}
      >
        Continue
      </button>
    </motion.div>
  );
}
