'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import gsap from 'gsap';
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
import MilestoneReward from '@/components/player/MilestoneReward';
import StreakCounter from '@/components/animations/StreakCounter';
import BingoLineCelebration from '@/components/animations/BingoLineCelebration';
import { TrophyIcon } from '@/components/animations/SVGIcons';
import { fireSideCannons } from '@/lib/confetti';
import { useAudio } from '@/hooks/useAudio';
import type { MilestoneType, SurpriseEventType, MediaType } from '@/types/game';
import { getWheelSegments } from '@/types/game';

export default function PlayerPageContent() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  useSocket();
  useGameState();

  const {
    phase, currentCategory, timerSeconds, settings,
    bingoCard, hasGuessedThisRound, winner, roundGuesses,
    playerId, playerName, players,
    currentSpinnerId, currentSpinnerName,
  } = useGameStore();

  const streak = useGameStore((s) => s.streak);
  const prevCompletedRows = useGameStore((s) => s.prevCompletedRows);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const roomError = useGameStore((s) => s.roomError);
  const setConnection = useGameStore((s) => s.setConnection);
  const setBingoCard = useGameStore((s) => s.setBingoCard);
  const setHasGuessedThisRound = useGameStore((s) => s.setHasGuessedThisRound);
  const incrementStreak = useGameStore((s) => s.incrementStreak);
  const resetStreak = useGameStore((s) => s.resetStreak);
  const setPrevCompletedRows = useGameStore((s) => s.setPrevCompletedRows);
  const reset = useGameStore((s) => s.reset);
  const { playSound, toggleMute, muted: audioMuted } = useAudio();

  const [lastResult, setLastResult] = useState<{ correct: boolean; shouldDrink?: boolean; noGuess?: boolean; pointsAwarded?: number; bonusCategories?: string[] } | null>(null);

  // Varied waiting messages — pick randomly each phase transition
  const roundEndMsg = useMemo(() => {
    const msgs = ['Waiting for the round to end...', 'Results incoming...', 'Fingers crossed...', 'Let\u2019s see how you did...'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  const nextRoundMsg = useMemo(() => {
    const msgs = ['Waiting for next round...', 'Get ready...', 'Next track loading...', 'Stay sharp...'];
    return msgs[Math.floor(Math.random() * msgs.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  // Pre-read stored name so first render shows "Rejoining..." instead of the join form
  const storedNameForRoom = useRef(
    (() => { try { return sessionStorage.getItem(`hitster_room_${roomCode.toUpperCase()}`); } catch { return null; } })()
  );

  const [joinName, setJoinName] = useState(storedNameForRoom.current ?? '');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);

  // Player wheel state
  const [playerWheelSpinning, setPlayerWheelSpinning] = useState(false);
  const [playerWheelResultIndex, setPlayerWheelResultIndex] = useState<number | null>(null);
  const [playerSwipeVelocity, setPlayerSwipeVelocity] = useState<number | undefined>(undefined);
  const [playerWheelMediaType, setPlayerWheelMediaType] = useState<MediaType | 'mixed' | undefined>(undefined);

  // Milestone state (queue for sequential display)
  const [milestoneQueue, setMilestoneQueue] = useState<{ type: MilestoneType }[]>([]);

  // Notification queue for passive alerts (surprise events, milestone received, etc.)
  const [notificationQueue, setNotificationQueue] = useState<{ message: string; color: string; colorRgb: string; icon: string }[]>([]);

  // Rock Off drink assignment state
  const [rockOffCanAssign, setRockOffCanAssign] = useState(false);
  const [rockOffDrinkAssigned, setRockOffDrinkAssigned] = useState<string | null>(null);

  // Reconnect toast
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);

  // Streak broken animation
  const [streakBroken, setStreakBroken] = useState(false);

  // Bingo cell pick state
  const [pendingPick, setPendingPick] = useState<{ eligibleIndices: number[]; category: string } | null>(null);

  // Winner confetti
  useEffect(() => {
    if (phase === 'GAME_OVER' && winner?.name === playerName) {
      fireSideCannons(30);
    }
  }, [phase, winner, playerName]);

  // Bingo line celebration
  const [showBingoCelebration, setShowBingoCelebration] = useState(false);
  const [newLineCount, setNewLineCount] = useState(0);
  const [autoRejoining, setAutoRejoining] = useState(!!storedNameForRoom.current);

  // Restore connection: if socket is already connected (client-side nav from home page),
  // just restore the Zustand store — no need to re-emit PLAYER_JOIN_ROOM.
  // If socket is NOT connected (page refresh / direct URL), do a full rejoin.
  useEffect(() => {
    if (playerId) { setAutoRejoining(false); return; }
    const storedName = storedNameForRoom.current;
    if (!storedName) return;

    const socket = getSocket();

    // Fast path: socket already connected from home page — just restore store state
    if (socket.connected && socket.id) {
      setConnection(roomCode.toUpperCase(), socket.id, storedName, false);
      // Request sync to get bingo card and current game state
      socket.emit(SOCKET_EVENTS.REQUEST_SYNC);
      setAutoRejoining(false);
      return;
    }

    // Slow path: socket not connected (page refresh) — connect and rejoin
    let cancelled = false;
    (async () => {
      try {
        const s = await connectSocket();
        s.emit(
          SOCKET_EVENTS.PLAYER_JOIN_ROOM,
          { roomCode: roomCode.toUpperCase(), playerName: storedName },
          (result: { success: boolean; error?: string; player?: any }) => {
            if (cancelled) return;
            if (result.success) {
              setConnection(roomCode.toUpperCase(), s.id!, storedName, false);
              if (result.player?.bingoCard) {
                setBingoCard(result.player.bingoCard);
              }
            } else {
              // Stored name no longer valid — clear it and show join form
              try { sessionStorage.removeItem(`hitster_room_${roomCode.toUpperCase()}`); } catch {}
            }
            setAutoRejoining(false);
          }
        );
      } catch {
        if (!cancelled) setAutoRejoining(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const socket = getSocket();
    socket.on(SOCKET_EVENTS.GUESS_RESULT, (result: { correct: boolean; shouldDrink?: boolean; noGuess?: boolean; pointsAwarded?: number; bonusCategories?: string[]; rockOffWin?: boolean }) => {
      setLastResult(result);
      if (result.rockOffWin) {
        setRockOffCanAssign(true);
      }
      // Streak tracking
      if (result.correct) {
        incrementStreak();
        if (useGameStore.getState().streak >= 2) {
          playSound('streak');
        }
      } else if (!result.noGuess) {
        if (useGameStore.getState().streak >= 2) {
          setStreakBroken(true);
          setTimeout(() => setStreakBroken(false), 1500);
        }
        resetStreak();
      }
    });
    return () => {
      socket.off(SOCKET_EVENTS.GUESS_RESULT);
    };
  }, [incrementStreak, resetStreak, playSound]);

  // Listen for BINGO_PICK_AVAILABLE (player must choose which cell to mark)
  useEffect(() => {
    const socket = getSocket();
    const pickHandler = (data: { eligibleIndices: number[]; category: string }) => {
      setPendingPick(data);
    };
    const cardHandler = () => {
      // Card was updated by the server (after pick or auto-pick) — clear pending state
      setPendingPick(null);
    };
    socket.on(SOCKET_EVENTS.BINGO_PICK_AVAILABLE, pickHandler);
    socket.on(SOCKET_EVENTS.CARD_UPDATE, cardHandler);
    return () => {
      socket.off(SOCKET_EVENTS.BINGO_PICK_AVAILABLE, pickHandler);
      socket.off(SOCKET_EVENTS.CARD_UPDATE, cardHandler);
    };
  }, []);

  // Listen for GAME_WHEEL_RESULT on spinner's phone
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { category: string; segmentIndex: number; swipeVelocity?: number; mediaType?: MediaType | 'mixed' }) => {
      setPlayerWheelResultIndex(data.segmentIndex);
      setPlayerSwipeVelocity(data.swipeVelocity);
      setPlayerWheelMediaType(data.mediaType);
      setPlayerWheelSpinning(true);
    };
    socket.on(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    };
  }, []);

  // Listen for milestone events
  useEffect(() => {
    const socket = getSocket();
    const pushNotification = (message: string, color: string, colorRgb: string, icon: string) => {
      setNotificationQueue((prev) => [...prev, { message, color, colorRgb, icon }]);
    };
    const earnedHandler = (data: { type: MilestoneType; playerName?: string }) => {
      // streak5AllDrink is a room broadcast — show as notification, not queue
      if (data.type === 'streak5AllDrink' && data.playerName) {
        if (data.playerName !== playerName) {
          pushNotification(`${data.playerName} hit a 5-streak! Everybody drinks!`, '#EAB308', '234, 179, 8', '\u{1F37B}');
        } else {
          // The streaker sees it in the queue
          setMilestoneQueue((prev) => [...prev, data]);
        }
        return;
      }
      setMilestoneQueue((prev) => [...prev, data]);
    };
    const drinksReceivedHandler = (data: { fromPlayer: string }) => {
      pushNotification(`${data.fromPlayer} assigned you a drink!`, '#EAB308', '234, 179, 8', '\u{1F37A}');
    };
    const blockReceivedHandler = (data: { fromPlayer: string }) => {
      pushNotification(`${data.fromPlayer} blocked one of your cells!`, '#ef4444', '239, 68, 68', '\u{1F6E1}');
    };
    const swapReceivedHandler = (data: { fromPlayer: string }) => {
      pushNotification(`${data.fromPlayer} swapped one of your cells!`, '#33ff77', '51, 255, 119', '\u{1F500}');
    };
    const stealReceivedHandler = (data: { fromPlayer: string; amount: number }) => {
      pushNotification(`${data.fromPlayer} stole ${data.amount} points from you!`, '#ef4444', '239, 68, 68', '\u{1F4B0}');
    };
    const shieldConsumedHandler = () => {
      pushNotification('Shield activated! Drink penalty blocked!', '#4d9fff', '77, 159, 255', '\u{1F6E1}');
    };
    const doubleConsumedHandler = () => {
      pushNotification('Double points activated! 2x score this round!', '#ff8833', '255, 136, 51', '\u{2728}');
    };
    socket.on(SOCKET_EVENTS.MILESTONE_EARNED, earnedHandler);
    socket.on(SOCKET_EVENTS.MILESTONE_DRINKS_RECEIVED, drinksReceivedHandler);
    socket.on(SOCKET_EVENTS.MILESTONE_BLOCK_RECEIVED, blockReceivedHandler);
    socket.on(SOCKET_EVENTS.MILESTONE_SWAP_RECEIVED, swapReceivedHandler);
    socket.on(SOCKET_EVENTS.MILESTONE_STEAL_RECEIVED, stealReceivedHandler);
    socket.on(SOCKET_EVENTS.MILESTONE_SHIELD_CONSUMED, shieldConsumedHandler);
    socket.on(SOCKET_EVENTS.MILESTONE_DOUBLE_CONSUMED, doubleConsumedHandler);
    return () => {
      socket.off(SOCKET_EVENTS.MILESTONE_EARNED, earnedHandler);
      socket.off(SOCKET_EVENTS.MILESTONE_DRINKS_RECEIVED, drinksReceivedHandler);
      socket.off(SOCKET_EVENTS.MILESTONE_BLOCK_RECEIVED, blockReceivedHandler);
      socket.off(SOCKET_EVENTS.MILESTONE_SWAP_RECEIVED, swapReceivedHandler);
      socket.off(SOCKET_EVENTS.MILESTONE_STEAL_RECEIVED, stealReceivedHandler);
      socket.off(SOCKET_EVENTS.MILESTONE_SHIELD_CONSUMED, shieldConsumedHandler);
      socket.off(SOCKET_EVENTS.MILESTONE_DOUBLE_CONSUMED, doubleConsumedHandler);
    };
  }, [playerName]);

  // Handle being kicked by host
  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      try { sessionStorage.removeItem(`hitster_room_${roomCode.toUpperCase()}`); } catch {}
      reset();
      router.push('/');
    };
    socket.on(SOCKET_EVENTS.PLAYER_KICKED, handler);
    return () => {
      socket.off(SOCKET_EVENTS.PLAYER_KICKED, handler);
    };
  }, [reset, router]);

  // Handle room closed by host
  useEffect(() => {
    const socket = getSocket();
    const handler = () => {
      try { sessionStorage.removeItem(`hitster_room_${roomCode.toUpperCase()}`); } catch {}
      reset();
      router.push('/');
    };
    socket.on(SOCKET_EVENTS.ROOM_CLOSED, handler);
    return () => {
      socket.off(SOCKET_EVENTS.ROOM_CLOSED, handler);
    };
  }, [reset, router]);

  // Listen for surprise events
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { type: SurpriseEventType; targetName: string | null; targetName2?: string | null }) => {
      playSound('surprise');
      const SURPRISE_MESSAGES: Record<SurpriseEventType, string> = {
        spotlight: `Spotlight! ${data.targetName} drinks!`,
        doubleRound: 'Double Round! 2x scores next round!',
        everybodyCheers: 'Everybody Cheers! All drink!',
        categoryCurse: `Category Curse! ${data.targetName} lost a cell!`,
        luckyStar: `Lucky Star! ${data.targetName} gets a free cell!`,
        hotSeat: `Hot Seat! ${data.targetName}: 2x drinks if wrong!`,
        timePressure: 'Time Pressure! Half timer next round!',
        streakBreaker: `Streak Breaker! ${data.targetName}'s streak shattered!`,
        scoreSwap: `Score Swap! ${data.targetName} & ${data.targetName2} swapped scores!`,
        pointThief: `Point Thief! ${data.targetName} stole 150 pts from ${data.targetName2}!`,
      };
      setNotificationQueue((prev) => [...prev, {
        message: SURPRISE_MESSAGES[data.type],
        color: '#bc4dff',
        colorRgb: '188, 77, 255',
        icon: '\u{2728}',
      }]);
    };
    socket.on(SOCKET_EVENTS.SURPRISE_EVENT, handler);
    return () => {
      socket.off(SOCKET_EVENTS.SURPRISE_EVENT, handler);
    };
  }, [playSound]);

  // Reset states on phase changes
  useEffect(() => {
    if (phase === 'PLAYING') {
      setLastResult(null);
    }
    if (phase === 'SPINNING') {
      setPlayerWheelSpinning(false);
      setPlayerWheelResultIndex(null);
      setPlayerSwipeVelocity(undefined);
      const cm = settings.contentMode;
      setPlayerWheelMediaType(cm === 'mixed' ? 'mixed' : cm === 'movie' ? 'movie' : undefined);
      setRockOffCanAssign(false);
      setRockOffDrinkAssigned(null);
    }
  }, [phase]);

  // Detect bingo line completions
  useEffect(() => {
    if (bingoCard.length === 0) return;
    const LINES = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    const completedCount = LINES.filter(line =>
      line.every(i => bingoCard[i]?.marked)
    ).length;

    if (completedCount > prevCompletedRows && prevCompletedRows >= 0) {
      const newLines = completedCount - prevCompletedRows;
      setNewLineCount(newLines);
      setShowBingoCelebration(true);
      playSound('bingo');
    }
    setPrevCompletedRows(completedCount);
  }, [bingoCard, prevCompletedRows, setPrevCompletedRows, playSound]);

  const isSpinner = currentSpinnerId === playerId;

  // Scroll to top when player wheel spinner mounts (fixes black screen bug)
  useEffect(() => {
    if (phase === 'SPINNING' && isSpinner) {
      window.scrollTo(0, 0);
    }
  }, [phase, isSpinner]);

  // Play win fanfare when game ends with a winner
  useEffect(() => {
    if (winner) {
      playSound('win');
    }
  }, [winner, playSound]);

  // Show reconnected toast when connection recovers
  const prevConnectionRef = useRef(connectionStatus);
  useEffect(() => {
    const wasDisconnected = prevConnectionRef.current === 'disconnected' || prevConnectionRef.current === 'reconnecting';
    if (connectionStatus === 'connected' && wasDisconnected && playerId) {
      setShowReconnectedToast(true);
      const timer = setTimeout(() => setShowReconnectedToast(false), 3000);
      prevConnectionRef.current = connectionStatus;
      return () => clearTimeout(timer);
    }
    prevConnectionRef.current = connectionStatus;
  }, [connectionStatus, playerId]);

  const handleBingoCellPick = (cellIndex: number) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.BINGO_CELL_PICK, { cellIndex });
    setPendingPick(null);
  };

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

  const handleSpectatorJoin = async () => {
    setJoinError('');
    try {
      const socket = await connectSocket();
      socket.emit(
        SOCKET_EVENTS.SPECTATOR_JOIN,
        { roomCode: roomCode.toUpperCase() },
        (result: { success: boolean; error?: string }) => {
          if (result.success) {
            setIsSpectator(true);
          } else {
            setJoinError(result.error || 'Failed to join as spectator');
          }
        }
      );
    } catch {
      setJoinError('Could not connect to server');
    }
  };

  // Timer display
  const timerPct = settings.timerDuration > 0 ? (timerSeconds / settings.timerDuration) * 100 : 0;
  const timerIsLow = timerSeconds <= 5;

  // Room error state (room closed or not found)
  if (roomError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--error)' }}>Room Unavailable</h1>
        <p className="text-base mb-6" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>{roomError}</p>
        <button
          onClick={() => { try { sessionStorage.removeItem(`hitster_room_${roomCode.toUpperCase()}`); } catch {} reset(); router.push('/'); }}
          className="py-3 px-8 rounded-xl font-bold text-white cursor-pointer uppercase tracking-wider"
          style={{
            background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
            boxShadow: '0 0 15px rgba(217, 70, 239, 0.4)',
          }}
        >
          Return Home
        </button>
      </div>
    );
  }

  // Guard: if store has no connection data, show inline join form, auto-rejoin loading, or spectator view
  if (!playerId) {
    // Spectator mode — read-only view of the game
    if (isSpectator) {
      return <SpectatorView roomCode={roomCode} phase={phase} roundNumber={useGameStore.getState().roundNumber} timerSeconds={timerSeconds} timerPct={timerPct} players={players} winner={winner} settings={settings} onJoinGame={() => setIsSpectator(false)} />;
    }
    // Show loading while auto-rejoining from sessionStorage
    if (autoRejoining) {
      return (
        <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
          <p
            className="text-lg font-semibold animate-pulse"
            style={{ color: 'var(--game-fuchsia)', textShadow: '0 0 10px rgba(217, 70, 239, 0.4)' }}
          >
            Rejoining game...
          </p>
        </div>
      );
    }
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
            Room <span className="font-bold tracking-widest" style={{ color: 'var(--game-fuchsia)' }}>{roomCode}</span>
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
              <p className="text-sm" style={{ color: 'var(--error)' }}>{joinError}</p>
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
            <button
              onClick={handleSpectatorJoin}
              className="w-full py-3 px-6 rounded-xl font-medium text-white cursor-pointer uppercase tracking-wider text-sm"
              style={{
                background: 'transparent',
                border: '1.5px solid rgba(148, 163, 184, 0.4)',
                color: 'rgba(148, 163, 184, 0.8)',
              }}
            >
              Watch as Spectator
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
    return <PlayerGameOver winner={winner} playerName={playerName} bingoCard={bingoCard} />;
  }

  return (
    <div className="min-h-svh flex flex-col relative overflow-y-auto overflow-x-hidden pb-safe">
      {/* Connection status banners */}
      {connectionStatus === 'disconnected' && (
        <div
          className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-bold"
          style={{
            background: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            backdropFilter: 'blur(8px)',
          }}
        >
          Connection lost — reconnecting...
        </div>
      )}
      {connectionStatus === 'reconnecting' && (
        <div
          className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-bold"
          style={{
            background: 'rgba(234, 179, 8, 0.9)',
            color: 'white',
            backdropFilter: 'blur(8px)',
          }}
        >
          Reconnecting...
        </div>
      )}
      {showReconnectedToast && (
        <ReconnectedToast />
      )}

      {/* Milestone reward overlay (queue — shows first item) */}
      {milestoneQueue.length > 0 && playerId && (
        <MilestoneReward
          milestone={milestoneQueue[0]}
          players={players}
          myPlayerId={playerId}
          myBingoCard={bingoCard}
          onDismiss={() => setMilestoneQueue((prev) => prev.slice(1))}
        />
      )}

      {/* Notification queue overlay (surprise events, milestone received, etc.) */}
      {notificationQueue.length > 0 && (
        <NotificationOverlay notification={notificationQueue[0]} onDismiss={() => setNotificationQueue((prev) => prev.slice(1))} />
      )}
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
        {/* Bingo line celebration overlay */}
        {showBingoCelebration && (
          <BingoLineCelebration
            active={showBingoCelebration}
            lineCount={newLineCount}
            onComplete={() => setShowBingoCelebration(false)}
          />
        )}

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
            <StreakCounter streak={streak} broken={streakBroken} />
          </div>
          <div className="flex items-center gap-2">
            {currentCategory && phase !== 'SPINNING' && (
              <CategoryBadge category={currentCategory} />
            )}
            <button
              onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition-colors"
              style={{
                background: audioMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(217, 70, 239, 0.15)',
                border: `1px solid ${audioMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(217, 70, 239, 0.25)'}`,
              }}
              title={audioMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              <span style={{ fontSize: '14px' }}>{audioMuted ? '\u{1F507}' : '\u{1F50A}'}</span>
            </button>
          </div>
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
              <PlayerTimerBar pct={timerPct} isLow={timerIsLow} />
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

        {/* Pick cell banner */}
        {pendingPick && (
          <PickCellBanner />
        )}

        {/* Bingo Card — hide when player is actively spinning the wheel */}
        {!(phase === 'SPINNING' && isSpinner) && <div className="flex justify-center mb-3">
          <BingoCard
            cells={bingoCard}
            pickableIndices={pendingPick ? new Set(pendingPick.eligibleIndices) : undefined}
            onCellPick={pendingPick ? handleBingoCellPick : undefined}
          />
        </div>}

        {/* Main Content — GSAP-animated phase container */}
        <PlayerPhaseContent
          phase={phase}
          isSpinner={isSpinner}
          currentSpinnerName={currentSpinnerName}
          currentCategory={currentCategory}
          hasGuessedThisRound={hasGuessedThisRound}
          timerSeconds={timerSeconds}
          roundEndMsg={roundEndMsg}
          nextRoundMsg={nextRoundMsg}
          lastResult={lastResult}
          roundGuesses={roundGuesses}
          playerName={playerName}
          players={players}
          settings={settings}
          rockOffCanAssign={rockOffCanAssign}
          rockOffDrinkAssigned={rockOffDrinkAssigned}
          playerWheelSpinning={playerWheelSpinning}
          playerWheelResultIndex={playerWheelResultIndex}
          playerSwipeVelocity={playerSwipeVelocity}
          playerWheelMediaType={playerWheelMediaType}
          onSwipe={handleSwipe}
          onPlayerSpinComplete={handlePlayerSpinComplete}
          onGuessSubmitted={() => setHasGuessedThisRound(true)}
          onRockOffAssign={(targetId, targetName) => {
            const socket = getSocket();
            socket.emit(SOCKET_EVENTS.ROCK_OFF_ASSIGN_DRINK, { targetPlayerId: targetId });
            setRockOffDrinkAssigned(targetName);
            setRockOffCanAssign(false);
          }}
        />
      </div>
    </div>
  );
}

