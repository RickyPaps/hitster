import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from './events';
import { createRoom, getRoom, addPlayer, removePlayer, kickPlayer, deleteRoom, getNextTrack, touchRoom, getAllRoomCodes, resetRoomToLobby, cleanupAbandonedRooms } from '../game/room';
import { countCompletedLines, generateBingoCard } from '../game/bingo';
import { createGameEngine } from '../game/engine';
import { clearRoomTimer, startRoundTimer } from '../game/timer';
import { checkAnswer } from '../game/matching';
import type { LobbySettings, Track, RoomState, GuessResult, SurpriseEventType, Player } from '@/types/game';
import { isMovieTrack } from '@/types/game';
import { isGuessCategory, isPartyCategory } from '../game/wheel';

const ROOM_CODE_RE = /^[A-Z2-9]{4}$/;
const SPINNER_TIMEOUT_MS = 15_000;
const SURPRISE_MIN_MS = 3 * 60 * 1000; // 3 minutes
const SURPRISE_MAX_MS = 5 * 60 * 1000; // 5 minutes

const engines = new Map<string, ReturnType<typeof createGameEngine>>();
const spinnerTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
const surpriseTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Pending bingo cell picks: Map<roomCode, Map<playerId, { eligibleIndices, timeout }>>
const pendingBingoPicks = new Map<string, Map<string, { eligibleIndices: number[]; timeout: ReturnType<typeof setTimeout> }>>();

const BINGO_PICK_TIMEOUT_MS = 10_000;

function clearPendingBingoPicks(roomCode: string) {
  const roomPicks = pendingBingoPicks.get(roomCode);
  if (roomPicks) {
    for (const pick of roomPicks.values()) {
      clearTimeout(pick.timeout);
    }
    pendingBingoPicks.delete(roomCode);
  }
}

function autoPickBingoCell(io: Server, roomCode: string, playerId: string) {
  const roomPicks = pendingBingoPicks.get(roomCode);
  if (!roomPicks) return;
  const pick = roomPicks.get(playerId);
  if (!pick) return;

  const room = getRoom(roomCode);
  if (!room) { roomPicks.delete(playerId); return; }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) { roomPicks.delete(playerId); return; }

  // Auto-mark the first eligible cell
  const cellIndex = pick.eligibleIndices[0];
  if (cellIndex !== undefined && !player.bingoCard[cellIndex]?.marked) {
    player.bingoCard[cellIndex].marked = true;

    // Recalculate completed rows and award row bonuses
    const prevRows = player.completedRows;
    player.completedRows = countCompletedLines(player.bingoCard);
    if (player.completedRows > prevRows) {
      player.score += 250 * (player.completedRows - prevRows);
      if (room.settings.drinkOnRowComplete) {
        player.drinks += (player.completedRows - prevRows);
      }
    }

    const ps = io.sockets.sockets.get(playerId);
    if (ps) ps.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
    syncRoom(io, room);
  }

  roomPicks.delete(playerId);
  if (roomPicks.size === 0) pendingBingoPicks.delete(roomCode);
}

function clearSpinnerTimeout(roomCode: string) {
  const timeout = spinnerTimeouts.get(roomCode);
  if (timeout) {
    clearTimeout(timeout);
    spinnerTimeouts.delete(roomCode);
  }
}

function startSpinnerTimeout(io: Server, roomCode: string) {
  clearSpinnerTimeout(roomCode);
  const timeout = setTimeout(() => {
    spinnerTimeouts.delete(roomCode);
    const room = getRoom(roomCode);
    if (!room || room.phase !== 'SPINNING') return;
    // Clear spinner — host will see SPIN! button (fallback)
    room.currentSpinnerId = null;
    room.currentSpinnerName = null;
    syncRoom(io, room);
  }, SPINNER_TIMEOUT_MS);
  spinnerTimeouts.set(roomCode, timeout);
}

function clearSurpriseTimer(roomCode: string) {
  const timer = surpriseTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    surpriseTimers.delete(roomCode);
  }
}

function scheduleSurpriseEvent(io: Server, roomCode: string) {
  clearSurpriseTimer(roomCode);
  const delay = SURPRISE_MIN_MS + Math.random() * (SURPRISE_MAX_MS - SURPRISE_MIN_MS);
  const timer = setTimeout(() => {
    surpriseTimers.delete(roomCode);
    fireSurpriseEvent(io, roomCode);
  }, delay);
  surpriseTimers.set(roomCode, timer);
}

