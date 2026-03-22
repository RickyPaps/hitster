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
  { category: 'year',             label: 'Year',              color: '#2D8CFF', baseColor: '#0D2F5E', accentColor: '#2D8CFF' },
  { category: 'artist',           label: 'Artist',            color: '#FF2D55', baseColor: '#5E0D1A', accentColor: '#FF2D55' },
  { category: 'title',            label: 'Song Title',        color: '#00D96B', baseColor: '#0D4D28', accentColor: '#00D96B' },
  { category: 'year-approx',      label: 'Year ±1',           color: '#9B40FF', baseColor: '#30105E', accentColor: '#9B40FF' },
  { category: 'album',            label: 'Album',             color: '#FF7A00', baseColor: '#5E2D00', accentColor: '#FF7A00' },
  { category: 'everybody-drinks', label: 'Everybody Drinks!', color: '#FFE500', baseColor: '#4D4500', accentColor: '#FFE500' },
  { category: 'decade',           label: 'Decade',            color: '#FF407A', baseColor: '#5E0D28', accentColor: '#FF407A' },
  { category: 'rock-off',         label: 'Rock Off',          color: '#00D4AA', baseColor: '#004D3D', accentColor: '#00D4AA' },
];

// Movie wheel segments
export const MOVIE_WHEEL_SEGMENTS: WheelSegment[] = [
  { category: 'year',             label: 'Year',              color: '#2D8CFF', baseColor: '#0D2F5E', accentColor: '#2D8CFF' },
  { category: 'director',         label: 'Director',          color: '#FF2D55', baseColor: '#5E0D1A', accentColor: '#FF2D55' },
  { category: 'movie-title',      label: 'Movie Title',       color: '#00D96B', baseColor: '#0D4D28', accentColor: '#00D96B' },
  { category: 'year-approx',      label: 'Year ±1',           color: '#9B40FF', baseColor: '#30105E', accentColor: '#9B40FF' },
  { category: 'genre',            label: 'Genre',             color: '#FF7A00', baseColor: '#5E2D00', accentColor: '#FF7A00' },
  { category: 'everybody-drinks', label: 'Everybody Drinks!', color: '#FFE500', baseColor: '#4D4500', accentColor: '#FFE500' },
  { category: 'decade',           label: 'Decade',            color: '#FF407A', baseColor: '#5E0D28', accentColor: '#FF407A' },
  { category: 'rock-off',         label: 'Rock Off',          color: '#00D4AA', baseColor: '#004D3D', accentColor: '#00D4AA' },
];

// Mixed wheel segments (all unique guess categories + party) — used in mixed content mode
export const MIXED_WHEEL_SEGMENTS: WheelSegment[] = [
  { category: 'year',             label: 'Year',              color: '#2D8CFF', baseColor: '#0D2F5E', accentColor: '#2D8CFF' },
  { category: 'artist',           label: 'Artist',            color: '#FF2D55', baseColor: '#5E0D1A', accentColor: '#FF2D55' },
  { category: 'title',            label: 'Song Title',        color: '#00D96B', baseColor: '#0D4D28', accentColor: '#00D96B' },
  { category: 'year-approx',      label: 'Year ±1',           color: '#9B40FF', baseColor: '#30105E', accentColor: '#9B40FF' },
  { category: 'album',            label: 'Album',             color: '#FF7A00', baseColor: '#5E2D00', accentColor: '#FF7A00' },
  { category: 'director',         label: 'Director',          color: '#00C4D4', baseColor: '#004D56', accentColor: '#00C4D4' },
  { category: 'movie-title',      label: 'Movie Title',       color: '#E040FB', baseColor: '#4D1058', accentColor: '#E040FB' },
  { category: 'genre',            label: 'Genre',             color: '#8AE600', baseColor: '#2D4D00', accentColor: '#8AE600' },
  { category: 'decade',           label: 'Decade',            color: '#FF407A', baseColor: '#5E0D28', accentColor: '#FF407A' },
  { category: 'everybody-drinks', label: 'Everybody Drinks!', color: '#FFE500', baseColor: '#4D4500', accentColor: '#FFE500' },
  { category: 'rock-off',         label: 'Rock Off',          color: '#00D4AA', baseColor: '#004D3D', accentColor: '#00D4AA' },
];

// Backwards-compatible alias — resolves to music segments by default
export const WHEEL_SEGMENTS = MUSIC_WHEEL_SEGMENTS;

// Get wheel segments for a given media type (or 'mixed' for combined wheel)
export function getWheelSegments(mediaType: MediaType | 'mixed'): WheelSegment[] {
  if (mediaType === 'mixed') return MIXED_WHEEL_SEGMENTS;
  return mediaType === 'movie' ? MOVIE_WHEEL_SEGMENTS : MUSIC_WHEEL_SEGMENTS;
}

