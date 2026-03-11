export type GamePhase =
  | 'LOBBY'
  | 'SPINNING'
  | 'PLAYING'
  | 'ROUND_RESULTS'
  | 'DRINKING_SEGMENT'
  | 'GAME_OVER';

export type MediaType = 'music' | 'movie';

// Music guess categories
export type MusicGuessCategory = 'year' | 'artist' | 'title' | 'year-approx' | 'album' | 'decade';
// Movie guess categories
export type MovieGuessCategory = 'year' | 'director' | 'movie-title' | 'year-approx' | 'genre' | 'decade';
// Union of all guess categories
export type GuessCategory = MusicGuessCategory | MovieGuessCategory;

export type PartyCategory = 'everybody-drinks' | 'rock-off';
export type WheelCategory = GuessCategory | PartyCategory;

// Categories available per media type
export const MUSIC_GUESS_CATEGORIES: MusicGuessCategory[] = ['year', 'artist', 'title', 'year-approx', 'album', 'decade'];
export const MOVIE_GUESS_CATEGORIES: MovieGuessCategory[] = ['year', 'director', 'movie-title', 'year-approx', 'genre', 'decade'];

export interface WheelSegment {
  category: WheelCategory;
  label: string;
  color: string;
  baseColor: string;
  accentColor: string;
}

// Music wheel segments (default)
export const MUSIC_WHEEL_SEGMENTS: WheelSegment[] = [
  { category: 'year',             label: 'Year',              color: '#4d9fff', baseColor: '#0a1a3d', accentColor: '#4d9fff' },
  { category: 'artist',           label: 'Artist',            color: '#ff3355', baseColor: '#3d0a0a', accentColor: '#ff3355' },
  { category: 'title',            label: 'Song Title',        color: '#33ff77', baseColor: '#0a3d1a', accentColor: '#33ff77' },
  { category: 'year-approx',      label: 'Year ±1',           color: '#bc4dff', baseColor: '#2a0a3d', accentColor: '#bc4dff' },
  { category: 'album',            label: 'Album',             color: '#ff8833', baseColor: '#3d1a0a', accentColor: '#ff8833' },
  { category: 'everybody-drinks', label: 'Everybody Drinks!', color: '#ffcc00', baseColor: '#3d2e0a', accentColor: '#ffcc00' },
  { category: 'decade',           label: 'Decade',            color: '#ff4da6', baseColor: '#3d0a2a', accentColor: '#ff4da6' },
  { category: 'rock-off',         label: 'Rock Off',          color: '#00e6cc', baseColor: '#0a3d35', accentColor: '#00e6cc' },
];

// Movie wheel segments
export const MOVIE_WHEEL_SEGMENTS: WheelSegment[] = [
  { category: 'year',             label: 'Year',              color: '#4d9fff', baseColor: '#0a1a3d', accentColor: '#4d9fff' },
  { category: 'director',         label: 'Director',          color: '#ff3355', baseColor: '#3d0a0a', accentColor: '#ff3355' },
  { category: 'movie-title',      label: 'Movie Title',       color: '#33ff77', baseColor: '#0a3d1a', accentColor: '#33ff77' },
  { category: 'year-approx',      label: 'Year ±1',           color: '#bc4dff', baseColor: '#2a0a3d', accentColor: '#bc4dff' },
  { category: 'genre',            label: 'Genre',             color: '#ff8833', baseColor: '#3d1a0a', accentColor: '#ff8833' },
  { category: 'everybody-drinks', label: 'Everybody Drinks!', color: '#ffcc00', baseColor: '#3d2e0a', accentColor: '#ffcc00' },
  { category: 'decade',           label: 'Decade',            color: '#ff4da6', baseColor: '#3d0a2a', accentColor: '#ff4da6' },
  { category: 'rock-off',         label: 'Rock Off',          color: '#00e6cc', baseColor: '#0a3d35', accentColor: '#00e6cc' },
];

// Backwards-compatible alias — resolves to music segments by default
export const WHEEL_SEGMENTS = MUSIC_WHEEL_SEGMENTS;

// Get wheel segments for a given media type
export function getWheelSegments(mediaType: MediaType): WheelSegment[] {
  return mediaType === 'movie' ? MOVIE_WHEEL_SEGMENTS : MUSIC_WHEEL_SEGMENTS;
}