/* ── Helper components extracted for GSAP animation ── */

function ReconnectedToast() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, []);
  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 right-0 z-50 py-2 px-4 text-center text-sm font-bold"
      style={{ background: 'rgba(34, 197, 94, 0.9)', color: 'white', backdropFilter: 'blur(8px)', opacity: 0 }}
    >
      Reconnected!
    </div>
  );
}

function NotificationOverlay({ notification, onDismiss }: { notification: { message: string; color: string; colorRgb: string; icon: string }; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
    });
    return () => ctx.revert();
  }, []);
  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', opacity: 0 }}
    >
      <div
        className="max-w-sm w-full rounded-2xl p-5 text-center"
        style={{
          background: `linear-gradient(135deg, rgba(${notification.colorRgb}, 0.2), rgba(20, 12, 50, 0.95))`,
          border: `2px solid rgba(${notification.colorRgb}, 0.6)`,
          boxShadow: `0 0 30px rgba(${notification.colorRgb}, 0.3)`,
        }}
      >
        <div className="text-4xl mb-3">{notification.icon}</div>
        <p className="text-lg font-black uppercase tracking-wider mb-5" style={{ color: notification.color, textShadow: `0 0 12px rgba(${notification.colorRgb}, 0.5)` }}>
          {notification.message}
        </p>
        <button onClick={onDismiss} className="py-2.5 px-6 rounded-xl font-bold text-white cursor-pointer" style={{ background: `linear-gradient(135deg, ${notification.color}, ${notification.color}cc)`, boxShadow: `0 0 12px rgba(${notification.colorRgb}, 0.4)` }}>
          Got it!
        </button>
      </div>
    </div>
  );
}

