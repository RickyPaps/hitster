'use client';

import { motion } from 'framer-motion';
import type { GamePhase } from '@/types/game';

interface HostTopNavProps {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number;
  playerCount: number;
  timerSeconds: number;
  volume: number;
  muted: boolean;
  onEndSession: () => void;
  onToggleLeaderboard?: () => void;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}

const PHASE_TABS: { phase: GamePhase | null; label: string }[] = [
  { phase: 'SPINNING', label: 'Wheel Spin' },
  { phase: 'PLAYING', label: 'Challenge' },
  { phase: 'ROUND_RESULTS', label: 'Results' },
  { phase: 'DRINKING_SEGMENT', label: 'Party' },
  { phase: 'GAME_OVER', label: 'Final' },
];

export default function HostTopNav({
  roomCode, phase, roundNumber, playerCount, timerSeconds,
  volume, muted, onEndSession, onToggleLeaderboard, onVolumeChange, onMuteToggle,
}: HostTopNavProps) {
  const showTimer = phase === 'PLAYING';
  const timerDisplay = `${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}`;

  return (
    <header className="host-top-nav px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
      {/* Left: branding */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="p-1.5 rounded-lg shadow-lg" style={{ background: 'var(--game-cyan)', boxShadow: '0 4px 12px rgba(0, 242, 255, 0.4)' }}>
          <span className="text-lg font-bold" style={{ color: 'var(--bg-deep)' }}>&#9835;</span>
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-white uppercase">
            Hitster <span style={{ color: 'var(--game-cyan)' }}>Host</span>
          </h2>
          <p className="hidden sm:block text-[10px] uppercase font-bold" style={{ color: 'rgba(0, 242, 255, 0.8)', letterSpacing: '0.2em' }}>
            Master Control Screen
          </p>
        </div>
      </div>

      {/* Center: phase tabs */}
      <nav className="hidden md:flex items-center gap-6">
        {PHASE_TABS.map((tab) => {
          const isActive = tab.phase === phase;
          return (
            <span
              key={tab.label}
              className={`text-xs font-bold uppercase cursor-default ${
                isActive
                  ? 'nav-tab-active'
                  : 'text-gray-500'
              }`}
              style={{ letterSpacing: '0.15em' }}
            >
              {tab.label}
            </span>
          );
        })}
      </nav>

      {/* Right: round/timer + volume + room code + end session */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Round / Timer */}
        {showTimer ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full timer-ring-pink">
            <span style={{ color: 'var(--game-pink)', fontSize: '0.9rem' }}>&#9201;</span>
            <span className="font-black text-lg tabular-nums italic" style={{ color: 'var(--game-pink)' }}>
              {timerDisplay}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-full" style={{ background: 'rgba(188, 19, 254, 0.1)', border: '1px solid rgba(188, 19, 254, 0.2)' }}>
            <span className="text-xs font-bold uppercase" style={{ letterSpacing: '0.1em', color: 'rgba(188, 19, 254, 0.8)' }}>
              Round {roundNumber}
            </span>
          </div>
        )}

        {/* Volume */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onMuteToggle}
          className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: 'rgba(75, 32, 56, 0.3)',
            border: '1px solid rgba(0, 242, 255, 0.2)',
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <span style={{ color: 'rgba(0, 242, 255, 0.5)', fontSize: '0.85rem' }}>&#128263;</span>
          ) : (
            <span style={{ color: 'var(--game-cyan)', fontSize: '0.85rem' }}>&#128266;</span>
          )}
        </motion.button>
        <input
          type="range"
          min="0"
          max="100"
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="hidden sm:block w-16 h-1 accent-cyan-400 cursor-pointer"
        />

        <div className="hidden sm:block h-8 w-px bg-gray-700" />

        {/* Leaderboard toggle — mobile only */}
        {onToggleLeaderboard && (
          <button
            onClick={onToggleLeaderboard}
            className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer"
            style={{
              background: 'rgba(255, 0, 127, 0.1)',
              border: '1px solid rgba(255, 0, 127, 0.3)',
            }}
            title="Toggle Leaderboard"
          >
            <span style={{ fontSize: '0.9rem' }}>&#127942;</span>
            <span className="text-xs font-black" style={{ color: 'var(--game-pink)' }}>{playerCount}</span>
          </button>
        )}

        <div
          className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl"
          style={{
            background: 'rgba(255, 0, 127, 0.1)',
            border: '1px solid rgba(255, 0, 127, 0.3)',
          }}
        >
          <span className="hidden sm:inline text-xs font-bold uppercase" style={{ color: 'var(--game-pink)', letterSpacing: '0.12em' }}>Room Code</span>
          <span className="text-sm font-black tracking-widest" style={{ color: 'var(--game-pink)' }}>
            {roomCode.slice(0, 4).toUpperCase()}
          </span>
        </div>
        <div className="hidden sm:block h-8 w-px bg-gray-700" />
        <button
          onClick={onEndSession}
          className="flex items-center gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all cursor-pointer"
          style={{
            background: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid rgba(220, 38, 38, 0.5)',
            color: 'var(--error)',
          }}
        >
          <span className="text-sm">&#10005;</span>
          <span className="hidden sm:inline text-xs font-bold uppercase" style={{ letterSpacing: '-0.02em' }}>End Session</span>
        </button>
      </div>
    </header>
  );
}
