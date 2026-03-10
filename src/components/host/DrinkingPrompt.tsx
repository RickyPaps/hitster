'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '@/hooks/useAudio';
import ConfettiBurst from '@/components/animations/ConfettiBurst';
import { LightningBolt } from '@/components/animations/SVGIcons';

interface DrinkingPromptProps {
  type: 'everybody-drinks' | 'rock-off';
  onContinue: () => void;
}

const GOLD_COLORS = ['#EAB308', '#fbbf24', '#f59e0b', '#d97706', '#ff3355', '#d946ef'];

export default function DrinkingPrompt({ type, onContinue }: DrinkingPromptProps) {
  const { playSound } = useAudio();

  // Play alert sound on mount
  useEffect(() => {
    playSound('ding');
  }, [playSound]);

  const content = {
    'everybody-drinks': {
      title: 'EVERYBODY DRINKS!',
      subtitle: 'Take a sip!',
      color: '#EAB308',
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
      className="relative flex flex-col items-center justify-center gap-6 text-center"
    >
      {/* Confetti for everybody drinks */}
      {type === 'everybody-drinks' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <ConfettiBurst active={true} particleCount={20} colors={GOLD_COLORS} duration={1.5} />
        </div>
      )}

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
          className="text-4xl font-black"
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
      <p className="text-xl max-w-md" style={{ color: 'var(--text-secondary)' }}>
        {c.subtitle}
      </p>
      <button
        onClick={onContinue}
        className="mt-4 py-3 px-8 rounded-xl font-bold text-white cursor-pointer"
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
