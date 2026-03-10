'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { useGameState } from '@/hooks/useGameState';
import { useGameStore } from '@/stores/gameStore';
import { getSocket } from '@/lib/socket/client';
import { connectSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import PlayerLobby from '@/components/player/PlayerLobby';
import BingoCard from '@/components/player/BingoCard';
import PlayerProgress from '@/components/player/PlayerProgress';
import GuessInput from '@/components/player/GuessInput';
import RoundFeedback from '@/components/player/RoundFeedback';
import PlayerWheelSpinner from '@/components/player/PlayerWheelSpinner';
import CategoryBadge from '@/components/shared/CategoryBadge';

export default function PlayerPageContent() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  useSocket();
  useGameState();

  const {
    phase, currentCategory, timerSeconds, settings,
    bingoCard, hasGuessedThisRound, winner, roundGuesses,
    playerId, playerName, partyTarget,
    currentSpinnerId, currentSpinnerName,
  } = useGameStore();

  const setConnection = useGameStore((s) => s.setConnection);
  const setBingoCard = useGameStore((s) => s.setBingoCard);
  const setHasGuessedThisRound = useGameStore((s) => s.setHasGuessedThisRound);
  const reset = useGameStore((s) => s.reset);

  const [lastResult, setLastResult] = useState<{ correct: boolean; shouldDrink?: boolean; noGuess?: boolean } | null>(null);
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);

  // Player wheel state
  const [playerWheelSpinning, setPlayerWheelSpinning] = useState(false);
  const [playerWheelResultIndex, setPlayerWheelResultIndex] = useState<number | null>(null);
  const [playerSwipeVelocity, setPlayerSwipeVelocity] = useState<number | undefined>(undefined);

  useEffect(() => {
    const socket = getSocket();
    socket.on(SOCKET_EVENTS.GUESS_RESULT, (result: { correct: boolean; shouldDrink?: boolean; noGuess?: boolean }) => {
      setLastResult(result);
    });
    return () => {
      socket.off(SOCKET_EVENTS.GUESS_RESULT);
    };
  }, []);

  // Listen for GAME_WHEEL_RESULT on spinner's phone
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { category: string; segmentIndex: number; swipeVelocity?: number }) => {
      setPlayerWheelResultIndex(data.segmentIndex);
      setPlayerSwipeVelocity(data.swipeVelocity);
      setPlayerWheelSpinning(true);
    };
    socket.on(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    };
  }, []);

  // Handle being kicked by host
  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      reset();
      router.push('/');
    };
    socket.on(SOCKET_EVENTS.PLAYER_KICKED, handler);
    return () => {
      socket.off(SOCKET_EVENTS.PLAYER_KICKED, handler);
    };
  }, [reset, router]);

  // Reset states on phase changes
  useEffect(() => {
    if (phase === 'PLAYING') {
      setLastResult(null);
    }
    if (phase === 'SPINNING') {
      setPlayerWheelSpinning(false);
      setPlayerWheelResultIndex(null);
      setPlayerSwipeVelocity(undefined);
    }
  }, [phase]);

  const isSpinner = currentSpinnerId === playerId;

  const handleSwipe = (velocity: number) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.PLAYER_SPIN_WHEEL, { velocity });
  };

  const handlePlayerSpinComplete = () => {
    // Host's HOST_WHEEL_DONE handles the phase transition
  };

  const handleDirectJoin = async () => {
    if (!joinName.trim()) {
      setJoinError('Please enter your name');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      const socket = await connectSocket();
      socket.emit(
        SOCKET_EVENTS.PLAYER_JOIN_ROOM,
        { roomCode: roomCode.toUpperCase(), playerName: joinName.trim() },
        (result: { success: boolean; error?: string; player?: any }) => {
          if (result.success) {
            setConnection(roomCode.toUpperCase(), socket.id!, joinName.trim(), false);
            if (result.player?.bingoCard) {
              setBingoCard(result.player.bingoCard);
            }
          } else {
            setJoinError(result.error || 'Failed to join room');
          }
          setJoining(false);
        }
      );
    } catch {
      setJoinError('Could not connect to server');
      setJoining(false);
    }
  };

  // Timer display
  const timerPct = settings.timerDuration > 0 ? (timerSeconds / settings.timerDuration) * 100 : 0;
  const timerIsLow = timerSeconds <= 5;

  // Guard: if store has no connection data, show inline join form
  if (!playerId) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <div className="absolute bottom-0 w-full h-[50%] dance-floor-grid" style={{ transform: 'perspective(600px) rotateX(55deg) scale(1.6)', transformOrigin: 'bottom' }} />
          <div className="absolute top-0 left-1/4 w-24 h-full bg-gradient-to-b from-fuchsia-500/40 to-transparent -rotate-45 origin-top blur-xl mix-blend-screen" />
        </div>

        <div className="relative z-10 w-full max-w-xs">
          <h1
            className="text-3xl neon-text-fuchsia uppercase tracking-widest mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'white' }}
          >
            Hitster
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
            Room <span className="font-bold tracking-widest" style={{ color: '#d946ef' }}>{roomCode}</span>
          </p>
          <div className="flex flex-col gap-3 w-full">
            <input
              type="text"
              placeholder="Your Name"
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              maxLength={20}
              onKeyDown={(e) => e.key === 'Enter' && handleDirectJoin()}
              onFocus={(e) => {
                setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
              }}
              className="w-full py-3.5 px-4 rounded-xl text-center text-lg neon-input"
              style={{
                background: 'rgba(20, 12, 50, 0.85)',
                color: '#e2e8f0',
                border: '1.5px solid rgba(217, 70, 239, 0.4)',
              }}
              autoFocus
            />
            {joinError && (
              <p className="text-sm" style={{ color: '#ef4444' }}>{joinError}</p>
            )}
            <button
              onClick={handleDirectJoin}
              disabled={joining}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-white disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
                boxShadow: '0 0 15px rgba(217, 70, 239, 0.4)',
              }}
            >
              {joining ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'LOBBY') {
    return <PlayerLobby />;
  }

  if (phase === 'GAME_OVER') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
          <div className="absolute bottom-0 w-full h-[50%] dance-floor-grid" style={{ transform: 'perspective(600px) rotateX(55deg) scale(1.6)', transformOrigin: 'bottom' }} />
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <h1
            className="text-4xl neon-text-fuchsia uppercase tracking-widest mb-4"
            style={{ fontFamily: 'var(--font-display)', color: 'white' }}
          >
            Game Over!
          </h1>
          {winner ? (
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl font-black mb-4"
              style={{
                color: winner.name === playerName ? '#22c55e' : '#d946ef',
                textShadow: winner.name === playerName
                  ? '0 0 15px rgba(34, 197, 94, 0.5)'
                  : '0 0 15px rgba(217, 70, 239, 0.5)',
              }}
            >
              {winner.name === playerName ? 'YOU WIN!' : `${winner.name} wins!`}
            </motion.p>
          ) : (
            <p className="text-lg mb-4" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
              No more tracks available
            </p>
          )}
          <div className="bg-purple-950/30 backdrop-blur-md border border-fuchsia-900/40 rounded-2xl p-5">
            <h3
              className="text-[11px] font-bold uppercase tracking-widest text-center mb-3"
              style={{ color: 'rgba(217, 70, 239, 0.8)' }}
            >
              Your Card
            </h3>
            <BingoCard cells={bingoCard} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh flex flex-col relative overflow-y-auto overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-15">
        <div
          className="absolute bottom-0 w-full h-[40%] dance-floor-grid"
          style={{ transform: 'perspective(600px) rotateX(55deg) scale(1.6)', transformOrigin: 'bottom' }}
        />
        <div className="absolute top-0 left-[20%] w-20 h-full bg-gradient-to-b from-fuchsia-500/30 to-transparent -rotate-45 origin-top blur-xl mix-blend-screen" />
        <div className="absolute top-0 right-[20%] w-20 h-full bg-gradient-to-b from-violet-400/30 to-transparent rotate-45 origin-top blur-xl mix-blend-screen" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-svh px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg" style={{ filter: 'drop-shadow(0 0 4px rgba(217, 70, 239, 0.6))' }}>
              &#x1F3B5;
            </span>
            <span
              className="text-sm font-bold uppercase tracking-widest neon-text-fuchsia"
              style={{ fontFamily: 'var(--font-display)', color: 'white', fontSize: '14px' }}
            >
              Hitster Bingo
            </span>
          </div>
          {currentCategory && phase !== 'SPINNING' && (
            <CategoryBadge category={currentCategory} />
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <PlayerProgress />
        </div>

        {/* Timer bar (only during PLAYING) */}
        {phase === 'PLAYING' && (
          <div className="mb-3 flex items-center gap-2.5">
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ background: 'rgba(30, 20, 60, 0.8)', border: '1px solid rgba(100, 80, 140, 0.2)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: timerIsLow
                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                    : 'linear-gradient(90deg, #d946ef, #8b5cf6)',
                  boxShadow: timerIsLow
                    ? '0 0 8px rgba(239, 68, 68, 0.5)'
                    : '0 0 8px rgba(217, 70, 239, 0.4)',
                }}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span
              className={`text-lg font-bold tabular-nums ${timerIsLow ? 'animate-pulse' : ''}`}
              style={{
                color: timerIsLow ? '#ef4444' : '#d946ef',
                textShadow: timerIsLow
                  ? '0 0 8px rgba(239, 68, 68, 0.5)'
                  : '0 0 8px rgba(217, 70, 239, 0.4)',
                minWidth: '40px',
                textAlign: 'right',
              }}
            >
              {timerSeconds}s
            </span>
          </div>
        )}

        {/* Bingo Card */}
        <div className="flex justify-center mb-3">
          <BingoCard cells={bingoCard} />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-start gap-4 pb-6">
          <AnimatePresence mode="wait">
            {phase === 'SPINNING' && (
              <motion.div
                key="spinning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center w-full"
              >
                {isSpinner ? (
                  <PlayerWheelSpinner
                    onSwipe={handleSwipe}
                    isSpinning={playerWheelSpinning}
                    resultIndex={playerWheelResultIndex}
                    swipeVelocity={playerSwipeVelocity}
                    onSpinComplete={handlePlayerSpinComplete}
                  />
                ) : currentSpinnerName ? (
                  <motion.div className="flex flex-col items-center gap-3">
                    <motion.p
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-2xl font-bold"
                      style={{ color: '#d946ef', textShadow: '0 0 15px rgba(217, 70, 239, 0.5)' }}
                    >
                      {currentSpinnerName} is spinning...
                    </motion.p>
                    <p className="text-sm" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                      Watch the wheel on the big screen!
                    </p>
                  </motion.div>
                ) : (
                  <motion.p
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-2xl font-bold"
                    style={{ color: '#d946ef', textShadow: '0 0 15px rgba(217, 70, 239, 0.5)' }}
                  >
                    Spinning the wheel...
                  </motion.p>
                )}
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
                    onGuessSubmitted={() => setHasGuessedThisRound(true)}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center p-5 rounded-2xl w-full max-w-sm"
                    style={{
                      background: 'rgba(20, 12, 50, 0.6)',
                      border: '1.5px solid rgba(217, 70, 239, 0.3)',
                    }}
                  >
                    <motion.p
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-lg font-semibold"
                      style={{ color: '#d946ef', textShadow: '0 0 10px rgba(217, 70, 239, 0.4)' }}
                    >
                      Guess locked in!
                    </motion.p>
                    <p className="text-sm mt-1" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
                      Waiting for the song to end...
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {phase === 'ROUND_RESULTS' && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center w-full max-w-sm"
              >
                {lastResult && (
                  <RoundFeedback
                    correct={lastResult.correct}
                    shouldDrink={lastResult.shouldDrink}
                    noGuess={lastResult.noGuess}
                  />
                )}
                <motion.p
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mt-4 text-sm"
                  style={{ color: 'rgba(148, 163, 184, 0.6)' }}
                >
                  Waiting for next round...
                </motion.p>
              </motion.div>
            )}

            {phase === 'DRINKING_SEGMENT' && (
              <motion.div
                key="drinking"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center w-full"
              >
                {currentCategory === 'everybody-drinks' && (
                  <div className="flex flex-col items-center gap-2">
                    <motion.p
                      initial={{ scale: 0.5 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-3xl font-black"
                      style={{ color: '#EAB308', textShadow: '0 0 20px rgba(234, 179, 8, 0.5)' }}
                    >
                      EVERYBODY DRINKS!
                    </motion.p>
                    <span className="text-4xl">&#x1F37B;</span>
                  </div>
                )}
                {currentCategory === 'hot-take' && (
                  <div className="flex flex-col items-center gap-3">
                    <p
                      className="text-2xl font-black"
                      style={{ color: '#EC4899', textShadow: '0 0 15px rgba(236, 72, 153, 0.5)' }}
                    >
                      HOT TAKE
                    </p>
                    <span className="text-3xl">&#x1F525;</span>
                    {partyTarget === playerName ? (
                      <p className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
                        Your turn! Give an unpopular music opinion or drink!
                      </p>
                    ) : (
                      <p style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
                        {partyTarget} is on the hot seat!
                      </p>
                    )}
                  </div>
                )}
                {currentCategory === 'rock-off' && (() => {
                  const myGuess = roundGuesses.find((g) => g.playerName === playerName);
                  const myPosition = myGuess ? roundGuesses.findIndex((g) => g.playerName === playerName) + 1 : null;
                  const winner = roundGuesses.find((g) => g.correct);
                  const positionSuffix = (n: number) => {
                    if (n === 1) return 'st';
                    if (n === 2) return 'nd';
                    if (n === 3) return 'rd';
                    return 'th';
                  };

                  return (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <p
                        className="text-2xl font-black"
                        style={{ color: '#14B8A6', textShadow: '0 0 15px rgba(20, 184, 166, 0.5)' }}
                      >
                        ROCK OFF!
                      </p>
                      <span className="text-3xl">&#x1F3B8;</span>

                      {!myGuess ? (
                        <>
                          <p style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
                            Listen and buzz in to name the artist!
                          </p>
                          <GuessInput
                            category="artist"
                            disabled={false}
                            onGuessSubmitted={() => {}}
                          />
                        </>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full max-w-sm rounded-2xl p-5 text-center"
                          style={{
                            background: myGuess.correct
                              ? 'rgba(20, 60, 30, 0.6)'
                              : 'rgba(60, 20, 20, 0.6)',
                            border: `1.5px solid ${myGuess.correct ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                          }}
                        >
                          <div className="flex items-center justify-center gap-3 mb-2">
                            <span
                              className="text-sm font-bold px-2.5 py-0.5 rounded-full"
                              style={{
                                background: 'rgba(255,255,255,0.1)',
                                color: '#d946ef',
                              }}
                            >
                              {myPosition}{positionSuffix(myPosition!)}
                            </span>
                            <span className="text-2xl">
                              {myGuess.correct ? '\u2705' : '\u274C'}
                            </span>
                          </div>
                          <p
                            className="text-lg font-bold"
                            style={{
                              color: myGuess.correct ? '#22c55e' : '#ef4444',
                              textShadow: myGuess.correct
                                ? '0 0 10px rgba(34,197,94,0.4)'
                                : '0 0 10px rgba(239,68,68,0.4)',
                            }}
                          >
                            {myGuess.correct ? 'Correct!' : 'Wrong!'}
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>
                            &ldquo;{myGuess.guess}&rdquo;
                          </p>
                        </motion.div>
                      )}

                      {/* Winner announcement */}
                      {winner && (
                        <motion.p
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-lg font-bold text-center"
                          style={{ color: '#EAB308', textShadow: '0 0 12px rgba(234,179,8,0.5)' }}
                        >
                          &#x1F3C6; {winner.playerName === playerName ? 'You win' : `${winner.playerName} wins`} the Rock Off!
                        </motion.p>
                      )}

                      {/* Live feed */}
                      {roundGuesses.length > 0 && (
                        <div className="w-full max-w-sm space-y-1.5 mt-1">
                          {roundGuesses.map((g, i) => (
                            <motion.div
                              key={g.playerId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm"
                              style={{
                                background: 'rgba(20, 12, 50, 0.5)',
                                border: '1px solid rgba(100, 80, 140, 0.2)',
                              }}
                            >
                              <span
                                className="text-xs font-bold shrink-0 w-7 text-center px-1.5 py-0.5 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.08)', color: '#d946ef' }}
                              >
                                {i + 1}{positionSuffix(i + 1)}
                              </span>
                              <span className="flex-1 font-medium truncate" style={{ color: '#e2e8f0' }}>
                                {g.playerName}
                              </span>
                              <span className="text-base">
                                {g.correct ? '\u2705' : '\u274C'}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
