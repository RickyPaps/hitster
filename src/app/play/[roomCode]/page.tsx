'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { useGameState } from '@/hooks/useGameState';
import { useGameStore } from '@/stores/gameStore';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import PlayerLobby from '@/components/player/PlayerLobby';
import BingoCard from '@/components/player/BingoCard';
import GuessInput from '@/components/player/GuessInput';
import RoundFeedback from '@/components/player/RoundFeedback';
import Timer from '@/components/shared/Timer';
import CategoryBadge from '@/components/shared/CategoryBadge';

export default function PlayerPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  useSocket();
  useGameState();

  const {
    phase, currentCategory, timerSeconds, settings,
    bingoCard, hasGuessedThisRound, winner, roundGuesses,
    playerId, playerName, partyTarget,
  } = useGameStore();

  const [lastResult, setLastResult] = useState<{ correct: boolean } | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on(SOCKET_EVENTS.GUESS_RESULT, (result: { correct: boolean }) => {
      setLastResult(result);
    });
    return () => {
      socket.off(SOCKET_EVENTS.GUESS_RESULT);
    };
  }, []);

  // Reset result on new round
  useEffect(() => {
    if (phase === 'PLAYING') {
      setLastResult(null);
    }
  }, [phase]);

  if (phase === 'LOBBY') {
    return <PlayerLobby />;
  }

  if (phase === 'GAME_OVER' && winner) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-black mb-4" style={{ color: 'var(--accent)' }}>
          Game Over!
        </h1>
        <p className="text-xl mb-2">
          {winner.name === playerName ? 'YOU WIN! 🏆' : `${winner.name} wins!`}
        </p>
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Your Card</h3>
          <BingoCard cells={bingoCard} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {currentCategory && <CategoryBadge category={currentCategory} />}
        {phase === 'PLAYING' && (
          <Timer seconds={timerSeconds} maxSeconds={settings.timerDuration} />
        )}
      </div>

      {/* Bingo Card */}
      <div className="flex justify-center mb-4">
        <BingoCard cells={bingoCard} compact />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AnimatePresence mode="wait">
          {phase === 'SPINNING' && (
            <motion.div
              key="spinning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <motion.p
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="text-2xl font-bold"
                style={{ color: 'var(--accent)' }}
              >
                Spinning the wheel...
              </motion.p>
            </motion.div>
          )}

          {phase === 'PLAYING' && currentCategory && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full flex flex-col items-center gap-4"
            >
              {!hasGuessedThisRound ? (
                <GuessInput
                  category={currentCategory}
                  disabled={hasGuessedThisRound}
                  onGuessSubmitted={() => {}}
                />
              ) : (
                <div className="text-center">
                  <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                    Guess submitted! Waiting for results...
                  </p>
                  {lastResult && <RoundFeedback correct={lastResult.correct} />}
                </div>
              )}
            </motion.div>
          )}

          {phase === 'JUDGING' && (
            <motion.div
              key="judging"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                Host is reviewing lyrics answers...
              </p>
              {lastResult && <RoundFeedback correct={lastResult.correct} />}
            </motion.div>
          )}

          {phase === 'ROUND_RESULTS' && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {lastResult && <RoundFeedback correct={lastResult.correct} />}
              <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Waiting for next round...
              </p>
            </motion.div>
          )}

          {phase === 'DRINKING_SEGMENT' && (
            <motion.div
              key="drinking"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              {currentCategory === 'everybody-drinks' && (
                <p className="text-3xl font-black" style={{ color: '#EAB308' }}>
                  EVERYBODY DRINKS!
                </p>
              )}
              {currentCategory === 'hot-take' && (
                <div>
                  <p className="text-2xl font-black mb-2" style={{ color: '#EC4899' }}>
                    HOT TAKE
                  </p>
                  {partyTarget === playerName ? (
                    <p className="text-lg">Your turn! Give an unpopular music opinion or drink!</p>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {partyTarget} is on the hot seat!
                    </p>
                  )}
                </div>
              )}
              {currentCategory === 'rock-off' && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-2xl font-black" style={{ color: '#14B8A6' }}>
                    ROCK OFF!
                  </p>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Listen and buzz in to name the artist!
                  </p>
                  <GuessInput
                    category="artist"
                    disabled={false}
                    onGuessSubmitted={() => {
                      // For rock-off, submit as buzz-in
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
