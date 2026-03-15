'use client';

import { motion } from 'framer-motion';
import type { GamePhase } from '@/types/game';

interface MobileActionBarProps {
  phase: GamePhase;
  currentSpinnerName: string | null;
  wheelSpinning: boolean;
  onSpin: () => void;
  onNextRound: () => void;
}

const PHASE_DISPLAY: Partial<Record<GamePhase, string>> = {
  SPINNING: 'Category Wheel',
  PLAYING: 'Challenge Active',
  ROUND_RESULTS: 'Round Results',
  DRINKING_SEGMENT: 'Party Time',
};

export default function MobileActionBar({
  phase, currentSpinnerName, wheelSpinning, onSpin, onNextRound,
}: MobileActionBarProps) {
  return (
    <div className="lg:hidden w-full flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: 'rgba(13, 2, 22, 0.6)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(188, 19, 254, 0.25)',
      }}
    >
      {/* Phase pill */}
      <span
        className="shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(0, 242, 255, 0.15)',
          color: '#00f2ff',
          border: '1px solid rgba(0, 242, 255, 0.3)',
          letterSpacing: '0.1em',
        }}
      >
        {PHASE_DISPLAY[phase] ?? phase}
      </span>

      {/* Spinner turn indicator */}
      {phase === 'SPINNING' && currentSpinnerName && !wheelSpinning && (
        <span
          className="text-xs font-bold animate-pulse truncate"
          style={{ color: '#ff007f' }}
        >
          {currentSpinnerName}&apos;s turn
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Phase-specific primary action */}
      {phase === 'SPINNING' && !currentSpinnerName && !wheelSpinning && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onSpin}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-black uppercase text-xs gradient-spin-btn cursor-pointer"
        >
          <span>&#8635;</span>
          <span>Spin</span>
        </motion.button>
      )}

      {phase === 'PLAYING' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onNextRound}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-black uppercase text-xs gradient-spin-btn cursor-pointer"
        >
          <span>&#9989;</span>
          <span>Reveal</span>
        </motion.button>
      )}

      {phase === 'ROUND_RESULTS' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onNextRound}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-black uppercase text-xs gradient-spin-btn cursor-pointer"
        >
          <span>&#9654;</span>
          <span>Next</span>
        </motion.button>
      )}

      {phase === 'DRINKING_SEGMENT' && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onNextRound}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-black uppercase text-xs gradient-spin-btn cursor-pointer"
        >
          <span>&#9654;</span>
          <span>Continue</span>
        </motion.button>
      )}

      {/* Skip — secondary action */}
      {(phase === 'SPINNING' || phase === 'PLAYING') && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onNextRound}
          className="shrink-0 text-[10px] font-bold uppercase px-2 py-1.5 rounded-lg cursor-pointer"
          style={{ background: 'rgba(0, 242, 255, 0.08)', color: 'rgba(0, 242, 255, 0.6)', border: '1px solid rgba(0, 242, 255, 0.15)' }}
        >
          Skip
        </motion.button>
      )}
    </div>
  );
}
