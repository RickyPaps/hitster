/**
 * Lightweight game state persistence.
 * Snapshots active rooms to disk on phase changes and periodically.
 * On server restart, rooms can be restored from the snapshot file.
 *
 * Uses a single JSON file in /tmp to avoid filesystem issues on Render.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { RoomState } from '@/types/game';

const SNAPSHOT_DIR = join(process.cwd(), '.game-snapshots');
const SNAPSHOT_FILE = join(SNAPSHOT_DIR, 'rooms.json');

interface SerializedRoom {
  roomCode: string;
  hostId: string;
  players: any[];
  phase: string;
  settings: any;
  currentTrack: any;
  currentCategory: string | null;
  roundNumber: number;
  roundGuesses: any[];
  tracks: any[];
  usedTrackIds: string[];
  timerSeconds: number;
  winner: any;
  currentSpinnerId: string | null;
  currentSpinnerName: string | null;
  pendingSpinResult: any;
  lastActivityAt: number;
  surpriseModifiers: any;
}

function serializeRoom(room: RoomState): SerializedRoom {
  return {
    ...room,
    usedTrackIds: Array.from(room.usedTrackIds),
  };
}

function deserializeRoom(data: SerializedRoom): RoomState {
  return {
    ...data,
    usedTrackIds: new Set(data.usedTrackIds),
  } as RoomState;
}

/**
 * Save all active rooms to disk.
 */
export function snapshotRooms(rooms: Map<string, RoomState>): void {
  try {
    if (!existsSync(SNAPSHOT_DIR)) {
      mkdirSync(SNAPSHOT_DIR, { recursive: true });
    }
    const data = Array.from(rooms.values())
      .filter((r) => r.phase !== 'LOBBY') // Only snapshot in-progress games
      .map(serializeRoom);

    writeFileSync(SNAPSHOT_FILE, JSON.stringify(data), 'utf-8');
  } catch (err) {
    console.error('[Persistence] Failed to snapshot rooms:', err);
  }
}

/**
 * Restore rooms from the last snapshot. Returns a Map of restored rooms.
 */
export function restoreRooms(): Map<string, RoomState> {
  const restored = new Map<string, RoomState>();
  try {
    if (!existsSync(SNAPSHOT_FILE)) return restored;

    const raw = readFileSync(SNAPSHOT_FILE, 'utf-8');
    const data: SerializedRoom[] = JSON.parse(raw);

    for (const entry of data) {
      // Skip stale snapshots (older than 1 hour)
      if (Date.now() - entry.lastActivityAt > 60 * 60 * 1000) continue;
      // Mark all players as disconnected — they'll reconnect via socket
      const room = deserializeRoom(entry);
      for (const player of room.players) {
        player.connected = false;
      }
      restored.set(room.roomCode, room);
    }

    if (restored.size > 0) {
      console.log(`[Persistence] Restored ${restored.size} room(s) from snapshot`);
    }
  } catch (err) {
    console.error('[Persistence] Failed to restore rooms:', err);
  }
  return restored;
}

/**
 * Clear the snapshot file (e.g., after successful restore).
 */
export function clearSnapshot(): void {
  try {
    if (existsSync(SNAPSHOT_FILE)) {
      writeFileSync(SNAPSHOT_FILE, '[]', 'utf-8');
    }
  } catch {
    // Non-critical
  }
}
