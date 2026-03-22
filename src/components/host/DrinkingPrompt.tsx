'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leftBoltRef = useRef<HTMLDivElement>(null);
  const rightBoltRef = useRef<HTMLDivElement>(null);

  // Play alert sound on mount + confetti for everybody-drinks
  useEffect(() => {
    playSound('ding');
    if (type === 'everybody-drinks') fireGoldConfetti();
  }, [playSound, type]);

  // Entrance animation
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // Container entrance
      if (containerRef.current) {
        gsap.fromTo(containerRef.current,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
        );
      }

      // Title pulse
      if (titleRef.current) {
        gsap.to(titleRef.current, { scale: 1.05, yoyo: true, repeat: -1, duration: 0.75, ease: 'sine.inOut' });
      }

      // Lightning bolt flicker
      if (leftBoltRef.current) {
        gsap.fromTo(leftBoltRef.current,
          { opacity: 1 },
          { opacity: 0.3, yoyo: true, repeat: -1, duration: 0.75, ease: 'steps(3)' }
        );
      }
      if (rightBoltRef.current) {
        gsap.fromTo(rightBoltRef.current,
          { opacity: 1 },
          { opacity: 0.3, yoyo: true, repeat: -1, duration: 0.75, ease: 'steps(3)', delay: 0.2 }
        );
      }
    });

    return () => ctx.revert();
  }, []);

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
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-6 text-center"
    >
      <div className="flex items-center gap-3">
        {type === 'rock-off' && (
          <div ref={leftBoltRef}>
            <LightningBolt size={32} color="#14B8A6" />
          </div>
        )}
        <h2
          ref={titleRef}
          className="text-2xl sm:text-4xl font-black"
          style={{ color: c.color, textShadow: `0 0 20px ${c.color}80` }}
        >
          {c.title}
        </h2>
        {type === 'rock-off' && (
          <div ref={rightBoltRef}>
            <LightningBolt size={32} color="#14B8A6" />
          </div>
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
    </div>
  );
}