function fireSurpriseEvent(io: Server, roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return;

  // Only fire between rounds
  if (room.phase !== 'ROUND_RESULTS' && room.phase !== 'SPINNING') {
    // Re-schedule for later
    scheduleSurpriseEvent(io, roomCode);
    return;
  }

  const connectedPlayers = room.players.filter((p) => p.connected);
  if (connectedPlayers.length === 0) return;

  // Build available events — some require 2+ players
  const ALL_EVENTS: SurpriseEventType[] = ['spotlight', 'doubleRound', 'everybodyCheers', 'categoryCurse', 'luckyStar', 'hotSeat', 'timePressure', 'streakBreaker', 'scoreSwap', 'pointThief'];
  const EVENTS = connectedPlayers.length >= 2
    ? ALL_EVENTS
    : ALL_EVENTS.filter((e) => e !== 'scoreSwap' && e !== 'pointThief');
  const eventType = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  const randomPlayer = connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)];

  let targetName: string | null = null;
  let targetName2: string | null = null;

  switch (eventType) {
    case 'spotlight':
      randomPlayer.drinks += 1;
      targetName = randomPlayer.name;
      break;
    case 'doubleRound':
      room.surpriseModifiers.doublePoints = true;
      break;
    case 'everybodyCheers':
      for (const p of connectedPlayers) p.drinks += 1;
      break;
    case 'categoryCurse': {
      const markedCells = randomPlayer.bingoCard
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.marked);
      if (markedCells.length > 0) {
        const pick = markedCells[Math.floor(Math.random() * markedCells.length)];
        randomPlayer.bingoCard[pick.i].marked = false;
        randomPlayer.completedRows = countCompletedLines(randomPlayer.bingoCard);
        const ps = io.sockets.sockets.get(randomPlayer.id);
        if (ps) ps.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: randomPlayer.bingoCard });
      }
      targetName = randomPlayer.name;
      break;
    }
    case 'luckyStar': {
      const unmarkedCells = randomPlayer.bingoCard
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => !c.marked);
      if (unmarkedCells.length > 0) {
        const pick = unmarkedCells[Math.floor(Math.random() * unmarkedCells.length)];
        randomPlayer.bingoCard[pick.i].marked = true;
        randomPlayer.completedRows = countCompletedLines(randomPlayer.bingoCard);
        const ps = io.sockets.sockets.get(randomPlayer.id);
        if (ps) ps.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: randomPlayer.bingoCard });
      }
      targetName = randomPlayer.name;
      break;
    }
    case 'hotSeat':
      room.surpriseModifiers.hotSeatPlayerId = randomPlayer.id;
      targetName = randomPlayer.name;
      break;
    case 'timePressure':
      room.surpriseModifiers.halfTimer = true;
      break;
    case 'streakBreaker':
      randomPlayer.streak = 0;
      targetName = randomPlayer.name;
      break;
    case 'scoreSwap': {
      const others = connectedPlayers.filter((p) => p.id !== randomPlayer.id);
      const other = others[Math.floor(Math.random() * others.length)];
      const tmp = randomPlayer.score;
      randomPlayer.score = other.score;
      other.score = tmp;
      targetName = randomPlayer.name;
      targetName2 = other.name;
      break;
    }
    case 'pointThief': {
      const victims = connectedPlayers.filter((p) => p.id !== randomPlayer.id);
      const victim = victims[Math.floor(Math.random() * victims.length)];
      const stolen = Math.min(150, victim.score);
      victim.score -= stolen;
      randomPlayer.score += stolen;
      targetName = randomPlayer.name;
      targetName2 = victim.name;
      break;
    }
  }

  io.to(roomCode).emit(SOCKET_EVENTS.SURPRISE_EVENT, {
    type: eventType,
    targetName,
    targetName2,
  });

  syncRoom(io, room);
  scheduleSurpriseEvent(io, roomCode);
}

function selectSpinnerForRoom(io: Server, room: RoomState) {
  const engine = getEngine(room.roomCode);
  if (!engine) return;

  // Pre-determine spin result
  const spinResult = engine.doSpin();
  room.pendingSpinResult = spinResult;

  // Pick random connected player
  const spinner = engine.getRandomPlayer();
  if (spinner) {
    room.currentSpinnerId = spinner.id;
    room.currentSpinnerName = spinner.name;
    io.to(room.roomCode).emit(SOCKET_EVENTS.GAME_SPINNER_SELECTED, {
      playerId: spinner.id,
      playerName: spinner.name,
    });
    startSpinnerTimeout(io, room.roomCode);
  }
  // If no players connected, spinner stays null — host sees SPIN! button
}

function handleWheelAnimationComplete(io: Server, roomCode: string) {
  const engine = getEngine(roomCode);
  if (!engine) return;
  const room = getRoom(roomCode);
  if (!room) return;

  // Idempotency: only process if still in SPINNING phase
  if (room.phase !== 'SPINNING') return;

  const category = room.currentCategory;
  if (!category) return;

  // Clear spinner state
  room.currentSpinnerId = null;
  room.currentSpinnerName = null;
  room.pendingSpinResult = null;

  if (isPartyCategory(category)) {
    room.phase = 'DRINKING_SEGMENT';
    if (category === 'everybody-drinks') {
      io.to(roomCode).emit(SOCKET_EVENTS.PARTY_EVERYBODY_DRINKS, {});
    } else if (category === 'rock-off') {
      io.to(roomCode).emit(SOCKET_EVENTS.PARTY_ROCK_OFF, {});
      room.roundGuesses = [];
      const track = getNextTrack(room);
      if (track) {
        room.currentTrack = track;
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_ROUND_START, {
          previewUrl: track.previewUrl,
          category: 'rock-off',
        });
      }
    }
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'DRINKING_SEGMENT');
    syncRoom(io, room);
  } else {
    // Guess category — start the round
    const track = engine.startRound();
    if (!track) {
      room.phase = 'GAME_OVER';
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'GAME_OVER');
      syncRoom(io, room);
      return;
    }

    // Apply half-timer surprise modifier
    if (room.surpriseModifiers.halfTimer) {
      room.timerSeconds = Math.ceil(room.timerSeconds / 2);
      room.surpriseModifiers.halfTimer = false;
    }

    io.to(roomCode).emit(SOCKET_EVENTS.GAME_ROUND_START, {
      previewUrl: track.previewUrl,
      trackId: track.id,
      category,
    });
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'PLAYING');
    syncRoom(io, room);
    startRoundTimer(io, roomCode, (rc) => handleTimerEnd(io, rc));
  }
}

