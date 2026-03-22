'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import gsap from 'gsap';
import { useAudio } from '@/hooks/useAudio';
import FloatingScore from '@/components/animations/FloatingScore';
import { fireConfetti } from '@/lib/confetti';
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

const CORRECT_MSGS = ['Correct!', 'Nailed it!', 'You got it!', 'Spot on!', 'Boom!', 'Nice one!'];
const WRONG_MSGS = ['Wrong!', 'Not quite!', 'Nope!', 'Nice try!', 'So close!'];
const NO_GUESS_MSGS = ['No Guess!', 'Too slow!', "Time's up!"];
const DRINK_MSGS = ['Take a Drink!', 'Bottoms up!', 'Sip time!', 'Cheers!', 'Down the hatch!'];

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export default function RoundFeedback({ correct, shouldDrink, noGuess, message, pointsAwarded, bonusCategories }: RoundFeedbackProps) {
  const { playSound } = useAudio();
  const [showFloatingScore, setShowFloatingScore] = useState(false);

  // Refs for GSAP animations
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const checkPathRef = useRef<SVGPathElement>(null);
  const drinkRef = useRef<HTMLDivElement>(null);
  const drinkTextRef = useRef<HTMLParagraphElement>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const bonusRef = useRef<HTMLDivElement>(null);
  const sparkleRef = useRef<HTMLDivElement>(null);

  // Pick random messages once on mount
  const feedbackMsg = useMemo(() => pick(correct ? CORRECT_MSGS : noGuess ? NO_GUESS_MSGS : WRONG_MSGS), [correct, noGuess]);
  const drinkMsg = useMemo(() => pick(DRINK_MSGS), []);

  // Play sound + trigger animations on mount
  useEffect(() => {
    if (correct === true) {
      playSound('ding');
      fireConfetti({ particleCount: 15 });
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

  // Main card entrance animation
  useEffect(() => {
    if (correct === null) return;
    const el = cardRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { scale: 0.5, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
      );
    });
    return () => ctx.revert();
  }, [correct]);

  // Icon entrance animation
  useEffect(() => {
    if (correct === null) return;
    const el = iconRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { scale: 0 },
        { scale: 1, duration: 0.4, delay: 0.1, ease: 'elastic.out(1, 0.5)' }
      );
    });
    return () => ctx.revert();
  }, [correct]);

  // SVG checkmark path animation (strokeDashoffset approach)
  useEffect(() => {
    if (!correct) return;
    const path = checkPathRef.current;
    if (!path) return;

    const ctx = gsap.context(() => {
      const length = path.getTotalLength();
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
      gsap.to(path, { strokeDashoffset: 0, duration: 0.5, delay: 0.2, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, [correct]);

  // Drink section entrance
  useEffect(() => {
    if (!shouldDrink) return;
    const el = drinkRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, delay: 0.4, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, [shouldDrink]);

  // Drink text pulse
  useEffect(() => {
    if (!shouldDrink) return;
    const el = drinkTextRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.to(el, { scale: 1.08, yoyo: true, repeat: -1, duration: 0.6, ease: 'sine.inOut' });
    });
    return () => ctx.revert();
  }, [shouldDrink]);

  // Score entrance
  useEffect(() => {
    if (!correct) return;
    const el = scoreRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { opacity: 0, y: 5 },
        { opacity: 1, y: 0, duration: 0.3, delay: 0.3, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, [correct]);

  // Bonus categories entrance
  useEffect(() => {
    if (!correct || !bonusCategories || bonusCategories.length === 0) return;
    const el = bonusRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { opacity: 0, y: 5 },
        { opacity: 1, y: 0, duration: 0.3, delay: 0.5, ease: 'power2.out' }
      );
    });
    return () => ctx.revert();
  }, [correct, bonusCategories]);

  // Sparkle icon animation
  useEffect(() => {
    if (!correct || !bonusCategories || bonusCategories.length === 0) return;
    const el = sparkleRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { scale: 0 },
        { scale: 1, duration: 0.4, delay: 0.6, ease: 'elastic.out(1, 0.5)' }
      );
    });
    return () => ctx.revert();
  }, [correct, bonusCategories]);

  if (correct === null) return null;

  return (
    <ScreenShake trigger={correct === false} intensity="medium">
      <div className="relative">
        {/* Drink splash overlay */}
        <DrinkSplash active={!!shouldDrink} />

        {/* Floating score */}
        {showFloatingScore && correct && (
          <FloatingScore points={pointsAwarded ?? 100} />
        )}

        <div
          ref={cardRef}
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
          {/* Animated checkmark/X using SVG strokeDashoffset */}
          <div
            ref={iconRef}
            className="flex items-center justify-center mb-2"
          >
            {correct ? (
              <svg width="48" height="48" viewBox="0 0 48 48">
                <path
                  ref={checkPathRef}
                  d="M12 24l8 8 16-16"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.8))',
                  }}
                />
              </svg>
            ) : (
              <p
                className="text-4xl"
                style={{ filter: 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))' }}
              >
                &#x2717;
              </p>
            )}
          </div>

          <p
            className="font-bold text-lg"
            style={{
              color: correct ? 'var(--success)' : 'var(--error)',
              textShadow: correct
                ? '0 0 10px rgba(34, 197, 94, 0.5)'
                : '0 0 10px rgba(239, 68, 68, 0.5)',
            }}
          >
            {feedbackMsg}
          </p>

          {/* Drink prompt */}
          {shouldDrink && (
            <div
              ref={drinkRef}
              className="mt-4 pt-3"
              style={{ borderTop: '1px solid rgba(234, 179, 8, 0.3)' }}
            >
              <p
                ref={drinkTextRef}
                className="text-2xl font-black uppercase italic"
                style={{
                  color: 'var(--game-gold)',
                  textShadow: '0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3)',
                }}
              >
                {drinkMsg}
              </p>
              <p className="text-3xl mt-1">&#x1F37A;</p>
            </div>
          )}

          {/* Score update for correct answers */}
          {correct && (
            <p
              ref={scoreRef}
              className="mt-3 text-sm font-bold"
              style={{ color: 'var(--game-cyan)', textShadow: '0 0 8px rgba(0, 242, 255, 0.4)' }}
            >
              +{pointsAwarded ?? 100} points!
            </p>
          )}

          {/* Bonus categories info with sparkle */}
          {correct && bonusCategories && bonusCategories.length > 0 && (
            <div
              ref={bonusRef}
              className="mt-1 flex items-center justify-center gap-1"
            >
              <div ref={sparkleRef}>
                <SparkleIcon size={14} color="#d946ef" />
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--game-fuchsia)', textShadow: '0 0 6px rgba(217, 70, 239, 0.4)' }}
              >
                Bonus! Also marked: {bonusCategories.join(', ')}
              </span>
            </div>
          )}

          {message && (
            <p className="text-sm mt-1.5" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </ScreenShake>
  );
}
