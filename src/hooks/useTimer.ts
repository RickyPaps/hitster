'use client';

import { useEffect, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';

export function useTimer() {
  const timerSeconds = useGameStore((s) => s.timerSeconds);
  const phase = useGameStore((s) => s.phase);
  const prevPhase = useRef(phase);

  useEffect(() => {
    prevPhase.current = phase;
  }, [phase]);

  return {
    seconds: timerSeconds,
    isRunning: phase === 'PLAYING' && timerSeconds > 0,
    isExpired: phase === 'PLAYING' && timerSeconds <= 0,
    isLow: timerSeconds <= 5 && timerSeconds > 0,
  };
}
