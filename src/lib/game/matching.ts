import { compareTwoStrings } from 'string-similarity';

const FUZZY_THRESHOLD = 0.4;

// Split "Artist ft. Other" into individual artist names
const FEAT_PATTERN = /\s+(?:ft\.?|feat\.?|featuring|&|,|and|x|vs\.?)\s+/i;

function bestArtistSimilarity(guess: string, artist: string): number {
  const fullSimilarity = compareTwoStrings(guess, artist.toLowerCase());
  // Also compare against each individual artist part
  const parts = artist.split(FEAT_PATTERN).map((p) => p.trim().toLowerCase()).filter(Boolean);
  let best = fullSimilarity;
  for (const part of parts) {
    const sim = compareTwoStrings(guess, part);
    if (sim > best) best = sim;
  }
  return best;
}

export function checkAnswer(
  category: string,
  guess: string,
  track: { name: string; artist: string; album: string; year: number }
): { correct: boolean; similarity?: number; bonusCategories?: string[] } {
  const normalizedGuess = guess.trim().toLowerCase();

  switch (category) {
    case 'year': {
      const guessedYear = parseInt(normalizedGuess, 10);
      if (isNaN(guessedYear)) return { correct: false };
      const isExact = guessedYear === track.year;
      return {
        correct: isExact,
        similarity: isExact ? 1 : 0,
        bonusCategories: isExact ? ['year-approx'] : undefined,
      };
    }
    case 'artist': {
      const similarity = bestArtistSimilarity(normalizedGuess, track.artist);
      // Reject if guess looks more like the title or album than the artist
      const titleSimA = compareTwoStrings(normalizedGuess, track.name.toLowerCase());
      const albumSimA = compareTwoStrings(normalizedGuess, track.album.toLowerCase());
      if (similarity >= FUZZY_THRESHOLD && (titleSimA > similarity || albumSimA > similarity)) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'title': {
      const similarity = compareTwoStrings(normalizedGuess, track.name.toLowerCase());
      // Reject if guess looks more like the artist or album than the title
      const artistSimT = bestArtistSimilarity(normalizedGuess, track.artist);
      const albumSimT = compareTwoStrings(normalizedGuess, track.album.toLowerCase());
      if (similarity >= FUZZY_THRESHOLD && (artistSimT > similarity || albumSimT > similarity)) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'album': {
      const similarity = compareTwoStrings(normalizedGuess, track.album.toLowerCase());
      // Reject if guess looks more like the artist or title than the album
      const artistSim = bestArtistSimilarity(normalizedGuess, track.artist);
      const titleSim = compareTwoStrings(normalizedGuess, track.name.toLowerCase());
      if (similarity >= FUZZY_THRESHOLD && (artistSim > similarity || titleSim > similarity)) {
        return { correct: false, similarity };
      }
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'year-approx': {
      const guessedYearApprox = parseInt(normalizedGuess, 10);
      if (isNaN(guessedYearApprox)) return { correct: false };
      const diffApprox = Math.abs(guessedYearApprox - track.year);
      const isExact = diffApprox === 0;
      return {
        correct: diffApprox <= 1,
        similarity: isExact ? 1 : diffApprox === 1 ? 0.5 : 0,
        bonusCategories: isExact ? ['year'] : undefined,
      };
    }
    case 'decade': {
      const guessedDecade = parseInt(normalizedGuess, 10);
      if (isNaN(guessedDecade)) return { correct: false };
      // Map guessed value to full decade: values < 30 → 2000s, >= 30 → 1900s
      const fullGuessedDecade = guessedDecade < 30 ? 2000 + guessedDecade : 1900 + guessedDecade;
      const trackDecade = Math.floor(track.year / 10) * 10;
      const isCorrect = fullGuessedDecade === trackDecade;
      return { correct: isCorrect, similarity: isCorrect ? 1 : 0 };
    }
    default:
      return { correct: false };
  }
}
