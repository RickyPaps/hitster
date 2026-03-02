'use client';

import { motion } from 'framer-motion';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { GuessResult } from '@/types/game';

interface LyricsValidatorProps {
  guesses: GuessResult[];
  onDone: () => void;
}

export default function LyricsValidator({ guesses, onDone }: LyricsValidatorProps) {
  const handleApprove = (playerId: string, approved: boolean) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_APPROVE_LYRICS, { playerId, approved });
  };

  const pendingGuesses = guesses.filter((g) => !g.correct && g.guess);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 w-full max-w-lg"
    >
      <h2 className="text-2xl font-bold">Judge Lyrics</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Approve or deny each player's lyrics guess</p>

      <div className="w-full space-y-3">
        {guesses.map((g) => (
          <div
            key={g.playerId}
            className="rounded-lg p-4"
            style={{ background: 'var(--bg-card)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold">{g.playerName}</span>
              {g.correct !== undefined && (
                <span className={`text-sm font-bold ${g.correct ? 'text-green-400' : ''}`}>
                  {g.correct ? 'Approved' : ''}
                </span>
              )}
            </div>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>"{g.guess}"</p>
            {!g.correct && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(g.playerId, true)}
                  className="flex-1 py-2 rounded-lg font-bold text-sm text-white"
                  style={{ background: 'var(--success)' }}
                >
                  Approve
                </button>
                <button
                  onClick={() => handleApprove(g.playerId, false)}
                  className="flex-1 py-2 rounded-lg font-bold text-sm text-white"
                  style={{ background: 'var(--error)' }}
                >
                  Deny
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onDone}
        className="py-3 px-8 rounded-xl font-bold text-white glow"
        style={{ background: 'var(--accent)' }}
      >
        Continue
      </button>
    </motion.div>
  );
}
