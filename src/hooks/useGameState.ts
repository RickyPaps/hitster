'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { Player, LobbySettings, GamePhase, BingoCell } from '@/types/game';

export function useGameState() {
  const store = useGameStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on(SOCKET_EVENTS.GAME_STATE_SYNC, (state: any) => {
      // Batch all state updates into a single setState call to avoid cascading re-renders
      const { playerId } = useGameStore.getState();
      const me = playerId ? state.players.find((p: Player) => p.id === playerId) : null;

      useGameStore.setState({
        players: state.players,
        phase: state.phase,
        currentCategory: state.currentCategory,
        roundNumber: state.roundNumber,
        roundGuesses: state.roundGuesses,
        timerSeconds: state.timerSeconds,
        winner: state.winner ?? null,
        currentTrack: state.currentTrack ?? null,
        currentSpinnerId: state.currentSpinnerId ?? null,
        currentSpinnerName: state.currentSpinnerName ?? null,
        ...(me ? { bingoCard: me.bingoCard } : {}),
      });
    });

    socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, (phase: GamePhase) => {
      store.setPhase(phase);
      if (phase === 'PLAYING') {
        store.setHasGuessedThisRound(false);
      }
      if (phase === 'LOBBY') {
        store.resetStreak();
        store.setPrevCompletedRows(0);
      }
    });

    socket.on(SOCKET_EVENTS.GAME_TIMER_TICK, (seconds: number) => {
      store.setTimerSeconds(seconds);
    });

    socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data: { players: Player[] }) => {
      store.setPlayers(data.players);
    });

    socket.on(SOCKET_EVENTS.PLAYER_LEFT, (data: { players: Player[] }) => {
      store.setPlayers(data.players);
    });

    socket.on(SOCKET_EVENTS.SETTINGS_UPDATED, (settings: LobbySettings) => {
      store.setSettings(settings);
    });

    socket.on(SOCKET_EVENTS.CARD_UPDATE, (data: { bingoCard: BingoCell[] }) => {
      store.setBingoCard(data.bingoCard);
    });

    socket.on(SOCKET_EVENTS.GAME_WINNER, (winner: Player) => {
      store.setWinner(winner);
    });

    socket.on(SOCKET_EVENTS.GAME_SPINNER_SELECTED, (data: { playerId: string; playerName: string }) => {
      store.setCurrentSpinner(data.playerId, data.playerName);
    });

    socket.on(SOCKET_EVENTS.GAME_WHEEL_RESULT, (data: { category: string; segmentIndex: number }) => {
      store.setCurrentCategory(data.category as any);
    });

    socket.on(SOCKET_EVENTS.GAME_ROUND_START, (data: any) => {
      store.setCurrentTrack(data);
      store.setHasGuessedThisRound(false);
    });

    // Connection lifecycle events
    socket.on('disconnect', () => {
      store.setConnectionStatus('disconnected');
    });

    socket.io.on('reconnect_attempt', () => {
      store.setConnectionStatus('reconnecting');
    });

    socket.on('connect', () => {
      const { connectionStatus, roomCode, playerName, isHost } = useGameStore.getState();
      store.setConnectionStatus('connected');

      // Re-join room on reconnect
      if (connectionStatus === 'disconnected' || connectionStatus === 'reconnecting') {
        if (roomCode && isHost) {
          socket.emit(SOCKET_EVENTS.HOST_REJOIN_ROOM, { roomCode }, () => {});
        } else if (roomCode && playerName) {
          socket.emit(SOCKET_EVENTS.PLAYER_JOIN_ROOM, { roomCode, playerName }, () => {});
        }
        socket.emit(SOCKET_EVENTS.REQUEST_SYNC);
      }
    });

    // Error handling for room-level errors
    socket.on(SOCKET_EVENTS.ERROR, (data: { code?: string; message?: string }) => {
      if (data.code === 'room_not_found' || data.code === 'room_closed') {
        store.setRoomError(data.message || 'Room is no longer available');
      }
    });

    // Request full state sync now that listeners are registered.
    // This catches any events missed during page navigation.
    socket.emit(SOCKET_EVENTS.REQUEST_SYNC);

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_SYNC);
      socket.off(SOCKET_EVENTS.GAME_PHASE_CHANGE);
      socket.off(SOCKET_EVENTS.GAME_TIMER_TICK);
      socket.off(SOCKET_EVENTS.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.PLAYER_LEFT);
      socket.off(SOCKET_EVENTS.SETTINGS_UPDATED);
      socket.off(SOCKET_EVENTS.CARD_UPDATE);
      socket.off(SOCKET_EVENTS.GAME_WINNER);
      socket.off(SOCKET_EVENTS.GAME_SPINNER_SELECTED);
      socket.off(SOCKET_EVENTS.GAME_WHEEL_RESULT);
      socket.off(SOCKET_EVENTS.GAME_ROUND_START);
      socket.off(SOCKET_EVENTS.ERROR);
      socket.off('disconnect');
      socket.off('connect');
      socket.io.off('reconnect_attempt');
    };
  }, []);

  return store;
}
