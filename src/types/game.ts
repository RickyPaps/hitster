export type GamePhase =
  | 'LOBBY'
  | 'SPINNING'
  | 'PLAYING'
  | 'JUDGING'
  | 'ROUND_RESULTS'
  | 'DRINKING_SEGMENT'
  | 'GAME_OVER';

export type GuessCategory = 'year' | 'artist' | 'title' | 'lyrics' | 'album';
export type PartyCategory = 'everybody-drinks' | 'hot-take' | 'rock-off';
export type WheelCategory = GuessCategory | PartyCategory;

export interface WheelSegment {
  category: WheelCategory;
  label: string;
  color: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { category: 'year', label: 'Year', color: '#3B82F6' },        // Blue
  { category: 'artist', label: 'Artist', color: '#EF4444' },     // Red
  { category: 'title', label: 'Song Title', color: '#22C55E' },  // Green
  { category: 'lyrics', label: 'Lyrics', color: '#A855F7' },     // Purple
  { category: 'album', label: 'Album', color: '#F97316' },       // Orange
  { category: 'everybody-drinks', label: 'Everybody Drinks!', color: '#EAB308' }, // Yellow
  { category: 'hot-take', label: 'Hot Take', color: '#EC4899' }, // Pink
  { category: 'rock-off', label: 'Rock Off', color: '#14B8A6' }, // Teal
];

export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  year: number;
  previewUrl: string | null;
  albumArt: string;
}

export interface BingoCell {
  category: GuessCategory;
  marked: boolean;
}

export interface Player {
  id: string;
  name: string;
  bingoCard: BingoCell[];  // 9 cells, 3x3 grid (row-major)
  score: number;
  connected: boolean;
  completedRows: number;
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  guess: string;
  correct: boolean;
  similarity?: number;
}

export interface LobbySettings {
  timerDuration: 10 | 20 | 30;
  winCondition: 1 | 2 | 9;  // 1 row, 2 rows, or full card (9)
  musicSource: 'curated' | 'playlist';
  playlistUrl: string;
  drinkOnWrongGuess: boolean;
  drinkOnRowComplete: boolean;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  settings: LobbySettings;
  currentTrack: Track | null;
  currentCategory: WheelCategory | null;
  roundNumber: number;
  roundGuesses: GuessResult[];
  tracks: Track[];
  usedTrackIds: Set<string>;
  timerSeconds: number;
  winner: Player | null;
  partyTarget?: string | null; // player name for hot-take
}

export const DEFAULT_SETTINGS: LobbySettings = {
  timerDuration: 20,
  winCondition: 1,
  musicSource: 'curated',
  playlistUrl: '',
  drinkOnWrongGuess: true,
  drinkOnRowComplete: true,
};