function getEngine(roomCode: string) {
  const room = getRoom(roomCode);
  if (!room) return null;
  if (!engines.has(roomCode)) {
    engines.set(roomCode, createGameEngine(room));
  }
  return engines.get(roomCode)!;
}

function serializeRoom(room: RoomState) {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      ...p,
      bingoCard: p.bingoCard,
    })),
    phase: room.phase,
    settings: room.settings,
    currentCategory: room.currentCategory,
    roundNumber: room.roundNumber,
    roundGuesses: room.roundGuesses,
    timerSeconds: room.timerSeconds,
    winner: room.winner,
    currentSpinnerId: room.currentSpinnerId,
    currentSpinnerName: room.currentSpinnerName,
    surpriseModifiers: room.surpriseModifiers,
    // Don't send currentTrack details to players during PLAYING (they shouldn't see the answer)
    // trailerVideoId is safe to include — it's an opaque YouTube ID, not a spoiler
    currentTrack: room.phase === 'ROUND_RESULTS' || room.phase === 'GAME_OVER'
      ? room.currentTrack
      : room.currentTrack
        ? {
            id: room.currentTrack.id,
            previewUrl: room.currentTrack.previewUrl,
            mediaType: room.currentTrack.mediaType,
            albumArt: '',
            ...(isMovieTrack(room.currentTrack) && room.currentTrack.trailerVideoId
              ? { trailerVideoId: room.currentTrack.trailerVideoId }
              : {}),
          }
        : null,
  };
}

function syncRoom(io: Server, room: RoomState) {
  io.to(room.roomCode).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
}

function cleanupRoom(roomCode: string) {
  clearRoomTimer(roomCode);
  clearSurpriseTimer(roomCode);
  clearPendingBingoPicks(roomCode);
  engines.delete(roomCode);
  deleteRoom(roomCode);
}

function emitMilestone(io: Server, playerId: string, type: string) {
  const ps = io.sockets.sockets.get(playerId);
  if (ps) ps.emit(SOCKET_EVENTS.MILESTONE_EARNED, { type });
}

function checkMilestoneThresholds(io: Server, player: Player, prevScore: number) {
  const ms = player.milestones;
  const score = player.score;
  if (!ms.shield250Earned && score >= 250 && prevScore < 250) {
    ms.shield250Earned = true;
    ms.shield250Active = true;
    emitMilestone(io, player.id, 'shield250');
  }
  if (!ms.drinks500Earned && score >= 500 && prevScore < 500) {
    ms.drinks500Earned = true;
    emitMilestone(io, player.id, 'drinks500');
  }
  if (!ms.swap750Earned && score >= 750 && prevScore < 750) {
    ms.swap750Earned = true;
    emitMilestone(io, player.id, 'swap750');
  }
  if (!ms.block1000Earned && score >= 1000 && prevScore < 1000) {
    ms.block1000Earned = true;
    emitMilestone(io, player.id, 'block1000');
  }
  if (!ms.doublePts1500Earned && score >= 1500 && prevScore < 1500) {
    ms.doublePts1500Earned = true;
    ms.doublePts1500Active = true;
    emitMilestone(io, player.id, 'doublePts1500');
  }
  if (!ms.steal2000Earned && score >= 2000 && prevScore < 2000) {
    ms.steal2000Earned = true;
    emitMilestone(io, player.id, 'steal2000');
  }
}

function applyDrinkPenalty(io: Server, player: Player, room: RoomState, amount: number) {
  // Shield blocks the entire penalty
  if (player.milestones.shield250Active) {
    player.milestones.shield250Active = false;
    const ps = io.sockets.sockets.get(player.id);
    if (ps) ps.emit(SOCKET_EVENTS.MILESTONE_SHIELD_CONSUMED);
    return;
  }
  player.drinks += amount;
}

