'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SurpriseIcon } from '@/components/animations/SVGIcons';
import { fireConfetti } from '@/lib/confetti';
import type { SurpriseEventType } from '@/types/game';

interface EventConfig {
  title: string;
  getSubtitle: (name: string | null, name2?: string | null) => string;
  color: string;
  colorRgb: string;
  confetti: boolean;
}

const EVENT_CONFIG: Record<SurpriseEventType, EventConfig> = {
  spotlight: {
    title: 'SPOTLIGHT!',
    getSubtitle: (name) => `${name ?? 'A player'} takes a drink!`,
    color: '#ff4da6',
    colorRgb: '255, 77, 166',
    confetti: false,
  },
  doubleRound: {
    title: 'DOUBLE ROUND!',
    getSubtitle: () => 'All scores 2x next round!',
    color: '#ff8833',
    colorRgb: '255, 136, 51',
    confetti: true,
  },
  everybodyCheers: {
    title: 'EVERYBODY CHEERS!',
    getSubtitle: () => 'All players take a drink!',
    color: '#EAB308',
    colorRgb: '234, 179, 8',
    confetti: true,
  },
  categoryCurse: {
    title: 'CATEGORY CURSE!',
    getSubtitle: (name) => `${name ?? 'A player'} loses a marked cell!`,
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    confetti: false,
  },
  luckyStar: {
    title: 'LUCKY STAR!',
    getSubtitle: (name) => `${name ?? 'A player'} gets a free cell!`,
    color: '#33ff77',
    colorRgb: '51, 255, 119',
    confetti: true,
  },
  hotSeat: {
    title: 'HOT SEAT!',
    getSubtitle: (name) => `${name ?? 'A player'}: wrong answer = 2x drinks next round!`,
    color: '#ef4444',
    colorRgb: '239, 68, 68',
    confetti: false,
  },
  timePressure: {
    title: 'TIME PRESSURE!',
    getSubtitle: () => 'Half the time next round — think fast!',
    color: '#f59e0b',
    colorRgb: '245, 158, 11',
    confetti: false,
  },
  streakBreaker: {
    title: 'STREAK BREAKER!',
    getSubtitle: (name) => `${name ?? 'A player'}'s streak has been shattered!`,
    color: '#f97316',
    colorRgb: '249, 115, 22',
    confetti: false,
  },
  scoreSwap: {
    title: 'SCORE SWAP!',
    getSubtitle: (name, name2) => `${name ?? 'A player'} and ${name2 ?? 'another player'} swap scores!`,
    color: '#a855f7',
    colorRgb: '168, 85, 247',
    confetti: true,
  },
  pointThief: {
    title: 'POINT THIEF!',
    getSubtitle: (name, name2) => `${name ?? 'A player'} steals 150 pts from ${name2 ?? 'another player'}!`,
    color: '#dc2626',
    colorRgb: '220, 38, 38',
    confetti: false,
  },
};

interface SurpriseEventOverlayProps {
  event: { type: SurpriseEventType; targetName: string | null; targetName2?: string | null } | null;
  onComplete: () => void;
}

export default function SurpriseEventOverlay({ event, onComplete }: SurpriseEventOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (event) {
      const config = EVENT_CONFIG[event.type];
      if (config.confetti) {
        fireConfetti({ particleCount: 20, origin: { x: 0.25, y: 0.4 } });
        fireConfetti({ particleCount: 20, origin: { x: 0.75, y: 0.4 } });
      }
      const timer = setTimeout(onComplete, 4000);
      return () => clearTimeout(timer);
    }
  }, [event, onComplete]);

  // Entrance animations
  useEffect(() => {
    if (!event) return;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      // Overlay fade in
      if (overlayRef.current) {
        gsap.fromTo(overlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3 }
        );
      }

      // Backdrop flash
      if (backdropRef.current) {
        gsap.fromTo(backdropRef.current,
          { opacity: 0 },
          { opacity: 0.4, duration: 0.2, yoyo: true, repeat: 1, repeatDelay: 0.1 }
        );
        gsap.to(backdropRef.current, { opacity: 0.15, duration: 0.3, delay: 0.5 });
      }

      // Card spring in
      if (cardRef.current) {
        gsap.fromTo(cardRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
        );
      }

      // Icon spin in
      if (iconRef.current) {
        gsap.fromTo(iconRef.current,
          { scale: 0, rotation: -30 },
          { scale: 1, rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)', delay: 0.1 }
        );
      }
    });

    return () => ctx.revert();
  }, [event]);

  if (!event) return null;

  const config = EVENT_CONFIG[event.type];

  return (
    <div
      ref={overlayRef}
      role="alert"
      aria-live="assertive"
      className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
    >
      {/* Backdrop flash */}
      <div
        ref={backdropRef}
        className="absolute inset-0"
        style={{ background: `rgba(${config.colorRgb}, 0.2)` }}
      />

      {/* Card */}
      <div
        ref={cardRef}
        className="relative rounded-3xl p-8 text-center max-w-md mx-4"
        style={{
          background: `linear-gradient(135deg, rgba(${config.colorRgb}, 0.15), rgba(20, 12, 50, 0.95))`,
          border: `2px solid rgba(${config.colorRgb}, 0.5)`,
          boxShadow: `0 0 60px rgba(${config.colorRgb}, 0.3)`,
        }}
      >
        <div
          ref={iconRef}
          className="mb-3 flex justify-center"
        >
          <SurpriseIcon size={48} color={config.color} aria-hidden="true" />
        </div>
        <h2
          className="text-3xl font-black uppercase tracking-wider mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            color: config.color,
            textShadow: `0 0 20px rgba(${config.colorRgb}, 0.6)`,
          }}
        >
          {config.title}
        </h2>
        <p
          className="text-lg font-semibold"
          style={{ color: 'rgba(255, 255, 255, 0.85)' }}
        >
          {config.getSubtitle(event.targetName, event.targetName2)}
        </p>
      </div>
    </div>
  );
}
