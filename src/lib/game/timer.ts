import type { Server } from 'socket.io';
import { SOCKET_EVENTS } from '../socket/events';
import { getRoom } from './room';

const timers = new Map<string, ReturnType<typeof setInterval>>();

export function clearRoomTimer(roomCode: string) {
  const timer = timers.get(roomCode);
  if (timer) {
    clearInterval(timer);
    timers.delete(roomCode);
  }
}

export function startRoundTimer(
  io: Server,
  roomCode: string,
  onTimerEnd: (roomCode: string) => void
) {
  clearRoomTimer(roomCode);
  const room = getRoom(roomCode);
  if (!room) return;

  const timer = setInterval(() => {
    room.timerSeconds--;
    io.to(roomCode).emit(SOCKET_EVENTS.GAME_TIMER_TICK, room.timerSeconds);

    if (room.timerSeconds <= 0) {
      clearRoomTimer(roomCode);
      onTimerEnd(roomCode);
    }
  }, 1000);

  timers.set(roomCode, timer);
}

export function hasActiveTimer(roomCode: string): boolean {
  return timers.has(roomCode);
}
