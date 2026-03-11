import { compareTwoStrings } from 'string-similarity';
import type { MediaItem } from '@/types/game';
import { isMusicTrack, isMovieTrack } from '@/types/game';

const FUZZY_THRESHOLD = 0.4;

// Split "Artist ft. Other" into individual artist names
const FEAT_PATTERN = /\s+(?:ft\.?|feat\.?|featuring|&|,|and|x|vs\.?)\s+/i;

function bestNameSimilarity(guess: string, name: string): number {
  const fullSimilarity = compareTwoStrings(guess, name.toLowerCase());
  // Also compare against each individual part (handles "ft." splits for artists)
  const parts = name.split(FEAT_PATTERN).map((p) => p.trim().toLowerCase()).filter(Boolean);
  let best = fullSimilarity;
  for (const part of parts) {
    const sim = compareTwoStrings(guess, part);
    if (sim > best) best = sim;
  }
  return best;
}

type MatchResult = { correct: boolean; similarity?: number; bonusCategories?: string[] };

// ── Year-based categories (shared by music & movie) ──

function checkYear(normalizedGuess: string, year: number): MatchResult {
  const guessedYear = parseInt(normalizedGuess, 10);
  if (isNaN(guessedYear)) return { correct: false };
  const isExact = guessedYear === year;
  return {
    correct: isExact,
    similarity: isExact ? 1 : 0,
    bonusCategories: isExact ? ['year-approx'] : undefined,
  };
}

function checkYearApprox(normalizedGuess: string, year: number): MatchResult {
  const guessedYearApprox = parseInt(normalizedGuess, 10);
  if (isNaN(guessedYearApprox)) return { correct: false };
  const diffApprox = Math.abs(guessedYearApprox - year);
  const isExact = diffApprox === 0;
  return {
    correct: diffApprox <= 1,
    similarity: isExact ? 1 : diffApprox === 1 ? 0.5 : 0,
    bonusCategories: isExact ? ['year'] : undefined,
  };
}

function checkDecade(normalizedGuess: string, year: number): MatchResult {
  const guessedDecade = parseInt(normalizedGuess, 10);
  if (isNaN(guessedDecade)) return { correct: false };
  const fullGuessedDecade = guessedDecade < 30 ? 2000 + guessedDecade : 1900 + guessedDecade;
  const trackDecade = Math.floor(year / 10) * 10;
  const isCorrect = fullGuessedDecade === trackDecade;
  return { correct: isCorrect, similarity: isCorrect ? 1 : 0 };
}

// ── Music-specific matching ──

function checkMusicAnswer(category: string, normalizedGuess: string, track: MediaItem & { mediaType: 'music' }): MatchResult {
  switch (category) {
    case 'artist': {
      const similarity = bestNameSimilarity(normalizedGuess, track.artist);
      const titleSimA = compareTwoStrings(normalizedGuess, track.name.toLowerCase());
      const albumSimA = compareTwoStrings(normalizedGuess, track.album.toLowerCase());
      if (similarity >= FUZZY_THRESHOLD && (titleSimA > similarity || albumSimA > similarity)) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'title': {
      const similarity = compareTwoStrings(normalizedGuess, track.name.toLowerCase());
      const artistSimT = bestNameSimilarity(normalizedGuess, track.artist);
      const albumSimT = compareTwoStrings(normalizedGuess, track.album.toLowerCase());
      if (similarity >= FUZZY_THRESHOLD && (artistSimT > similarity || albumSimT > similarity)) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'album': {
      const similarity = compareTwoStrings(normalizedGuess, track.album.toLowerCase());
      const artistSim = bestNameSimilarity(normalizedGuess, track.artist);
      const titleSim = compareTwoStrings(normalizedGuess, track.name.toLowerCase());
      if (similarity >= FUZZY_THRESHOLD && (artistSim > similarity || titleSim > similarity)) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    default:
      return { correct: false };
  }
}

// ── Movie-specific matching ──

function checkMovieAnswer(category: string, normalizedGuess: string, track: MediaItem & { mediaType: 'movie' }): MatchResult {
  switch (category) {
    case 'director': {
      const similarity = bestNameSimilarity(normalizedGuess, track.director);
      // Reject if guess looks more like the movie title or genre
      const titleSim = compareTwoStrings(normalizedGuess, track.title.toLowerCase());
      if (similarity >= FUZZY_THRESHOLD && titleSim > similarity) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'movie-title': {
      const similarity = compareTwoStrings(normalizedGuess, track.title.toLowerCase());
      const directorSim = bestNameSimilarity(normalizedGuess, track.director);
      if (similarity >= FUZZY_THRESHOLD && directorSim > similarity) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'genre': {
      const similarity = compareTwoStrings(normalizedGuess, track.genre.toLowerCase());
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    default:
      return { correct: false };
  }
}

// ── Main entry point ──

export function checkAnswer(
  category: string,
  guess: string,
  track: MediaItem
): MatchResult {
  const normalizedGuess = guess.trim().toLowerCase();

  // Year-based categories are shared
  switch (category) {
    case 'year':
      return checkYear(normalizedGuess, track.year);
    case 'year-approx':
      return checkYearApprox(normalizedGuess, track.year);
    case 'decade':
      return checkDecade(normalizedGuess, track.year);
  }

  // Media-type-specific categories
  if (isMovieTrack(track)) {
    return checkMovieAnswer(category, normalizedGuess, track);
  }

  // Default to music matching (handles both explicit music tracks and legacy tracks without mediaType)
  if (isMusicTrack(track)) {
    return checkMusicAnswer(category, normalizedGuess, track);
  }

  // Fallback for legacy Track objects without mediaType field
  // Cast to music track shape for backwards compatibility
  const legacyTrack = track as any;
  return checkMusicAnswer(category, normalizedGuess, {
    mediaType: 'music',
    id: legacyTrack.id,
    name: legacyTrack.name ?? '',
    artist: legacyTrack.artist ?? '',
    album: legacyTrack.album ?? '',
    year: legacyTrack.year ?? 0,
    previewUrl: legacyTrack.previewUrl ?? null,
    albumArt: legacyTrack.albumArt ?? '',
  });
}