function PlayerTimerBar({ pct, isLow }: { pct: number; isLow: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, { width: `${pct}%`, duration: 0.3, ease: 'none' });
  }, [pct]);
  return (
    <div
      ref={ref}
      className="h-full rounded-full"
      style={{
        background: isLow ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #d946ef, #8b5cf6)',
        boxShadow: isLow ? '0 0 8px rgba(239, 68, 68, 0.5)' : '0 0 8px rgba(217, 70, 239, 0.4)',
        width: `${pct}%`,
      }}
    />
  );
}

function PickCellBanner() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, []);
  return (
    <div
      ref={ref}
      className="mb-2 py-2 px-4 rounded-xl text-center"
      style={{ background: 'rgba(217, 70, 239, 0.15)', border: '1.5px solid rgba(217, 70, 239, 0.5)', boxShadow: '0 0 12px rgba(217, 70, 239, 0.2)', opacity: 0 }}
    >
      <p className="text-sm font-bold" style={{ color: 'var(--game-fuchsia)', textShadow: '0 0 8px rgba(217, 70, 239, 0.4)' }}>
        Pick a cell to mark!
      </p>
    </div>
  );
}

function PlayerGameOver({ winner, playerName, bingoCard }: { winner: any; playerName: string | null; bingoCard: any[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trophyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const winnerRef = useRef<HTMLParagraphElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isWinner = winner?.name === playerName;

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      if (trophyRef.current) {
        tl.fromTo(trophyRef.current,
          { y: -100, scale: 0, rotation: -30 },
          { y: 0, scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' },
          0
        );
      }
      if (titleRef.current) {
        tl.fromTo(titleRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
          0.4
        );
      }
      if (winnerRef.current) {
        tl.fromTo(winnerRef.current,
          { scale: 0.5, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' },
          0.6
        );
      }
      if (cardRef.current) {
        tl.fromTo(cardRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
          1
        );
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="min-h-dvh flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className="absolute bottom-0 w-full h-[50%] dance-floor-grid" style={{ transform: 'perspective(600px) rotateX(55deg) scale(1.6)', transformOrigin: 'bottom' }} />
      </div>
      <div className="relative z-10 flex flex-col items-center">
        {winner && (
          <div ref={trophyRef} className="mb-4" style={{ opacity: 0 }}>
            <TrophyIcon size={isWinner ? 80 : 64} color="#EAB308" />
          </div>
        )}
        <h1
          ref={titleRef}
          className="text-4xl neon-text-fuchsia uppercase tracking-widest mb-4"
          style={{ fontFamily: 'var(--font-display)', color: 'white', opacity: 0 }}
        >
          Game Over!
        </h1>
        {winner ? (
          <p
            ref={winnerRef}
            className="text-2xl font-black mb-4"
            style={{
              color: isWinner ? '#22c55e' : '#d946ef',
              textShadow: isWinner ? '0 0 15px rgba(34, 197, 94, 0.5)' : '0 0 15px rgba(217, 70, 239, 0.5)',
              opacity: 0,
            }}
          >
            {isWinner ? 'YOU WIN!' : `${winner.name} wins!`}
          </p>
        ) : (
          <p className="text-lg mb-4" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>No more tracks available</p>
        )}
        <div ref={cardRef} className="bg-purple-950/30 backdrop-blur-md border border-fuchsia-900/40 rounded-2xl p-5" style={{ opacity: 0 }}>
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-center mb-3" style={{ color: 'rgba(217, 70, 239, 0.8)' }}>Your Card</h3>
          <BingoCard cells={bingoCard} />
        </div>
      </div>
    </div>
  );
}

/* ── Main phase content with GSAP transitions ── */
interface PlayerPhaseContentProps {
  phase: string;
  isSpinner: boolean;
  currentSpinnerName: string | null;
  currentCategory: string | null;
  hasGuessedThisRound: boolean;
  timerSeconds: number;
  roundEndMsg: string;
  nextRoundMsg: string;
  lastResult: { correct: boolean; shouldDrink?: boolean; noGuess?: boolean; pointsAwarded?: number; bonusCategories?: string[] } | null;
  roundGuesses: any[];
  playerName: string | null;
  players: any[];
  settings: any;
  rockOffCanAssign: boolean;
  rockOffDrinkAssigned: string | null;
  playerWheelSpinning: boolean;
  playerWheelResultIndex: number | null;
  playerSwipeVelocity?: number;
  playerWheelMediaType?: any;
  onSwipe: (v: number) => void;
  onPlayerSpinComplete: () => void;
  onGuessSubmitted: () => void;
  onRockOffAssign: (targetId: string, targetName: string) => void;
}

function PlayerPhaseContent(props: PlayerPhaseContentProps) {
  const {
    phase, isSpinner, currentSpinnerName, currentCategory,
    hasGuessedThisRound, timerSeconds, roundEndMsg, nextRoundMsg,
    lastResult, roundGuesses, playerName, players, settings,
    rockOffCanAssign, rockOffDrinkAssigned,
    playerWheelSpinning, playerWheelResultIndex, playerSwipeVelocity, playerWheelMediaType,
    onSwipe, onPlayerSpinComplete, onGuessSubmitted, onRockOffAssign,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const prevPhaseRef = useRef(phase);
  const pulseRef = useRef<HTMLParagraphElement>(null);

  // Animate container on phase change
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { gsap.set(el, { opacity: 1, y: 0, scale: 1 }); return; }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      if (prev !== phase) {
        tl.to(el, { opacity: 0, y: -10, duration: 0.15, ease: 'power2.in' });
      }
      // Phase-specific entrances
      if (phase === 'SPINNING') {
        tl.fromTo(el, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' });
      } else if (phase === 'PLAYING') {
        tl.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
      } else if (phase === 'ROUND_RESULTS') {
        tl.fromTo(el, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
      } else if (phase === 'DRINKING_SEGMENT') {
        tl.fromTo(el, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
      } else {
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.3 });
      }
    });
    return () => ctx.revert();
  }, [phase]);

  // Pulse animation for waiting text
  useEffect(() => {
    const el = pulseRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0.4 }, { opacity: 0.8, duration: 1, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    });
    return () => ctx.revert();
  });

  const positionSuffix = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

  return (
    <div ref={containerRef} className="flex-1 flex flex-col items-center justify-start gap-4 pb-6" style={{ opacity: 0 }}>
      {phase === 'SPINNING' && (
        <div className="text-center w-full">
          {isSpinner ? (
            <PlayerWheelSpinner
              onSwipe={onSwipe}
              isSpinning={playerWheelSpinning}
              resultIndex={playerWheelResultIndex}
              swipeVelocity={playerSwipeVelocity}
              onSpinComplete={onPlayerSpinComplete}
              segments={getWheelSegments(playerWheelMediaType ?? (settings.contentMode === 'mixed' ? 'mixed' : settings.contentMode === 'movie' ? 'movie' : 'music'))}
            />
          ) : currentSpinnerName ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-2xl font-bold animate-pulse" style={{ color: 'var(--game-fuchsia)', textShadow: '0 0 15px rgba(217, 70, 239, 0.5)' }}>
                {currentSpinnerName} is spinning...
              </p>
              <p className="text-sm" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>Watch the wheel on the big screen!</p>
            </div>
          ) : (
            <p className="text-2xl font-bold animate-pulse" style={{ color: 'var(--game-fuchsia)', textShadow: '0 0 15px rgba(217, 70, 239, 0.5)' }}>
              Spinning the wheel...
            </p>
          )}
        </div>
      )}

      {phase === 'PLAYING' && currentCategory && (
        <div className="w-full flex flex-col items-center gap-4">
          {!hasGuessedThisRound ? (
            <GuessInput category={currentCategory} disabled={hasGuessedThisRound} onGuessSubmitted={onGuessSubmitted} timerSeconds={timerSeconds} />
          ) : (
            <div className="text-center p-5 rounded-2xl w-full max-w-sm" style={{ background: 'rgba(20, 12, 50, 0.6)', border: '1.5px solid rgba(217, 70, 239, 0.3)' }}>
              <p className="text-lg font-semibold animate-pulse" style={{ color: 'var(--game-fuchsia)', textShadow: '0 0 10px rgba(217, 70, 239, 0.4)' }}>
                Guess locked in!
              </p>
              <p className="text-sm mt-1" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>{roundEndMsg}</p>
            </div>
          )}
        </div>
      )}

      {phase === 'ROUND_RESULTS' && (
        <div className="text-center w-full max-w-sm">
          {lastResult && (
            <RoundFeedback
              correct={lastResult.correct}
              shouldDrink={lastResult.shouldDrink}
              noGuess={lastResult.noGuess}
              pointsAwarded={lastResult.pointsAwarded}
              bonusCategories={lastResult.bonusCategories}
            />
          )}
          <p ref={pulseRef} className="mt-4 text-sm" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>{nextRoundMsg}</p>
        </div>
      )}

      {phase === 'DRINKING_SEGMENT' && (
        <div className="text-center w-full">
          {currentCategory === 'everybody-drinks' && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-3xl font-black animate-pulse" style={{ color: 'var(--game-gold)', textShadow: '0 0 20px rgba(234, 179, 8, 0.5)' }}>
                EVERYBODY DRINKS!
              </p>
              <span className="text-4xl">&#x1F37B;</span>
            </div>
          )}
          {currentCategory === 'rock-off' && (() => {
            const myGuess = roundGuesses.find((g: any) => g.playerName === playerName);
            const myPosition = myGuess ? roundGuesses.findIndex((g: any) => g.playerName === playerName) + 1 : null;
            const winner = roundGuesses.find((g: any) => g.correct);

            return (
              <div className="flex flex-col items-center gap-4 w-full">
                <p className="text-2xl font-black" style={{ color: '#14B8A6', textShadow: '0 0 15px rgba(20, 184, 166, 0.5)' }}>ROCK OFF!</p>
                <span className="text-3xl">&#x1F3B8;</span>
                {!myGuess ? (
                  <div className="w-full rock-off-urgency rounded-2xl p-4" style={{ background: 'rgba(20, 184, 166, 0.05)', border: '2px solid rgba(20, 184, 166, 0.3)' }}>
                    <p className="text-center mb-3 font-bold animate-pulse" style={{ color: 'rgba(20, 184, 166, 0.9)' }}>
                      &#x26A1; Buzz in fast! Name the {settings.contentMode === 'movie' ? 'movie' : 'artist'}!
                    </p>
                    <GuessInput category={settings.contentMode === 'movie' ? 'movie-title' : 'artist'} disabled={false} onGuessSubmitted={() => {}} />
                  </div>
                ) : (
                  <RockOffResult
                    myGuess={myGuess}
                    myPosition={myPosition!}
                    rockOffCanAssign={rockOffCanAssign}
                    rockOffDrinkAssigned={rockOffDrinkAssigned}
                    players={players}
                    playerName={playerName}
                    onRockOffAssign={onRockOffAssign}
                  />
                )}
                {winner && (
                  <p className="text-lg font-bold text-center" style={{ color: 'var(--game-gold)', textShadow: '0 0 12px rgba(234,179,8,0.5)' }}>
                    &#x1F3C6; {winner.playerName === playerName ? 'You win' : `${winner.playerName} wins`} the Rock Off!
                  </p>
                )}
                {roundGuesses.length > 0 && (
                  <RockOffFeed guesses={roundGuesses} />
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function RockOffResult({ myGuess, myPosition, rockOffCanAssign, rockOffDrinkAssigned, players, playerName, onRockOffAssign }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const positionSuffix = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="w-full max-w-sm rounded-2xl p-5 text-center" style={{
      background: myGuess.correct ? 'rgba(20, 60, 30, 0.6)' : 'rgba(60, 20, 20, 0.6)',
      border: `1.5px solid ${myGuess.correct ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
      opacity: 0,
    }}>
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="text-sm font-bold px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--game-fuchsia)' }}>
          {myPosition}{positionSuffix(myPosition)}
        </span>
        <span className="text-2xl">{myGuess.correct ? '\u2705' : '\u274C'}</span>
      </div>
      <p className="text-lg font-bold" style={{ color: myGuess.correct ? '#22c55e' : '#ef4444', textShadow: myGuess.correct ? '0 0 10px rgba(34,197,94,0.4)' : '0 0 10px rgba(239,68,68,0.4)' }}>
        {myGuess.correct ? 'Correct!' : 'Wrong!'}
      </p>
      <p className="text-sm mt-1" style={{ color: 'rgba(148,163,184,0.6)' }}>&ldquo;{myGuess.guess}&rdquo;</p>
      {myGuess.correct && rockOffCanAssign && !rockOffDrinkAssigned && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(34, 197, 94, 0.3)' }}>
          <p className="text-sm font-black uppercase tracking-wider mb-2" style={{ color: 'var(--game-gold)', textShadow: '0 0 8px rgba(234,179,8,0.4)' }}>&#x1F37A; Assign a drink!</p>
          <div className="flex flex-col gap-1.5">
            {players.filter((p: any) => p.name !== playerName && p.connected).map((p: any) => (
              <button key={p.id} onClick={() => onRockOffAssign(p.id, p.name)} className="w-full py-2.5 px-4 rounded-xl font-semibold text-white text-left cursor-pointer transition-all" style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {rockOffDrinkAssigned && (
        <p className="mt-3 text-sm font-bold" style={{ color: 'var(--game-gold)', textShadow: '0 0 8px rgba(234,179,8,0.4)' }}>&#x1F37B; Drink assigned to {rockOffDrinkAssigned}!</p>
      )}
    </div>
  );
}

function RockOffFeed({ guesses }: { guesses: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const positionSuffix = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el.children, { opacity: 0, x: -20 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.3, ease: 'power2.out' });
    });
    return () => ctx.revert();
  }, [guesses.length]);

  return (
    <div ref={ref} className="w-full max-w-sm space-y-1.5 mt-1">
      {guesses.map((g: any, i: number) => (
        <div key={g.playerId} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(20, 12, 50, 0.5)', border: '1px solid rgba(100, 80, 140, 0.2)' }}>
          <span className="text-xs font-bold shrink-0 w-7 text-center px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--game-fuchsia)' }}>{i + 1}{positionSuffix(i + 1)}</span>
          <span className="flex-1 font-medium truncate" style={{ color: '#e2e8f0' }}>{g.playerName}</span>
          <span className="text-base">{g.correct ? '\u2705' : '\u274C'}</span>
        </div>
      ))}
    </div>
  );
}
