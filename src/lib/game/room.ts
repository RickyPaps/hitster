import type { RoomState, Player, LobbySettings, Track, DEFAULT_SETTINGS } from '@/types/game';
import { generateBingoCard } from './bingo';

const rooms = new Map<string, RoomState>();

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure unique
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

export function createRoom(hostId: string, settings?: Partial<LobbySettings>): RoomState {
  const roomCode = generateRoomCode();
  const defaultSettings: LobbySettings = {
    timerDuration: 20,
    winCondition: 1,
    musicSource: 'curated',
    playlistUrl: '',
    drinkOnWrongGuess: true,
    drinkOnRowComplete: true,
  };
  const room: RoomState = {
    roomCode,
    hostId,
    players: [],
    phase: 'LOBBY',
    settings: { ...defaultSettings, ...settings },
    currentTrack: null,
    currentCategory: null,
    roundNumber: 0,
    roundGuesses: [],
    tracks: [],
    usedTrackIds: new Set(),
    timerSeconds: 0,
    winner: null,
  };
  rooms.set(roomCode, room);
  return room;
}

export function getRoom(roomCode: string): RoomState | undefined {
  return rooms.get(roomCode);
}

export function addPlayer(roomCode: string, playerId: string, playerName: string): Player | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  // Check if player already exists (reconnection)
  const existing = room.players.find((p) => p.name === playerName);
  if (existing) {
    existing.id = playerId;
    existing.connected = true;
    return existing;
  }

  const player: Player = {
    id: playerId,
    name: playerName,
    bingoCard: generateBingoCard(),
    score: 0,
    connected: true,
    completedRows: 0,
  };
  room.players.push(player);
  return player;
}

export function removePlayer(roomCode: string, playerId: string): void {
  const room = rooms.get(roomCode);
  if (!room) return;
  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;
  }
}

export function deleteRoom(roomCode: string): void {
  rooms.delete(roomCode);
}

export function getNextTrack(room: RoomState): Track | null {
  const available = room.tracks.filter(
    (t) => t.previewUrl && !room.usedTrackIds.has(t.id)
  );
  if (available.length === 0) return null;
  const track = available[Math.floor(Math.random() * available.length)];
  room.usedTrackIds.add(track.id);
  return track;
}
