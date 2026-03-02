'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import type { Player, LobbySettings, GamePhase, GuessResult, BingoCell } from '@/types/game';

export function useGameState() {
  const store = useGameStore();

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on(SOCKET_EVENTS.GAME_STATE_SYNC, (state: any) => {
      store.setPlayers(state.players);
      store.setPhase(state.phase);
      store.setCurrentCategory(state.currentCategory);
      store.setRoundNumber(state.roundNumber);
      store.setRoundGuesses(state.roundGuesses);
      store.setTimerSeconds(state.timerSeconds);
      if (state.winner) store.setWinner(state.winner);
      if (state.partyTarget) store.setPartyTarget(state.partyTarget);
      if (state.currentTrack) store.setCurrentTrack(state.currentTrack);

      // Update own bingo card from server state
      if (store.playerId) {
        const me = state.players.find((p: Player) => p.id === store.playerId);
        if (me) {
          store.setBingoCard(me.bingoCard);
        }
      }
    });

    socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, (phase: GamePhase) => {
      store.setPhase(phase);
      if (phase === 'PLAYING') {
        store.setHasGuessedThisRound(false);
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

    socket.on(SOCKET_EVENTS.GUESS_RESULT, (result: GuessResult) => {
      store.setHasGuessedThisRound(true);
    });

    socket.on(SOCKET_EVENTS.CARD_UPDATE, (data: { bingoCard: BingoCell[] }) => {
      store.setBingoCard(data.bingoCard);
    });

    socket.on(SOCKET_EVENTS.GAME_WINNER, (winner: Player) => {
      store.setWinner(winner);
    });

    socket.on(SOCKET_EVENTS.GAME_WHEEL_RESULT, (data: { category: string; segmentIndex: number }) => {
      store.setCurrentCategory(data.category as any);
    });

    socket.on(SOCKET_EVENTS.GAME_ROUND_START, (data: any) => {
      store.setCurrentTrack(data);
      store.setHasGuessedThisRound(false);
    });

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE_SYNC);
      socket.off(SOCKET_EVENTS.GAME_PHASE_CHANGE);
      socket.off(SOCKET_EVENTS.GAME_TIMER_TICK);
      socket.off(SOCKET_EVENTS.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.PLAYER_LEFT);
      socket.off(SOCKET_EVENTS.SETTINGS_UPDATED);
      socket.off(SOCKET_EVENTS.GUESS_RESULT);
      socket.off(SOCKET_EVENTS.CARD_UPDATE);
      socket.off(SOCKET_EVENTS.GAME_WINNER);
      socket.off(SOCKET_EVENTS.GAME_WHEEL_RESULT);
      socket.off(SOCKET_EVENTS.GAME_ROUND_START);
    };
  }, []);

  return store;
}
