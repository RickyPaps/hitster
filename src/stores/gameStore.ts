import { create } from 'zustand';
import type { GamePhase, WheelCategory, Track, BingoCell, GuessResult, LobbySettings, Player, SurpriseEventType } from '@/types/game';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

interface GameStore {
  // Connection
  roomCode: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;
  connectionStatus: ConnectionStatus;
  roomError: string | null;

  // Game state (synced from server)
  phase: GamePhase;
  players: Player[];
  currentTrack: Track | null;
  currentCategory: WheelCategory | null;
  roundNumber: number;
  roundGuesses: GuessResult[];
  settings: LobbySettings;
  timerSeconds: number;
  winner: Player | null;
  currentSpinnerId: string | null;
  currentSpinnerName: string | null;

  // Player-specific
  bingoCard: BingoCell[];
  hasGuessedThisRound: boolean;

  // Animation state
  streak: number;
  prevCompletedRows: number;
  surpriseEvent: { type: SurpriseEventType; targetName: string | null } | null;

  // Actions
  setConnection: (roomCode: string, playerId: string, playerName: string, isHost: boolean) => void;
  setPhase: (phase: GamePhase) => void;
  setPlayers: (players: Player[]) => void;
  setCurrentTrack: (track: Track | null) => void;
  setCurrentCategory: (category: WheelCategory | null) => void;
  setRoundNumber: (n: number) => void;
  setRoundGuesses: (guesses: GuessResult[]) => void;
  setSettings: (settings: LobbySettings) => void;
  setTimerSeconds: (s: number) => void;
  setBingoCard: (card: BingoCell[]) => void;
  markBingoCell: (index: number) => void;
  setHasGuessedThisRound: (v: boolean) => void;
  setWinner: (player: Player | null) => void;
  setCurrentSpinner: (id: string | null, name: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoomError: (error: string | null) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  setPrevCompletedRows: (n: number) => void;
  setSurpriseEvent: (event: { type: SurpriseEventType; targetName: string | null } | null) => void;
  reset: () => void;
}

const initialState = {
  roomCode: null as string | null,
  playerId: null as string | null,
  playerName: null as string | null,
  isHost: false,
  connectionStatus: 'connected' as ConnectionStatus,
  roomError: null as string | null,
  phase: 'LOBBY' as GamePhase,
  players: [] as Player[],
  currentTrack: null as Track | null,
  currentCategory: null as WheelCategory | null,
  roundNumber: 0,
  roundGuesses: [] as GuessResult[],
  settings: {
    timerDuration: 20,
    winCondition: 1,
    musicSource: 'curated',
    playlistUrl: '',
    drinkOnWrongGuess: true,
    drinkOnRowComplete: true,
  } as LobbySettings,
  timerSeconds: 0,
  bingoCard: [] as BingoCell[],
  hasGuessedThisRound: false,
  winner: null as Player | null,
  currentSpinnerId: null as string | null,
  currentSpinnerName: null as string | null,
  streak: 0,
  prevCompletedRows: 0,
  surpriseEvent: null as { type: SurpriseEventType; targetName: string | null } | null,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setConnection: (roomCode, playerId, playerName, isHost) =>
    set({ roomCode, playerId, playerName, isHost }),
  setPhase: (phase) => set({ phase }),
  setPlayers: (players) => set({ players }),
  setCurrentTrack: (currentTrack) => set({ currentTrack }),
  setCurrentCategory: (currentCategory) => set({ currentCategory }),
  setRoundNumber: (roundNumber) => set({ roundNumber }),
  setRoundGuesses: (roundGuesses) => set({ roundGuesses }),
  setSettings: (settings) => set({ settings }),
  setTimerSeconds: (timerSeconds) => set({ timerSeconds }),
  setBingoCard: (bingoCard) => set({ bingoCard }),
  markBingoCell: (index) =>
    set((state) => {
      const newCard = [...state.bingoCard];
      if (newCard[index]) {
        newCard[index] = { ...newCard[index], marked: true };
      }
      return { bingoCard: newCard };
    }),
  setHasGuessedThisRound: (hasGuessedThisRound) => set({ hasGuessedThisRound }),
  setWinner: (winner) => set({ winner }),
  setCurrentSpinner: (currentSpinnerId, currentSpinnerName) => set({ currentSpinnerId, currentSpinnerName }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  setRoomError: (roomError) => set({ roomError }),
  incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),
  resetStreak: () => set({ streak: 0 }),
  setPrevCompletedRows: (prevCompletedRows) => set({ prevCompletedRows }),
  setSurpriseEvent: (surpriseEvent) => set({ surpriseEvent }),
  reset: () => set(initialState),
}));
