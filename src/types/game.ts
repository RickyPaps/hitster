export type GamePhase =
  | 'LOBBY'
  | 'SPINNING'
  | 'PLAYING'
  | 'ROUND_RESULTS'
  | 'DRINKING_SEGMENT'
  | 'GAME_OVER';

export type GuessCategory = 'year' | 'artist' | 'title' | 'year-approx' | 'album';
export type PartyCategory = 'everybody-drinks' | 'hot-take' | 'rock-off';
export type WheelCategory = GuessCategory | PartyCategory;

export interface WheelSegment {
  category: WheelCategory;
  label: string;
  color: string;
  baseColor: string;
  accentColor: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { category: 'year',             label: 'Year',              color: '#4d9fff', baseColor: '#0a1a3d', accentColor: '#4d9fff' },
  { category: 'artist',           label: 'Artist',            color: '#ff3355', baseColor: '#3d0a0a', accentColor: '#ff3355' },
  { category: 'title',            label: 'Song Title',        color: '#33ff77', baseColor: '#0a3d1a', accentColor: '#33ff77' },
  { category: 'year-approx',      label: 'Year ±3',           color: '#bc4dff', baseColor: '#2a0a3d', accentColor: '#bc4dff' },
  { category: 'album',            label: 'Album',             color: '#ff8833', baseColor: '#3d1a0a', accentColor: '#ff8833' },
  { category: 'everybody-drinks', label: 'Everybody Drinks!', color: '#ffcc00', baseColor: '#3d2e0a', accentColor: '#ffcc00' },
  { category: 'hot-take',         label: 'Hot Take',          color: '#ff4da6', baseColor: '#3d0a2a', accentColor: '#ff4da6' },
  { category: 'rock-off',         label: 'Rock Off',          color: '#00e6cc', baseColor: '#0a3d35', accentColor: '#00e6cc' },
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
  drinks: number;
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
  currentSpinnerId: string | null;
  currentSpinnerName: string | null;
  pendingSpinResult: { category: WheelCategory; segmentIndex: number } | null;
}

export interface TrackHistoryEntry {
  track: Track;
  category: WheelCategory;
  roundNumber: number;
  correctCount: number;
  totalGuesses: number;
}