// Get ALL segments (union) for looking up any category label/color
export const ALL_WHEEL_SEGMENTS: WheelSegment[] = [
  ...MUSIC_WHEEL_SEGMENTS,
  // Movie-only categories with distinct colors for mixed-mode visibility
  { category: 'director',    label: 'Director',    color: '#00C4D4', baseColor: '#004D56', accentColor: '#00C4D4' },
  { category: 'movie-title', label: 'Movie Title', color: '#E040FB', baseColor: '#4D1058', accentColor: '#E040FB' },
  { category: 'genre',       label: 'Genre',       color: '#8AE600', baseColor: '#2D4D00', accentColor: '#8AE600' },
];

/** Music-only categories → 'music', movie-only → 'movie', shared/party → null */
export function getCategoryMediaType(category: WheelCategory): MediaType | null {
  if (['artist', 'title', 'album'].includes(category)) return 'music';
  if (['director', 'movie-title', 'genre'].includes(category)) return 'movie';
  return null;
}

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
  trailerVideoId?: string;  // YouTube video ID for trailer clip
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
  | 'streakSaver250'
  | 'drinks500'
  | 'bonusRound750'
  | 'hint1000'
  | 'pointSurge1500'
  | 'jackpot2000'
  | 'streak3FreeMark'
  | 'streak5AllDrink';

// ── Shop System ──
export type ShopItemId =
  | 'freeMark'
  | 'stealCell'
  | 'shield'
  | 'scramble'
  | 'doubleMark'
  | 'lifeline'
  | 'cardPeek';

export interface ShopItemDef {
  id: ShopItemId;
  name: string;
  description: string;
  cost: number;
  icon: string;
  needsTarget: boolean;
  needsOwnCell: boolean;
  maxPerGame: number; // 0 = unlimited
}

export const SHOP_ITEMS: ShopItemDef[] = [
  { id: 'cardPeek', name: 'Card Peek', description: 'See which cells opponents need to complete a line', cost: 100, icon: '\u{1F441}', needsTarget: false, needsOwnCell: false, maxPerGame: 3 },
  { id: 'shield', name: 'Shield', description: 'Block the next steal or block attempt against you', cost: 150, icon: '\u{1F6E1}', needsTarget: false, needsOwnCell: false, maxPerGame: 2 },
  { id: 'freeMark', name: 'Free Mark', description: 'Mark any unmarked cell on your bingo card', cost: 200, icon: '\u2B50', needsTarget: false, needsOwnCell: true, maxPerGame: 2 },
  { id: 'lifeline', name: 'Lifeline', description: 'If you get the next answer wrong, mark the cell anyway', cost: 250, icon: '\u{1F48E}', needsTarget: false, needsOwnCell: false, maxPerGame: 1 },
  { id: 'doubleMark', name: 'Double Mark', description: 'Your next correct answer marks 2 cells instead of 1', cost: 300, icon: '\u{1F31F}', needsTarget: false, needsOwnCell: false, maxPerGame: 1 },
  { id: 'stealCell', name: 'Steal Cell', description: 'Unmark a cell from a target player\'s card', cost: 350, icon: '\u{1F5E1}', needsTarget: true, needsOwnCell: false, maxPerGame: 2 },
  { id: 'scramble', name: 'Scramble', description: 'Shuffle categories on a target player\'s unmarked cells', cost: 400, icon: '\u{1F300}', needsTarget: true, needsOwnCell: false, maxPerGame: 1 },
];

export interface PlayerShopState {
  /** How many times each item has been purchased this game */
  purchaseCount: Record<ShopItemId, number>;
  /** Currently active passive items (shield, lifeline, doubleMark) */
  activeItems: ShopItemId[];
}

export type SurpriseEventType =
  | 'spotlight'
  | 'doubleRound'
  | 'everybodyCheers'
  | 'categoryCurse'
  | 'luckyStar'
  | 'hotSeat'
  | 'timePressure'
  | 'scoreSwap'
  | 'streakBreaker'
  | 'pointThief';

export interface SurpriseModifiers {
  doublePoints: boolean;
  hotSeatPlayerId: string | null;
  halfTimer: boolean;
}

export interface PlayerMilestones {
  streakSaver250Earned: boolean;
  streakSaver250Active: boolean;  // blocks next streak-break
  drinks500Earned: boolean;
  drinks500Used: boolean;
  bonusRound750Earned: boolean;
  bonusRound750Active: boolean;   // 1.5x points for next 2 rounds
  bonusRound750Remaining: number; // rounds left
  hint1000Earned: boolean;
  hint1000Used: boolean;
  pointSurge1500Earned: boolean;
  pointSurge1500Active: boolean;  // +50 bonus per correct for next 3 rounds
  pointSurge1500Remaining: number;
  jackpot2000Earned: boolean;
  jackpot2000Used: boolean;
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
  shopState: PlayerShopState;
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
  pendingSpinResult: { category: WheelCategory; segmentIndex: number; mediaType?: MediaType | 'mixed' } | null;
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