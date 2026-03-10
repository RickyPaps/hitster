import { create } from 'zustand';
import type { GamePhase, WheelCategory, Track, BingoCell, GuessResult, LobbySettings, Player } from '@/types/game';

interface GameStore {
  // Connection
  roomCode: string | null;
  playerId: string | null;
  playerName: string | null;
  isHost: boolean;

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
  partyTarget: string | null;
  currentSpinnerId: string | null;
  currentSpinnerName: string | null;

  // Player-specific
  bingoCard: BingoCell[];
  hasGuessedThisRound: boolean;

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
  setPartyTarget: (name: string | null) => void;
  setCurrentSpinner: (id: string | null, name: string | null) => void;
  reset: () => void;
}

const initialState = {
  roomCode: null,
  playerId: null,
  playerName: null,
  isHost: false,
  phase: 'LOBBY' as GamePhase,
  players: [],
  currentTrack: null,
  currentCategory: null,
  roundNumber: 0,
  roundGuesses: [],
  settings: {
    timerDuration: 20,
    winCondition: 1,
    musicSource: 'curated',
    playlistUrl: '',
    drinkOnWrongGuess: true,
    drinkOnRowComplete: true,
  } as LobbySettings,
  timerSeconds: 0,
  bingoCard: [],
  hasGuessedThisRound: false,
  winner: null,
  partyTarget: null,
  currentSpinnerId: null,
  currentSpinnerName: null,
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
  setPartyTarget: (partyTarget) => set({ partyTarget }),
  setCurrentSpinner: (currentSpinnerId, currentSpinnerName) => set({ currentSpinnerId, currentSpinnerName }),
  reset: () => set(initialState),
}));