// Get ALL segments (union) for looking up any category label/color
export const ALL_WHEEL_SEGMENTS: WheelSegment[] = [
  ...MUSIC_WHEEL_SEGMENTS,
  ...MOVIE_WHEEL_SEGMENTS.filter(
    (ms) => !MUSIC_WHEEL_SEGMENTS.some((ws) => ws.category === ms.category)
  ),
];

// ── Media Item Types ──

interface MediaBase {
  id: string;
  mediaType: MediaType;
  year: number;
  previewUrl: string | null;
  albumArt: string;         // album art (music) or movie poster
}

export interface MusicTrack extends MediaBase {
  mediaType: 'music';
  name: string;
  artist: string;
  album: string;
}

export interface MovieTrack extends MediaBase {
  mediaType: 'movie';
  title: string;
  director: string;
  genre: string;
}

export type MediaItem = MusicTrack | MovieTrack;

// Backwards-compatible alias: Track = any MediaItem
// Existing code that uses Track continues to work; new code should use MediaItem
export type Track = MediaItem;

// ── Helper functions for media items ──

export function isMusicTrack(item: MediaItem): item is MusicTrack {
  return item.mediaType === 'music';
}

export function isMovieTrack(item: MediaItem): item is MovieTrack {
  return item.mediaType === 'movie';
}

/** Get display title regardless of media type */
export function getMediaTitle(item: MediaItem): string {
  return isMusicTrack(item) ? item.name : item.title;
}

/** Get display subtitle regardless of media type */
export function getMediaSubtitle(item: MediaItem): string {
  return isMusicTrack(item) ? item.artist : item.director;
}

/** Get the tertiary detail line (album or genre) */
export function getMediaDetail(item: MediaItem): string {
  return isMusicTrack(item) ? item.album : item.genre;
}

export interface BingoCell {
  category: GuessCategory;
  marked: boolean;
}

export type MilestoneType =
  | 'shield250'
  | 'drinks500'
  | 'swap750'
  | 'block1000'
  | 'doublePts1500'
  | 'steal2000'
  | 'streak3FreeMark'
  | 'streak5AllDrink';

export type SurpriseEventType =
  | 'spotlight'
  | 'doubleRound'
  | 'everybodyCheers'
  | 'categoryCurse'
  | 'luckyStar'
  | 'hotSeat';

export interface SurpriseModifiers {
  doublePoints: boolean;
  hotSeatPlayerId: string | null;
}

export interface PlayerMilestones {
  shield250Earned: boolean;
  shield250Active: boolean;
  drinks500Earned: boolean;
  drinks500Used: boolean;
  swap750Earned: boolean;
  swap750Used: boolean;
  block1000Earned: boolean;
  block1000Used: boolean;
  doublePts1500Earned: boolean;
  doublePts1500Active: boolean;
  steal2000Earned: boolean;
  steal2000Used: boolean;
}

export interface Player {
  id: string;
  name: string;
  bingoCard: BingoCell[];  // 9 cells, 3x3 grid (row-major)
  score: number;
  connected: boolean;
  completedRows: number;
  drinks: number;
  milestones: PlayerMilestones;
  streak: number;
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  guess: string;
  correct: boolean;
  similarity?: number;
  bonusCategories?: string[];
  pointsAwarded?: number;
}

export interface LobbySettings {
  timerDuration: 10 | 20 | 30;
  winCondition: 1 | 2 | 9;  // 1 row, 2 rows, or full card (9)
  contentMode: MediaType | 'mixed';  // music, movie, or mixed
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
  currentSpinnerId: string | null;
  currentSpinnerName: string | null;
  pendingSpinResult: { category: WheelCategory; segmentIndex: number } | null;
  lastActivityAt: number;
  surpriseModifiers: SurpriseModifiers;
}

export interface TrackHistoryEntry {
  track: MediaItem;
  category: WheelCategory;
  roundNumber: number;
  correctCount: number;
  totalGuesses: number;
}

/** Get the active guess categories for a given content mode */
export function getGuessCategoriesForMode(mode: MediaType | 'mixed'): GuessCategory[] {
  if (mode === 'movie') return MOVIE_GUESS_CATEGORIES;
  if (mode === 'music') return MUSIC_GUESS_CATEGORIES;
  // Mixed: union of both, deduplicated
  const all = new Set<GuessCategory>([...MUSIC_GUESS_CATEGORIES, ...MOVIE_GUESS_CATEGORIES]);
  return Array.from(all);
}