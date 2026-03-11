import type { RoomState, Player, LobbySettings, Track } from '@/types/game';
import { generateBingoCard } from './bingo';

const rooms = new Map<string, RoomState>();

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  for (let attempt = 0; attempt < 100; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Failed to generate unique room code after 100 attempts');
}

export function createRoom(hostId: string, settings?: Partial<LobbySettings>): RoomState {
  const roomCode = generateRoomCode();
  const defaultSettings: LobbySettings = {
    timerDuration: 20,
    winCondition: 1,
    contentMode: 'music',
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
    currentSpinnerId: null,
    currentSpinnerName: null,
    pendingSpinResult: null,
    lastActivityAt: Date.now(),
    surpriseModifiers: { doublePoints: false, hotSeatPlayerId: null },
  };
  rooms.set(roomCode, room);
  return room;
}

export function getRoom(roomCode: string): RoomState | undefined {
  return rooms.get(roomCode);
}

export function touchRoom(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (room) room.lastActivityAt = Date.now();
}

export function getAllRoomCodes(): string[] {
  return Array.from(rooms.keys());
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

  // Max 8 players per room
  if (room.players.length >= 8) return null;

  const player: Player = {
    id: playerId,
    name: playerName,
    bingoCard: [], // generated at game start based on final contentMode
    score: 0,
    connected: true,
    completedRows: 0,
    drinks: 0,
    milestones: {
      shield250Earned: false,
      shield250Active: false,
      drinks500Earned: false,
      drinks500Used: false,
      swap750Earned: false,
      swap750Used: false,
      block1000Earned: false,
      block1000Used: false,
      doublePts1500Earned: false,
      doublePts1500Active: false,
      steal2000Earned: false,
      steal2000Used: false,
    },
    streak: 0,
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

export function kickPlayer(roomCode: string, playerId: string): boolean {
  const room = rooms.get(roomCode);
  if (!room) return false;
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return false;
  room.players.splice(idx, 1);
  return true;
}

export function deleteRoom(roomCode: string): void {
  rooms.delete(roomCode);
}

export function resetRoomToLobby(roomCode: string): RoomState | null {
  const room = rooms.get(roomCode);
  if (!room) return null;

  room.phase = 'LOBBY';
  room.currentTrack = null;
  room.currentCategory = null;
  room.roundNumber = 0;
  room.roundGuesses = [];
  room.tracks = [];
  room.usedTrackIds = new Set();
  room.timerSeconds = 0;
  room.winner = null;
  room.currentSpinnerId = null;
  room.currentSpinnerName = null;
  room.pendingSpinResult = null;
  room.lastActivityAt = Date.now();
  room.surpriseModifiers = { doublePoints: false, hotSeatPlayerId: null };

  // Reset all players
  for (const player of room.players) {
    player.score = 0;
    player.completedRows = 0;
    player.drinks = 0;
    player.streak = 0;
    player.bingoCard = generateBingoCard(room.settings.contentMode);
    player.milestones = {
      shield250Earned: false,
      shield250Active: false,
      drinks500Earned: false,
      drinks500Used: false,
      swap750Earned: false,
      swap750Used: false,
      block1000Earned: false,
      block1000Used: false,
      doublePts1500Earned: false,
      doublePts1500Active: false,
      steal2000Earned: false,
      steal2000Used: false,
    };
  }

  return room;
}

export function cleanupAbandonedRooms(): string[] {
  const now = Date.now();
  const THIRTY_MINUTES = 30 * 60 * 1000;
  const cleaned: string[] = [];

  for (const [code, room] of rooms) {
    const anyConnected = room.players.some((p) => p.connected);
    if (!anyConnected && now - room.lastActivityAt > THIRTY_MINUTES) {
      rooms.delete(code);
      cleaned.push(code);
    }
  }

  return cleaned;
}

export function getNextTrack(room: RoomState): Track | null {
  const available = room.tracks.filter(
    (t) => !room.usedTrackIds.has(t.id)
  );
  if (available.length === 0) return null;

  // Prefer tracks with audio; fall back to tracks without only when exhausted
  const withPreview = available.filter((t) => t.previewUrl);
  const pool = withPreview.length > 0 ? withPreview : available;

  const track = pool[Math.floor(Math.random() * pool.length)];
  room.usedTrackIds.add(track.id);
  return track;
}
