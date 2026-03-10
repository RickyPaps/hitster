import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from './events';
import { createRoom, getRoom, addPlayer, removePlayer, kickPlayer, deleteRoom, getNextTrack } from '../game/room';
import { countCompletedLines } from '../game/bingo';
import { createGameEngine } from '../game/engine';
import { clearRoomTimer, startRoundTimer } from '../game/timer';
import { checkAnswer } from '../game/matching';
import type { LobbySettings, Track, RoomState, GuessResult } from '@/types/game';
import { isGuessCategory, isPartyCategory } from '../game/wheel';

const ROOM_CODE_RE = /^[A-Z2-9]{4}$/;
const SPINNER_TIMEOUT_MS = 15_000;

const engines = new Map<string, ReturnType<typeof createGameEngine>>();
const spinnerTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

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
    if (category === 'hot-take') {
      room.partyTarget = engine.getRandomPlayer()?.name ?? null;
      io.to(roomCode).emit(SOCKET_EVENTS.PARTY_HOT_TAKE, { playerName: room.partyTarget });
    } else if (category === 'everybody-drinks') {
      io.to(roomCode).emit(SOCKET_EVENTS.PARTY_EVERYBODY_DRINKS, {});
    } else if (category === 'rock-off') {
      io.to(roomCode).emit(SOCKET_EVENTS.PARTY_ROCK_OFF, {});
      room.roundGuesses = [];
      const track = getNextTrack(room);
      if (track) {
        room.currentTrack = track;
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_ROUND_START, {
          previewUrl: track.previewUrl,
          albumArt: track.albumArt,
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

    io.to(roomCode).emit(SOCKET_EVENTS.GAME_ROUND_START, {
      previewUrl: track.previewUrl,
      albumArt: track.albumArt,
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
    partyTarget: room.partyTarget,
    currentSpinnerId: room.currentSpinnerId,
    currentSpinnerName: room.currentSpinnerName,
    // Don't send currentTrack details to players during PLAYING (they shouldn't see the answer)
    currentTrack: room.phase === 'ROUND_RESULTS' || room.phase === 'GAME_OVER'
      ? room.currentTrack
      : room.currentTrack
        ? { id: room.currentTrack.id, previewUrl: room.currentTrack.previewUrl, albumArt: room.currentTrack.albumArt }
        : null,
  };
}

function syncRoom(io: Server, room: RoomState) {
  io.to(room.roomCode).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
}

function cleanupRoom(roomCode: string) {
  clearRoomTimer(roomCode);
  engines.delete(roomCode);
  deleteRoom(roomCode);
}

function handleTimerEnd(io: Server, roomCode: string) {
  const engine = getEngine(roomCode);
  if (!engine) return;
  const room = getRoom(roomCode);
  if (!room) return;

  // Guard: only process if still in PLAYING phase (prevents double-processing)
  if (room.phase !== 'PLAYING') return;

  engine.endRound();

  // Mark bingo cards, update scores, and track drinks
  for (const guess of room.roundGuesses) {
    const player = room.players.find((p) => p.id === guess.playerId);
    if (!player) continue;

    if (guess.correct) {
      // Award points for correct answer
      player.score += 100;

      // Mark bingo card cell
      if (room.currentCategory) {
        const cellIndex = player.bingoCard.findIndex(
          (cell) => cell.category === room.currentCategory && !cell.marked
        );
        if (cellIndex !== -1) {
          player.bingoCard[cellIndex].marked = true;
          const prevRows = player.completedRows;
          player.completedRows = countCompletedLines(player.bingoCard);

          // Bonus points for completing a row
          if (player.completedRows > prevRows) {
            player.score += 250 * (player.completedRows - prevRows);
            // Drink on row complete (celebration drink)
            if (room.settings.drinkOnRowComplete) {
              player.drinks += (player.completedRows - prevRows);
            }
          }
        }
      }
    } else {
      // Wrong answer — drink penalty
      if (room.settings.drinkOnWrongGuess) {
        player.drinks += 1;
      }
    }
  }

  // Players who didn't guess also drink (they got it wrong by omission)
  if (room.settings.drinkOnWrongGuess) {
    const guessedPlayerIds = new Set(room.roundGuesses.map((g) => g.playerId));
    for (const player of room.players) {
      if (player.connected && !guessedPlayerIds.has(player.id)) {
        player.drinks += 1;
      }
    }
  }

  io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'ROUND_RESULTS');
  io.to(roomCode).emit(SOCKET_EVENTS.ROUND_RESULTS, {
    guesses: room.roundGuesses,
    track: room.currentTrack,
  });

  // Reveal individual results + card updates to each player
  const guessedPlayerIds = new Set(room.roundGuesses.map((g) => g.playerId));
  for (const guess of room.roundGuesses) {
    const playerSocket = io.sockets.sockets.get(guess.playerId);
    if (playerSocket) {
      playerSocket.emit(SOCKET_EVENTS.GUESS_RESULT, {
        correct: guess.correct,
        shouldDrink: !guess.correct && room.settings.drinkOnWrongGuess,
      });
      if (guess.correct) {
        const player = room.players.find((p) => p.id === guess.playerId);
        if (player) {
          playerSocket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
        }
      }
    }
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
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_WINNER, winner);
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'GAME_OVER');
  }

  syncRoom(io, room);
}

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;

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
        callback({ success: false, error: 'Failed to join room' });
        return;
      }

      currentRoom = roomCode;
      socket.join(roomCode);
      callback({ success: true, player });

      // Notify everyone
      io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_JOINED, {
        players: room.players,
        playerName: player.name,
      });
      syncRoom(io, room);
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

      engine.startGame(data.tracks);
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

      clearSpinnerTimeout(currentRoom);

      // Use pending result if available (from selectSpinnerForRoom), otherwise spin fresh
      const result = room.pendingSpinResult ?? engine.doSpin();
      room.pendingSpinResult = result;

      socket.emit(SOCKET_EVENTS.GAME_WHEEL_RESULT, {
        category: result.category,
        segmentIndex: result.segmentIndex,
      });
    });

    // HOST: Wheel animation done — transition to the appropriate phase
    socket.on(SOCKET_EVENTS.HOST_WHEEL_DONE, () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;
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

      clearSpinnerTimeout(currentRoom);

      const swipeVelocity = Math.max(0.3, Math.min(3.0, data.velocity ?? 1.0));

      // Send wheel result to BOTH host and spinner
      const resultPayload = {
        category: room.pendingSpinResult.category,
        segmentIndex: room.pendingSpinResult.segmentIndex,
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

      // Rock Off: handle artist guesses during DRINKING_SEGMENT
      if (room.phase === 'DRINKING_SEGMENT' && room.currentCategory === 'rock-off') {
        // Prevent duplicate submissions
        if (room.roundGuesses.some((g) => g.playerId === socket.id)) {
          callback?.({ success: false, error: 'Already submitted' });
          return;
        }
        const player = room.players.find((p) => p.id === socket.id);
        if (!player || !room.currentTrack) return;

        const { correct, similarity } = checkAnswer('artist', guess, room.currentTrack);
        const result: GuessResult = {
          playerId: socket.id,
          playerName: player.name,
          guess,
          correct,
          similarity,
        };
        room.roundGuesses.push(result);
        callback?.({ success: true });
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
          clearSpinnerTimeout(currentRoom);
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