function handleTimerEnd(io: Server, roomCode: string) {
  const engine = getEngine(roomCode);
  if (!engine) return;
  const room = getRoom(roomCode);
  if (!room) return;

  // Guard: only process if still in PLAYING phase (prevents double-processing)
  if (room.phase !== 'PLAYING') return;

  engine.endRound();

  // Track which players guessed correctly this round (for streak tracking)
  const correctPlayerIds = new Set<string>();

  // Mark bingo cards, update scores, and track drinks
  for (const guess of room.roundGuesses) {
    const player = room.players.find((p) => p.id === guess.playerId);
    if (!player) continue;

    if (guess.correct) {
      correctPlayerIds.add(player.id);

      // Accuracy-based scoring: similarity * 100, rounded
      const basePoints = Math.round((guess.similarity ?? 0) * 100);
      let pointsAwarded = basePoints;

      // Double points from doublePts1500 (per-player)
      if (player.milestones.doublePts1500Active) {
        pointsAwarded *= 2;
        player.milestones.doublePts1500Active = false;
        const ps = io.sockets.sockets.get(player.id);
        if (ps) ps.emit(SOCKET_EVENTS.MILESTONE_DOUBLE_CONSUMED);
      }

      // Double points from surprise event (room-wide)
      if (room.surpriseModifiers.doublePoints) {
        pointsAwarded *= 2;
      }

      player.score += pointsAwarded;
      guess.pointsAwarded = pointsAwarded;

      const prevScore = player.score - pointsAwarded;

      // Mark bingo card cell(s) — only if base accuracy >= 50%
      // Low-accuracy guesses still earn points but don't advance the bingo card
      if (room.currentCategory && basePoints >= 50) {
        // Collect eligible primary category cells for player choice
        const eligibleIndices = player.bingoCard
          .map((cell, i) => ({ cell, i }))
          .filter(({ cell }) => cell.category === room.currentCategory && !cell.marked)
          .map(({ i }) => i);

        // Store eligible indices on the guess for post-round pick event
        (guess as any)._eligibleIndices = eligibleIndices;

        // Auto-mark bonus category cells (e.g. exact year → also marks year-approx)
        if (guess.bonusCategories) {
          for (const bonusCat of guess.bonusCategories) {
            const bonusIndex = player.bingoCard.findIndex(
              (cell) => cell.category === bonusCat && !cell.marked
            );
            if (bonusIndex !== -1) {
              player.bingoCard[bonusIndex].marked = true;
            }
          }
        }

        // If only 0 or 1 eligible cell, auto-mark immediately (no choice needed)
        if (eligibleIndices.length <= 1) {
          if (eligibleIndices.length === 1) {
            player.bingoCard[eligibleIndices[0]].marked = true;
          }

          // Recalculate completed rows after all markings
          const prevRows = player.completedRows;
          player.completedRows = countCompletedLines(player.bingoCard);

          // Bonus points for completing a row
          if (player.completedRows > prevRows) {
            player.score += 250 * (player.completedRows - prevRows);
            if (room.settings.drinkOnRowComplete) {
              player.drinks += (player.completedRows - prevRows);
            }
          }
          // Clear eligibleIndices so we don't send a pick event
          (guess as any)._eligibleIndices = [];
        }
        // If 2+ eligible cells, defer marking — player will pick
      }

      // Check milestone thresholds
      checkMilestoneThresholds(io, player, prevScore);
    } else {
      guess.pointsAwarded = 0;
      // Wrong answer — drink penalty (hot seat doubles it)
      if (room.settings.drinkOnWrongGuess) {
        const isHotSeat = room.surpriseModifiers.hotSeatPlayerId === player.id;
        applyDrinkPenalty(io, player, room, isHotSeat ? 2 : 1);
      }
    }
  }

  // Compute once: which players submitted a guess this round
  const guessedPlayerIds = new Set(room.roundGuesses.map((g) => g.playerId));

  // Players who didn't guess also drink (they got it wrong by omission)
  if (room.settings.drinkOnWrongGuess) {
    for (const player of room.players) {
      if (player.connected && !guessedPlayerIds.has(player.id)) {
        const isHotSeat = room.surpriseModifiers.hotSeatPlayerId === player.id;
        applyDrinkPenalty(io, player, room, isHotSeat ? 2 : 1);
      }
    }
  }

  // Clear round-scoped surprise modifiers
  room.surpriseModifiers.doublePoints = false;
  room.surpriseModifiers.hotSeatPlayerId = null;

  // Streak tracking
  for (const player of room.players) {
    if (!player.connected) continue;
    if (correctPlayerIds.has(player.id)) {
      player.streak += 1;
      if (player.streak === 3) {
        emitMilestone(io, player.id, 'streak3FreeMark');
      }
      if (player.streak === 5) {
        // All other players drink
        for (const other of room.players) {
          if (other.id !== player.id && other.connected) {
            other.drinks += 1;
          }
        }
        // Broadcast to room
        io.to(roomCode).emit(SOCKET_EVENTS.MILESTONE_EARNED, {
          type: 'streak5AllDrink',
          playerName: player.name,
        });
        player.streak = 0;
      }
    } else {
      player.streak = 0;
    }
  }

  io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'ROUND_RESULTS');
  io.to(roomCode).emit(SOCKET_EVENTS.ROUND_RESULTS, {
    guesses: room.roundGuesses,
    track: room.currentTrack,
  });

  // Reveal individual results + card updates to each player
  for (const guess of room.roundGuesses) {
    const playerSocket = io.sockets.sockets.get(guess.playerId);
    if (playerSocket) {
      playerSocket.emit(SOCKET_EVENTS.GUESS_RESULT, {
        correct: guess.correct,
        shouldDrink: !guess.correct && room.settings.drinkOnWrongGuess,
        pointsAwarded: guess.pointsAwarded,
        bonusCategories: guess.bonusCategories,
      });
      if (guess.correct) {
        const player = room.players.find((p) => p.id === guess.playerId);
        if (player) {
          const eligibleIndices: number[] = (guess as any)._eligibleIndices ?? [];

          if (eligibleIndices.length >= 2) {
            // Player must choose which cell to mark
            playerSocket.emit(SOCKET_EVENTS.BINGO_PICK_AVAILABLE, {
              eligibleIndices,
              category: room.currentCategory,
            });

            // Set up pending pick with auto-pick timeout
            if (!pendingBingoPicks.has(roomCode)) {
              pendingBingoPicks.set(roomCode, new Map());
            }
            const roomPicks = pendingBingoPicks.get(roomCode)!;
            const timeout = setTimeout(() => {
              autoPickBingoCell(io, roomCode, guess.playerId);
            }, BINGO_PICK_TIMEOUT_MS);
            roomPicks.set(guess.playerId, { eligibleIndices, timeout });
          } else {
            // Already auto-marked or no eligible cells — send card update directly
            playerSocket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
          }
        }
      }
    }
  }

  // Clean up _eligibleIndices from guesses
  for (const guess of room.roundGuesses) {
    delete (guess as any)._eligibleIndices;
  }

  // Notify players who didn't guess that they should drink
  if (room.settings.drinkOnWrongGuess) {
    for (const player of room.players) {
      if (player.connected && !guessedPlayerIds.has(player.id)) {
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
          playerSocket.emit(SOCKET_EVENTS.GUESS_RESULT, {
            correct: false,
            shouldDrink: true,
            noGuess: true,
          });
        }
      }
    }
  }

  // Check for winner
  const winner = engine.checkForWinner();
  if (winner) {
    clearSurpriseTimer(roomCode);
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_WINNER, winner);
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'GAME_OVER');
  }

  syncRoom(io, room);
}

