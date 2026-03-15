'use client';

import { motion } from 'framer-motion';
import type { GamePhase, Track } from '@/types/game';
import { getMediaTitle, getMediaSubtitle } from '@/types/game';

interface HostBottomBarProps {
  phase: GamePhase;
  currentTrack: Track | null;
  timerSeconds: number;
  maxTimer: number;
  roundNumber: number;
  currentSpinnerName: string | null;
  volume: number;
  muted: boolean;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}

export default function HostBottomBar({
  phase, currentTrack, timerSeconds, maxTimer, roundNumber,
  currentSpinnerName, volume, muted, onVolumeChange, onMuteToggle,
}: HostBottomBarProps) {
  const showTrackInfo = phase === 'ROUND_RESULTS' || phase === 'GAME_OVER';
  const trackName = showTrackInfo && currentTrack ? getMediaTitle(currentTrack) : '??????';
  const trackArtist = showTrackInfo && currentTrack ? getMediaSubtitle(currentTrack) : '?????';
  const showTimer = phase === 'PLAYING';

  // Format timer as m:ss
  const timerDisplay = `${Math.floor(timerSeconds / 60)}:${(timerSeconds % 60).toString().padStart(2, '0')}`;

  return (
    <div className="host-bottom-bar now-playing-bar px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-6">
      {/* Left: track info */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <p
            className="text-[10px] font-black uppercase mb-1"
            style={{ color: 'var(--game-pink)', letterSpacing: '0.4em' }}
          >
            Playing Now
          </p>
          <h4 className="text-sm sm:text-xl font-black italic gradient-text-teal truncate" style={{ letterSpacing: '-0.02em' }}>
            {trackName} — {trackArtist}
          </h4>
        </div>
      </div>

      {/* Right: timer + volume */}
      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        {/* Timer */}
        {showTimer ? (
          <div
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full timer-ring-pink"
          >
            <span style={{ color: 'var(--game-pink)', fontSize: '0.9rem' }}>&#9201;</span>
            <span
              className="font-black text-lg sm:text-2xl tabular-nums italic"
              style={{ color: 'var(--game-pink)' }}
            >
              {timerDisplay}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 sm:px-5 py-1.5 sm:py-2 rounded-full" style={{ background: 'rgba(188, 19, 254, 0.1)', border: '1px solid rgba(188, 19, 254, 0.2)' }}>
            <span className="text-xs font-bold uppercase" style={{ letterSpacing: '0.1em', color: 'rgba(188, 19, 254, 0.8)' }}>
              Round {roundNumber}
            </span>
          </div>
        )}

        {/* Volume */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onMuteToggle}
          className="w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer"
          style={{
            background: 'rgba(75, 32, 56, 0.3)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0, 242, 255, 0.2)',
          }}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? (
            <span style={{ color: 'rgba(0, 242, 255, 0.5)' }}>&#128263;</span>
          ) : (
            <span style={{ color: 'var(--game-cyan)' }}>&#128266;</span>
          )}
        </motion.button>
        <input
          type="range"
          min="0"
          max="100"
          value={muted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          className="hidden sm:block w-20 h-1 accent-cyan-400 cursor-pointer"
        />
      </div>
    </div>
  );
}
