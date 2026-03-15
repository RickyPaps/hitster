'use client';

import { motion } from 'framer-motion';
import type { GamePhase, TrackHistoryEntry } from '@/types/game';
import { ALL_WHEEL_SEGMENTS } from '@/types/game';

interface HostLeftSidebarProps {
  phase: GamePhase;
  currentSpinnerName: string | null;
  wheelSpinning: boolean;
  trackHistory: TrackHistoryEntry[];
  playerCount: number;
  onSpin: () => void;
  onNextRound: () => void;
}

const PHASE_DISPLAY: Partial<Record<GamePhase, string>> = {
  SPINNING: 'Category Wheel',
  PLAYING: 'Challenge Active',
  ROUND_RESULTS: 'Round Results',
  DRINKING_SEGMENT: 'Party Time',
  GAME_OVER: 'Game Over',
};

export default function HostLeftSidebar({
  phase, currentSpinnerName, wheelSpinning, trackHistory, playerCount, onSpin, onNextRound,
}: HostLeftSidebarProps) {
  return (
    <aside className="sidebar-panel sidebar-scroll p-4 flex flex-col gap-4">
      {/* Main controls panel */}
      <div className="glass-panel-purple rounded-2xl p-5 flex flex-col gap-4">
        {/* Phase indicator */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(188, 19, 254, 0.2)',
              border: '1px solid rgba(188, 19, 254, 0.5)',
            }}
          >
            <span style={{ color: '#bc13fe', fontSize: '1.2rem' }}>&#8634;</span>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold" style={{ color: 'rgba(188, 19, 254, 0.7)' }}>Current Phase</p>
            <h3 className="text-sm font-bold text-white uppercase tracking-wide">
              {PHASE_DISPLAY[phase] ?? phase}
            </h3>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Spin Wheel — always visible, disabled when not SPINNING */}
          <motion.button
            whileHover={phase === 'SPINNING' && !currentSpinnerName && !wheelSpinning ? { scale: 1.02 } : {}}
            whileTap={phase === 'SPINNING' && !currentSpinnerName && !wheelSpinning ? { scale: 0.95 } : {}}
            onClick={phase === 'SPINNING' && !currentSpinnerName && !wheelSpinning ? onSpin : undefined}
            className={`w-full flex items-center gap-3 p-3 rounded-xl text-white font-black uppercase italic transition-all gradient-spin-btn ${
              phase !== 'SPINNING' || currentSpinnerName || wheelSpinning ? 'opacity-30 pointer-events-none' : 'cursor-pointer'
            }`}
          >
            <span className="text-lg">&#8635;</span>
            <span className="text-sm">Spin Wheel</span>
          </motion.button>

          {/* Phase-specific primary action */}
          {phase === 'PLAYING' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNextRound}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-white font-black uppercase italic transition-all cursor-pointer gradient-spin-btn"
            >
              <span className="text-sm">&#9989;</span>
              <span className="text-sm">Reveal Answer</span>
            </motion.button>
          )}

          {phase === 'ROUND_RESULTS' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNextRound}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-white font-black uppercase italic transition-all cursor-pointer gradient-spin-btn"
            >
              <span className="text-sm">&#9654;</span>
              <span className="text-sm">Next Round</span>
            </motion.button>
          )}

          {phase === 'DRINKING_SEGMENT' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNextRound}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-white font-black uppercase italic transition-all cursor-pointer gradient-spin-btn"
            >
              <span className="text-sm">&#9654;</span>
              <span className="text-sm">Continue</span>
            </motion.button>
          )}

          {phase === 'SPINNING' && currentSpinnerName && !wheelSpinning && (
            <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(255, 0, 127, 0.1)', border: '1px solid rgba(255, 0, 127, 0.3)' }}>
              <p className="text-sm font-bold animate-pulse" style={{ color: '#ff007f' }}>
                {currentSpinnerName}&apos;s turn!
              </p>
            </div>
          )}

          {/* Skip / secondary action */}
          {(phase === 'SPINNING' || phase === 'PLAYING') && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNextRound}
              className="w-full flex items-center gap-3 p-3 rounded-xl font-bold transition-all cursor-pointer"
              style={{ background: 'rgba(0, 242, 255, 0.06)', border: '1px solid rgba(0, 242, 255, 0.15)', color: 'rgba(0, 242, 255, 0.7)' }}
            >
              <span className="text-sm">&#9197;</span>
              <span className="text-sm">{phase === 'PLAYING' ? 'Skip Track' : 'Skip Turn'}</span>
            </motion.button>
          )}
        </div>

        {/* Recent Results — compact inline style */}
        {trackHistory.length > 0 && (
          <div className="mt-2 pt-4 border-t border-fuchsia-500/15">
            <p className="text-[10px] uppercase font-bold mb-3" style={{ color: 'rgba(217, 70, 239, 0.7)' }}>Recent Results</p>
            <div className="space-y-2">
              {trackHistory.slice(0, 3).map((entry) => {
                const segment = ALL_WHEEL_SEGMENTS.find((s) => s.category === entry.category);
                return (
                  <div
                    key={`${entry.track.id}-${entry.roundNumber}`}
                    className="flex items-center justify-between text-[11px] p-2 rounded-lg"
                    style={{ background: 'rgba(188, 19, 254, 0.08)', border: '1px solid rgba(188, 19, 254, 0.12)' }}
                  >
                    <span style={{ color: 'rgba(217, 70, 239, 0.65)' }}>{segment?.label ?? entry.category}</span>
                    <span className="font-bold" style={{ color: '#ff007f' }}>
                      {entry.correctCount}/{entry.totalGuesses}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Host info card at bottom */}
      <div className="mt-auto glass-panel-teal rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
              style={{
                background: 'linear-gradient(135deg, #ff007f, #bc13fe)',
                color: 'white',
                border: '2px solid rgba(0, 242, 255, 0.5)',
              }}
            >
              H
            </div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full" style={{ border: '2px solid #0d0216' }} />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Master Host</p>
            <p className="text-[11px] font-bold" style={{ color: '#ff007f' }}>{playerCount} Players Online</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
