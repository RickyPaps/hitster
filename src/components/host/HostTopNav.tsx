'use client';

import type { GamePhase } from '@/types/game';

interface HostTopNavProps {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number;
  playerCount: number;
  onEndSession: () => void;
}

const PHASE_TABS: { phase: GamePhase | null; label: string }[] = [
  { phase: 'SPINNING', label: 'Wheel Spin' },
  { phase: 'PLAYING', label: 'Challenge' },
  { phase: 'ROUND_RESULTS', label: 'Results' },
  { phase: 'DRINKING_SEGMENT', label: 'Party' },
];

export default function HostTopNav({ roomCode, phase, roundNumber, playerCount, onEndSession }: HostTopNavProps) {
  return (
    <header className="host-top-nav px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: branding */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-1.5 rounded-lg shadow-lg" style={{ background: '#00f2ff', boxShadow: '0 4px 12px rgba(0, 242, 255, 0.4)' }}>
          <span className="text-lg font-bold" style={{ color: '#0d0216' }}>&#9835;</span>
        </div>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-white uppercase">
            Hitster <span style={{ color: '#00f2ff' }}>Host</span>
          </h2>
          <p className="text-[10px] uppercase font-bold" style={{ color: 'rgba(0, 242, 255, 0.8)', letterSpacing: '0.2em' }}>
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

      {/* Right: room code + end session */}
      <div className="flex items-center gap-4 shrink-0">
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-xl"
          style={{
            background: 'rgba(255, 0, 127, 0.1)',
            border: '1px solid rgba(255, 0, 127, 0.3)',
          }}
        >
          <span className="text-xs font-bold uppercase" style={{ color: '#ff007f', letterSpacing: '0.12em' }}>Room Code</span>
          <span className="text-sm font-black tracking-widest" style={{ color: '#ff007f' }}>
            {roomCode.slice(0, 4).toUpperCase()}
          </span>
        </div>
        <div className="h-8 w-px bg-gray-700" />
        <button
          onClick={onEndSession}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer"
          style={{
            background: 'rgba(220, 38, 38, 0.2)',
            border: '1px solid rgba(220, 38, 38, 0.5)',
            color: '#ef4444',
          }}
        >
          <span className="text-sm">&#10005;</span>
          <span className="text-xs font-bold uppercase" style={{ letterSpacing: '-0.02em' }}>End Session</span>
        </button>
      </div>
    </header>
  );
}
