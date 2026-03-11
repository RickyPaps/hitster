'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAudio } from '@/hooks/useAudio';
import ConfettiBurst from '@/components/animations/ConfettiBurst';
import FloatingScore from '@/components/animations/FloatingScore';
import ScreenShake from '@/components/animations/ScreenShake';
import DrinkSplash from '@/components/animations/DrinkSplash';
import { SparkleIcon } from '@/components/animations/SVGIcons';

interface RoundFeedbackProps {
  correct: boolean | null;
  shouldDrink?: boolean;
  noGuess?: boolean;
  message?: string;
  pointsAwarded?: number;
  bonusCategories?: string[];
}

export default function RoundFeedback({ correct, shouldDrink, noGuess, message, pointsAwarded, bonusCategories }: RoundFeedbackProps) {
  const { playSound } = useAudio();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showFloatingScore, setShowFloatingScore] = useState(false);

  // Play sound + trigger animations on mount
  useEffect(() => {
    if (correct === true) {
      playSound('ding');
      setShowConfetti(true);
      setShowFloatingScore(true);
      const timer = setTimeout(() => setShowFloatingScore(false), 900);
      return () => clearTimeout(timer);
    } else if (correct === false) {
      playSound('buzzer');
    }
  }, [correct, playSound]);

  // Drink splash sound
  useEffect(() => {
    if (shouldDrink) {
      const t = setTimeout(() => playSound('splash'), 500);
      return () => clearTimeout(t);
    }
  }, [shouldDrink, playSound]);

  if (correct === null) return null;

  return (
    <ScreenShake trigger={correct === false} intensity="medium">
      <div className="relative">
        {/* Confetti on correct */}
        <ConfettiBurst active={showConfetti} particleCount={15} duration={1} />

        {/* Drink splash overlay */}
        <DrinkSplash active={!!shouldDrink} />

        {/* Floating score */}
        {showFloatingScore && correct && (
          <FloatingScore points={pointsAwarded ?? 100} />
        )}

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
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
          {/* Animated checkmark/X using SVG pathLength */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
            className="flex items-center justify-center mb-2"
          >
            {correct ? (
              <svg width="48" height="48" viewBox="0 0 48 48">
                <motion.path
                  d="M12 24l8 8 16-16"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.8))',
                  }}
                />
              </svg>
            ) : (
              <motion.p
                className="text-4xl"
                style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))' }}
              >
                &#x2717;
              </motion.p>
            )}
          </motion.div>

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
              +{pointsAwarded ?? 100} points!
            </motion.p>
          )}

          {/* Bonus categories info with sparkle */}
          {correct && bonusCategories && bonusCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-1 flex items-center justify-center gap-1"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <SparkleIcon size={14} color="#d946ef" />
              </motion.div>
              <span
                className="text-xs font-semibold"
                style={{ color: '#d946ef', textShadow: '0 0 6px rgba(217, 70, 239, 0.4)' }}
              >
                Bonus! Also marked: {bonusCategories.join(', ')}
              </span>
            </motion.div>
          )}

          {message && (
            <p className="text-sm mt-1.5" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
              {message}
            </p>
          )}
        </motion.div>
      </div>
    </ScreenShake>
  );
}