export function startRoomCleanupInterval() {
  setInterval(() => {
    const cleaned = cleanupAbandonedRooms();
    for (const code of cleaned) {
      clearRoomTimer(code);
      clearSurpriseTimer(code);
      engines.delete(code);
      clearSpinnerTimeout(code);
    }
    if (cleaned.length > 0) {
      console.log(`[Cleanup] Removed ${cleaned.length} abandoned room(s): ${cleaned.join(', ')}`);
    }
  }, 5 * 60 * 1000); // every 5 minutes
}

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;

    // Per-socket rate limiting: token bucket, 20 events/sec
    let tokenBucket = 20;
    let lastRefill = Date.now();
    socket.use(([event], next) => {
      const now = Date.now();
      const elapsed = (now - lastRefill) / 1000;
      tokenBucket = Math.min(20, tokenBucket + elapsed * 20);
      lastRefill = now;
      if (tokenBucket < 1) {
        return next(new Error('Rate limit exceeded'));
      }
      tokenBucket--;
      next();
    });

    // HOST: Create Room
    socket.on(SOCKET_EVENTS.HOST_CREATE_ROOM, (callback: (data: { roomCode: string; hostId: string }) => void) => {
      const room = createRoom(socket.id);
      currentRoom = room.roomCode;
      socket.join(room.roomCode);
      engines.set(room.roomCode, createGameEngine(room));
      callback({ roomCode: room.roomCode, hostId: socket.id });
    });

    // PLAYER: Join Room
    socket.on(SOCKET_EVENTS.PLAYER_JOIN_ROOM, (data: { roomCode: string; playerName: string }, callback: (result: { success: boolean; error?: string; player?: any }) => void) => {
      const roomCode = data.roomCode?.trim().toUpperCase();
      const playerName = data.playerName?.trim().slice(0, 20);

      if (!roomCode || !ROOM_CODE_RE.test(roomCode)) {
        callback({ success: false, error: 'Invalid room code' });
        return;
      }
      if (!playerName) {
        callback({ success: false, error: 'Player name is required' });
        return;
      }

      const room = getRoom(roomCode);
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      if (room.phase !== 'LOBBY') {
        // Allow reconnection
        const existing = room.players.find((p) => p.name === playerName);
        if (!existing) {
          callback({ success: false, error: 'Game already in progress' });
          return;
        }
      }

      const player = addPlayer(roomCode, socket.id, playerName);
      if (!player) {
        callback({ success: false, error: 'Room is full (max 8 players)' });
        return;
      }

      currentRoom = roomCode;
      socket.join(roomCode);
      touchRoom(roomCode);
      callback({ success: true, player });

      // Notify everyone
      io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_JOINED, {
        players: room.players,
        playerName: player.name,
      });

      // If reconnecting during SPINNING phase with no active spinner, re-select one
      if (room.phase === 'SPINNING' && !room.currentSpinnerId) {
        selectSpinnerForRoom(io, room);
      }

      syncRoom(io, room);
    });

    // SPECTATOR: Join as spectator (watch-only, not added to players)
    socket.on(SOCKET_EVENTS.SPECTATOR_JOIN, (data: { roomCode: string }, callback?: (result: { success: boolean; error?: string }) => void) => {
      const roomCode = data.roomCode?.trim().toUpperCase();

      if (!roomCode || !ROOM_CODE_RE.test(roomCode)) {
        callback?.({ success: false, error: 'Invalid room code' });
        return;
      }

      const room = getRoom(roomCode);
      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      currentRoom = roomCode;
      socket.join(roomCode);
      touchRoom(roomCode);
      callback?.({ success: true });

      // Send current game state to the spectator
      socket.emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
    });

    // REQUEST: Sync (client requests full state after mounting listeners)
    socket.on(SOCKET_EVENTS.REQUEST_SYNC, () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;
      socket.emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
    });

    // HOST: Update Settings
    socket.on(SOCKET_EVENTS.HOST_UPDATE_SETTINGS, (settings: Partial<LobbySettings>) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      Object.assign(room.settings, settings);
      io.to(currentRoom).emit(SOCKET_EVENTS.SETTINGS_UPDATED, room.settings);
    });

    // HOST: Kick Player
    socket.on(SOCKET_EVENTS.HOST_KICK_PLAYER, (data: { playerId: string }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.phase !== 'LOBBY') return; // Only allow kicks in lobby

      const targetId = data.playerId;
      if (targetId === socket.id) return; // Can't kick yourself

      // Notify the kicked player before removing them
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit(SOCKET_EVENTS.PLAYER_KICKED);
        targetSocket.leave(currentRoom);
      }

      kickPlayer(currentRoom, targetId);

      io.to(currentRoom).emit(SOCKET_EVENTS.PLAYER_LEFT, {
        players: room.players,
        playerId: targetId,
      });
      syncRoom(io, room);
    });

    // HOST: Start Game
    socket.on(SOCKET_EVENTS.HOST_START_GAME, (data: { tracks: Track[] }) => {
      if (!currentRoom) return;
      const engine = getEngine(currentRoom);
      if (!engine) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      // Regenerate bingo cards for all players based on current contentMode
      // (host may have changed mode after players joined the lobby)
      for (const player of room.players) {
        player.bingoCard = generateBingoCard(room.settings.contentMode);
        // Send card directly to player's socket (bypasses GAME_STATE_SYNC lookup timing)
        io.to(player.id).emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
      }

      engine.startGame(data.tracks);
      touchRoom(currentRoom);
      scheduleSurpriseEvent(io, currentRoom);
      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'SPINNING');
      selectSpinnerForRoom(io, room);
      syncRoom(io, room);
    });

    // HOST: Spin Wheel (fallback — only when no player spinner is active)
    socket.on(SOCKET_EVENTS.HOST_SPIN_WHEEL, () => {
      if (!currentRoom) return;
      const engine = getEngine(currentRoom);
      if (!engine) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      // Only allow host spin when no player spinner is active (timeout fallback)
      if (room.currentSpinnerId) return;

      touchRoom(currentRoom);
      clearSpinnerTimeout(currentRoom);

      // Use pending result if available (from selectSpinnerForRoom), otherwise spin fresh
      const result = room.pendingSpinResult ?? engine.doSpin();
      room.pendingSpinResult = result;

      socket.emit(SOCKET_EVENTS.GAME_WHEEL_RESULT, {
        category: result.category,
        segmentIndex: result.segmentIndex,
        mediaType: result.mediaType,
      });
    });

    // HOST: Wheel animation done — transition to the appropriate phase
    socket.on(SOCKET_EVENTS.HOST_WHEEL_DONE, () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      touchRoom(currentRoom);
      handleWheelAnimationComplete(io, currentRoom);
    });

    // PLAYER: Spin Wheel (selected spinner swipes)
    socket.on(SOCKET_EVENTS.PLAYER_SPIN_WHEEL, (data: { velocity: number }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      // Only the selected spinner can spin
      if (room.currentSpinnerId !== socket.id) return;
      if (!room.pendingSpinResult) return;

      touchRoom(currentRoom);
      clearSpinnerTimeout(currentRoom);

      const swipeVelocity = Math.max(0.3, Math.min(3.0, data.velocity ?? 1.0));

      // Send wheel result to BOTH host and spinner
      const resultPayload = {
        category: room.pendingSpinResult.category,
        segmentIndex: room.pendingSpinResult.segmentIndex,
        mediaType: room.pendingSpinResult.mediaType,
        swipeVelocity,
      };

      // Send to host
      const hostSocket = io.sockets.sockets.get(room.hostId);
      if (hostSocket) {
        hostSocket.emit(SOCKET_EVENTS.GAME_WHEEL_RESULT, resultPayload);
      }
      // Send to spinner
      socket.emit(SOCKET_EVENTS.GAME_WHEEL_RESULT, resultPayload);
    });

    // PLAYER: Submit Guess
    socket.on(SOCKET_EVENTS.PLAYER_SUBMIT_GUESS, (data: { guess: string }, callback?: (result: any) => void) => {
      if (!currentRoom) return;
      const engine = getEngine(currentRoom);
      if (!engine) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const guess = data.guess?.trim().slice(0, 200);
      if (!guess) {
        callback?.({ success: false, error: 'Guess is required' });
        return;
      }

      touchRoom(currentRoom);

      // Rock Off: handle artist guesses during DRINKING_SEGMENT
      if (room.phase === 'DRINKING_SEGMENT' && room.currentCategory === 'rock-off') {
        // Prevent duplicate submissions
        if (room.roundGuesses.some((g) => g.playerId === socket.id)) {
          callback?.({ success: false, error: 'Already submitted' });
          return;
        }
        const player = room.players.find((p) => p.id === socket.id);
        if (!player || !room.currentTrack) return;

        // Rock Off: for music, guess the artist; for movies, guess the movie title
        const rockOffCategory = room.currentTrack.mediaType === 'movie' ? 'movie-title' : 'artist';
        const { correct, similarity } = checkAnswer(rockOffCategory, guess, room.currentTrack);
        const result: GuessResult = {
          playerId: socket.id,
          playerName: player.name,
          guess,
          correct,
          similarity,
        };
        room.roundGuesses.push(result);
        callback?.({ success: true });

        // Tell the winner they can assign a drink
        if (correct && !room.roundGuesses.some((g) => g.correct && g.playerId !== socket.id)) {
          socket.emit(SOCKET_EVENTS.GUESS_RESULT, { correct: true, rockOffWin: true });
        }

        syncRoom(io, room);
        return;
      }

      // Capture completed rows BEFORE submitting (submitGuess updates completedRows)
      const player = room.players.find((p) => p.id === socket.id);
      const prevRows = player?.completedRows ?? 0;

      const result = engine.submitGuess(socket.id, guess);
      if (!result) {
        callback?.({ success: false, error: 'Could not submit guess' });
        return;
      }

      // Don't reveal correct/wrong yet — just confirm submission.
      // Results are revealed to all players when the round ends.
      callback?.({ success: true });

      // Notify host of all guesses (host sees guess count, not answers)
      syncRoom(io, room);
    });

    // HOST: Next Round
    socket.on(SOCKET_EVENTS.HOST_NEXT_ROUND, () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      touchRoom(currentRoom);

      // If still PLAYING, "Reveal Answer" was clicked — end the round properly first
      if (room.phase === 'PLAYING') {
        clearRoomTimer(currentRoom);
        handleTimerEnd(io, currentRoom);
        // handleTimerEnd transitions to ROUND_RESULTS and processes scoring/drinks
        return;
      }

      // Check for winner first
      const engine = getEngine(currentRoom);
      if (engine) {
        const winner = engine.checkForWinner();
        if (winner) {
          room.phase = 'GAME_OVER';
          io.to(currentRoom).emit(SOCKET_EVENTS.GAME_WINNER, winner);
          io.to(currentRoom).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'GAME_OVER');
          syncRoom(io, room);
          return;
        }
      }

      room.phase = 'SPINNING';
      room.roundGuesses = [];
      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'SPINNING');
      selectSpinnerForRoom(io, room);
      syncRoom(io, room);
    });

    // MILESTONE: Use Drinks (assign a drink to another player)
    socket.on(SOCKET_EVENTS.MILESTONE_USE_DRINKS, (data: { targetPlayerId: string }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      // Validate milestone availability
      if (!player.milestones.drinks500Earned || player.milestones.drinks500Used) return;

      const target = room.players.find((p) => p.id === data.targetPlayerId);
      if (!target || target.id === player.id) return;

      player.milestones.drinks500Used = true;
      target.drinks += 1;

      // Notify target
      const targetSocket = io.sockets.sockets.get(target.id);
      if (targetSocket) {
        targetSocket.emit(SOCKET_EVENTS.MILESTONE_DRINKS_RECEIVED, {
          fromPlayer: player.name,
        });
      }
      syncRoom(io, room);
    });

    // ROCK OFF: Winner assigns a drink to another player
    socket.on(SOCKET_EVENTS.ROCK_OFF_ASSIGN_DRINK, (data: { targetPlayerId: string }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      // Must be in rock-off drinking segment
      if (room.phase !== 'DRINKING_SEGMENT' || room.currentCategory !== 'rock-off') return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      // Sender must be the first correct guesser (the winner)
      const winner = room.roundGuesses.find((g) => g.correct);
      if (!winner || winner.playerId !== socket.id) return;

      const target = room.players.find((p) => p.id === data.targetPlayerId);
      if (!target || target.id === player.id) return;

      target.drinks += 1;

      // Notify target
      const targetSocket = io.sockets.sockets.get(target.id);
      if (targetSocket) {
        targetSocket.emit(SOCKET_EVENTS.MILESTONE_DRINKS_RECEIVED, {
          fromPlayer: player.name,
        });
      }
      syncRoom(io, room);
    });

    // MILESTONE: Use Block (unmark a cell on another player's bingo card)
    socket.on(SOCKET_EVENTS.MILESTONE_USE_BLOCK, (data: { targetPlayerId: string; cellIndex: number }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      // Validate milestone availability
      if (!player.milestones.block1000Earned || player.milestones.block1000Used) return;

      const target = room.players.find((p) => p.id === data.targetPlayerId);
      if (!target || target.id === player.id) return;

      const cellIndex = data.cellIndex;
      if (cellIndex < 0 || cellIndex >= 9) return;
      if (!target.bingoCard[cellIndex]?.marked) return;

      player.milestones.block1000Used = true;
      target.bingoCard[cellIndex].marked = false;
      target.completedRows = countCompletedLines(target.bingoCard);

      // Notify target
      const targetSocket = io.sockets.sockets.get(target.id);
      if (targetSocket) {
        targetSocket.emit(SOCKET_EVENTS.MILESTONE_BLOCK_RECEIVED, {
          fromPlayer: player.name,
          cellIndex,
        });
        targetSocket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: target.bingoCard });
      }
      syncRoom(io, room);
    });

    // MILESTONE: Use Swap (swap a bingo cell with opponent)
    socket.on(SOCKET_EVENTS.MILESTONE_USE_SWAP, (data: { targetPlayerId: string }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      if (!player.milestones.swap750Earned || player.milestones.swap750Used) return;

      const target = room.players.find((p) => p.id === data.targetPlayerId);
      if (!target || target.id === player.id) return;

      // Pick random marked cell from target
      const targetMarked = target.bingoCard
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c.marked);
      if (targetMarked.length === 0) return;

      // Pick random unmarked cell from self
      const selfUnmarked = player.bingoCard
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => !c.marked);
      if (selfUnmarked.length === 0) return;

      const targetPick = targetMarked[Math.floor(Math.random() * targetMarked.length)];
      const selfPick = selfUnmarked[Math.floor(Math.random() * selfUnmarked.length)];

      // Swap: unmark target cell, mark own cell
      target.bingoCard[targetPick.i].marked = false;
      player.bingoCard[selfPick.i].marked = true;

      target.completedRows = countCompletedLines(target.bingoCard);
      player.completedRows = countCompletedLines(player.bingoCard);
      player.milestones.swap750Used = true;

      // Notify both
      socket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
      const targetSocket = io.sockets.sockets.get(target.id);
      if (targetSocket) {
        targetSocket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: target.bingoCard });
        targetSocket.emit(SOCKET_EVENTS.MILESTONE_SWAP_RECEIVED, { fromPlayer: player.name });
      }
      syncRoom(io, room);
    });

    // MILESTONE: Use Steal (steal 200 points from opponent)
    socket.on(SOCKET_EVENTS.MILESTONE_USE_STEAL, (data: { targetPlayerId: string }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      if (!player.milestones.steal2000Earned || player.milestones.steal2000Used) return;

      const target = room.players.find((p) => p.id === data.targetPlayerId);
      if (!target || target.id === player.id) return;

      const stolen = Math.min(200, target.score);
      target.score -= stolen;
      player.score += stolen;
      player.milestones.steal2000Used = true;

      const targetSocket = io.sockets.sockets.get(target.id);
      if (targetSocket) {
        targetSocket.emit(SOCKET_EVENTS.MILESTONE_STEAL_RECEIVED, {
          fromPlayer: player.name,
          amount: stolen,
        });
      }
      syncRoom(io, room);
    });

    // MILESTONE: Use Free Mark (streak reward — mark unmarked cell on own card)
    socket.on(SOCKET_EVENTS.MILESTONE_USE_FREE_MARK, (data: { cellIndex: number }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      const cellIndex = data.cellIndex;
      if (cellIndex < 0 || cellIndex >= 9) return;
      if (player.bingoCard[cellIndex]?.marked) return;

      player.bingoCard[cellIndex].marked = true;
      player.completedRows = countCompletedLines(player.bingoCard);

      socket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
      syncRoom(io, room);
    });

    // BINGO: Player picks which cell to mark
    socket.on(SOCKET_EVENTS.BINGO_CELL_PICK, (data: { cellIndex: number }) => {
      if (!currentRoom) return;
      const roomPicks = pendingBingoPicks.get(currentRoom);
      if (!roomPicks) return;
      const pick = roomPicks.get(socket.id);
      if (!pick) return;

      const room = getRoom(currentRoom);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      const cellIndex = data.cellIndex;
      // Validate: must be in eligible indices
      if (!pick.eligibleIndices.includes(cellIndex)) return;
      if (player.bingoCard[cellIndex]?.marked) return;

      // Clear the timeout
      clearTimeout(pick.timeout);
      roomPicks.delete(socket.id);
      if (roomPicks.size === 0) pendingBingoPicks.delete(currentRoom);

      // Mark the chosen cell
      player.bingoCard[cellIndex].marked = true;

      // Recalculate completed rows and award row bonuses
      const prevRows = player.completedRows;
      player.completedRows = countCompletedLines(player.bingoCard);
      if (player.completedRows > prevRows) {
        player.score += 250 * (player.completedRows - prevRows);
        if (room.settings.drinkOnRowComplete) {
          player.drinks += (player.completedRows - prevRows);
        }
      }

      socket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
      syncRoom(io, room);
    });

    // PLAYER: Buzz In (for Rock Off)
    socket.on(SOCKET_EVENTS.PLAYER_BUZZ_IN, (data: { guess: string }) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      if (!player) return;

      io.to(currentRoom).emit(SOCKET_EVENTS.PARTY_BUZZ_RESULT, {
        playerName: player.name,
        guess: data.guess?.trim().slice(0, 200) || '',
      });
    });

    // HOST: End Session (notify players before closing room)
    socket.on(SOCKET_EVENTS.HOST_END_SESSION, () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      // Notify all players that room is closing
      io.to(currentRoom).emit(SOCKET_EVENTS.ROOM_CLOSED);

      // Clean up
      clearPendingBingoPicks(currentRoom);
      clearSpinnerTimeout(currentRoom);
      cleanupRoom(currentRoom);
      currentRoom = null;
    });

    // HOST: Play Again (return to lobby from GAME_OVER)
    socket.on(SOCKET_EVENTS.HOST_PLAY_AGAIN, () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;
      if (room.phase !== 'GAME_OVER') return;

      // Clear timers and engines
      clearRoomTimer(currentRoom);
      clearSpinnerTimeout(currentRoom);
      clearSurpriseTimer(currentRoom);
      clearPendingBingoPicks(currentRoom);
      engines.delete(currentRoom);

      const resetRoom = resetRoomToLobby(currentRoom);
      if (!resetRoom) return;

      // Send regenerated bingo cards directly to each player
      for (const player of resetRoom.players) {
        io.to(player.id).emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
      }

      // Recreate engine for new game
      engines.set(currentRoom, createGameEngine(resetRoom));

      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'LOBBY');
      syncRoom(io, resetRoom);
    });

    // HOST: Rejoin Room (reconnect after socket drop)
    socket.on(SOCKET_EVENTS.HOST_REJOIN_ROOM, (data: { roomCode: string }, callback?: (result: { success: boolean; error?: string }) => void) => {
      const roomCode = data.roomCode?.trim().toUpperCase();
      if (!roomCode) {
        callback?.({ success: false, error: 'Room code required' });
        return;
      }
      const room = getRoom(roomCode);
      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      room.hostId = socket.id;
      currentRoom = roomCode;
      socket.join(roomCode);
      touchRoom(roomCode);
      callback?.({ success: true });
      syncRoom(io, room);
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (!currentRoom) return;

      const room = getRoom(currentRoom);
      const isHost = room?.hostId === socket.id;

      // If this player was the spinner, clear spinner state
      if (room && room.currentSpinnerId === socket.id) {
        room.currentSpinnerId = null;
        room.currentSpinnerName = null;
        clearSpinnerTimeout(currentRoom);
      }

      removePlayer(currentRoom, socket.id);

      if (room) {
        const anyConnected = room.players.some((p) => p.connected);

        // If host disconnects and no players remain, clean up the room entirely
        if (isHost && !anyConnected) {
          io.to(currentRoom).emit(SOCKET_EVENTS.ROOM_CLOSED);
          clearPendingBingoPicks(currentRoom);
          clearSpinnerTimeout(currentRoom);
          clearSurpriseTimer(currentRoom);
          cleanupRoom(currentRoom);
          return;
        }

        io.to(currentRoom).emit(SOCKET_EVENTS.PLAYER_LEFT, {
          players: room.players,
          playerId: socket.id,
        });
        syncRoom(io, room);
      }
    });
  });
}
