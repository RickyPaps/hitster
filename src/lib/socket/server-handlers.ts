import type { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS } from './events';
import { createRoom, getRoom, addPlayer, removePlayer } from '../game/room';
import { createGameEngine } from '../game/engine';
import type { LobbySettings, Track, RoomState } from '@/types/game';
import { isGuessCategory, isPartyCategory } from '../game/wheel';

const engines = new Map<string, ReturnType<typeof createGameEngine>>();
const timers = new Map<string, ReturnType<typeof setInterval>>();

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
    // Don't send currentTrack details to players during PLAYING (they shouldn't see the answer)
    currentTrack: room.phase === 'ROUND_RESULTS' || room.phase === 'GAME_OVER'
      ? room.currentTrack
      : room.currentTrack
        ? { id: room.currentTrack.id, previewUrl: room.currentTrack.previewUrl, albumArt: room.currentTrack.albumArt }
        : null,
  };
}

function clearRoomTimer(roomCode: string) {
  const timer = timers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    timers.delete(roomCode);
  }
}

function startRoundTimer(io: Server, roomCode: string) {
  clearRoomTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room) return;

  const timer = setInterval(() => {
    room.timerSeconds--;
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_TIMER_TICK, room.timerSeconds);

    if (room.timerSeconds <= 0) {
      clearRoomTimer(roomCode);
      const engine = getEngine(roomCode);
      if (!engine) return;

      if (room.currentCategory === 'lyrics') {
        room.phase = 'JUDGING';
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'JUDGING');
        io.to(roomCode).emit(SOCKET_EVENTS.ROUND_RESULTS, {
          guesses: room.roundGuesses,
          track: room.currentTrack,
        });
      } else {
        engine.endRound();
        io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'ROUND_RESULTS');
        io.to(roomCode).emit(SOCKET_EVENTS.ROUND_RESULTS, {
          guesses: room.roundGuesses,
          track: room.currentTrack,
        });

        // Check for winner
        const winner = engine.checkForWinner();
        if (winner) {
          io.to(roomCode).emit(SOCKET_EVENTS.GAME_WINNER, winner);
          io.to(roomCode).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'GAME_OVER');
        }
      }

      // Sync state to all
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
    }
  }, 1000);

  timers.set(roomCode, timer);
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
      const { roomCode, playerName } = data;
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
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
    });

    // HOST: Update Settings
    socket.on(SOCKET_EVENTS.HOST_UPDATE_SETTINGS, (settings: Partial<LobbySettings>) => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      Object.assign(room.settings, settings);
      io.to(currentRoom).emit(SOCKET_EVENTS.SETTINGS_UPDATED, room.settings);
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
      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
    });

    // HOST: Spin Wheel
    socket.on(SOCKET_EVENTS.HOST_SPIN_WHEEL, () => {
      if (!currentRoom) return;
      const engine = getEngine(currentRoom);
      if (!engine) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      const { category, segmentIndex } = engine.doSpin();

      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_WHEEL_RESULT, {
        category,
        segmentIndex,
      });

      if (isPartyCategory(category)) {
        room.phase = 'DRINKING_SEGMENT';
        if (category === 'hot-take') {
          room.partyTarget = engine.getRandomPlayer();
          io.to(currentRoom).emit(SOCKET_EVENTS.PARTY_HOT_TAKE, { playerName: room.partyTarget });
        } else if (category === 'everybody-drinks') {
          io.to(currentRoom).emit(SOCKET_EVENTS.PARTY_EVERYBODY_DRINKS, {});
        } else if (category === 'rock-off') {
          io.to(currentRoom).emit(SOCKET_EVENTS.PARTY_ROCK_OFF, {});
          // Start a track for rock-off
          const track = engine.startRound();
          if (track) {
            io.to(currentRoom).emit(SOCKET_EVENTS.GAME_ROUND_START, {
              previewUrl: track.previewUrl,
              albumArt: track.albumArt,
              category: 'rock-off',
            });
          }
        }
        io.to(currentRoom).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'DRINKING_SEGMENT');
      } else {
        // Guess category - start the round after a delay (wheel animation)
        setTimeout(() => {
          const track = engine.startRound();
          if (!track) {
            // No more tracks
            room.phase = 'GAME_OVER';
            io.to(currentRoom!).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'GAME_OVER');
            io.to(currentRoom!).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
            return;
          }

          io.to(currentRoom!).emit(SOCKET_EVENTS.GAME_ROUND_START, {
            previewUrl: track.previewUrl,
            albumArt: track.albumArt,
            trackId: track.id,
            category,
          });
          io.to(currentRoom!).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'PLAYING');
          io.to(currentRoom!).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));

          startRoundTimer(io, currentRoom!);
        }, 4000); // Wait for wheel animation
      }

      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
    });

    // PLAYER: Submit Guess
    socket.on(SOCKET_EVENTS.PLAYER_SUBMIT_GUESS, (data: { guess: string }, callback?: (result: any) => void) => {
      if (!currentRoom) return;
      const engine = getEngine(currentRoom);
      if (!engine) return;
      const room = getRoom(currentRoom);
      if (!room) return;

      const result = engine.submitGuess(socket.id, data.guess);
      if (!result) {
        callback?.({ success: false, error: 'Could not submit guess' });
        return;
      }

      // Send result to the guessing player
      socket.emit(SOCKET_EVENTS.GUESS_RESULT, result);

      // Send card update if correct
      if (result.correct) {
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
          socket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });

          // Check if row was completed
          const prevRows = player.completedRows;
          if (player.completedRows > prevRows) {
            io.to(currentRoom).emit(SOCKET_EVENTS.ROW_COMPLETED, {
              playerName: player.name,
              completedRows: player.completedRows,
            });
          }
        }
      }

      // Notify host of all guesses
      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
      callback?.({ success: true, result });
    });

    // HOST: Approve/Deny Lyrics
    socket.on(SOCKET_EVENTS.HOST_APPROVE_LYRICS, (data: { playerId: string; approved: boolean }) => {
      if (!currentRoom) return;
      const engine = getEngine(currentRoom);
      if (!engine) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      const result = engine.approveLyrics(data.playerId, data.approved);
      if (result) {
        const targetSocket = io.sockets.sockets.get(data.playerId);
        if (targetSocket) {
          targetSocket.emit(SOCKET_EVENTS.GUESS_RESULT, result);
          if (result.correct) {
            const player = room.players.find((p) => p.id === data.playerId);
            if (player) {
              targetSocket.emit(SOCKET_EVENTS.CARD_UPDATE, { bingoCard: player.bingoCard });
            }
          }
        }
      }

      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
    });

    // HOST: Next Round
    socket.on(SOCKET_EVENTS.HOST_NEXT_ROUND, () => {
      if (!currentRoom) return;
      const room = getRoom(currentRoom);
      if (!room || room.hostId !== socket.id) return;

      // Check for winner first
      const engine = getEngine(currentRoom);
      if (engine) {
        const winner = engine.checkForWinner();
        if (winner) {
          room.phase = 'GAME_OVER';
          io.to(currentRoom).emit(SOCKET_EVENTS.GAME_WINNER, winner);
          io.to(currentRoom).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'GAME_OVER');
          io.to(currentRoom).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
          return;
        }
      }

      room.phase = 'SPINNING';
      room.roundGuesses = [];
      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_PHASE_CHANGE, 'SPINNING');
      io.to(currentRoom).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
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
        guess: data.guess,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (currentRoom) {
        removePlayer(currentRoom, socket.id);
        const room = getRoom(currentRoom);
        if (room) {
          io.to(currentRoom).emit(SOCKET_EVENTS.PLAYER_LEFT, {
            players: room.players,
            playerId: socket.id,
          });
          io.to(currentRoom).emit(SOCKET_EVENTS.GAME_STATE_SYNC, serializeRoom(room));
        }
      }
    });
  });
}
