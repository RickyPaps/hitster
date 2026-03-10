import { compareTwoStrings } from 'string-similarity';

const FUZZY_THRESHOLD = 0.4;

export function checkAnswer(
  category: string,
  guess: string,
  track: { name: string; artist: string; album: string; year: number }
): { correct: boolean; similarity?: number } {
  const normalizedGuess = guess.trim().toLowerCase();

  switch (category) {
    case 'year': {
      const guessedYear = parseInt(normalizedGuess, 10);
      if (isNaN(guessedYear)) return { correct: false };
      return { correct: guessedYear === track.year, similarity: guessedYear === track.year ? 1 : 0 };
    }
    case 'artist': {
      const similarity = compareTwoStrings(normalizedGuess, track.artist.toLowerCase());
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'title': {
      const similarity = compareTwoStrings(normalizedGuess, track.name.toLowerCase());
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'album': {
      const similarity = compareTwoStrings(normalizedGuess, track.album.toLowerCase());
      return { correct: similarity >= FUZZY_THRESHOLD, similarity };
    }
    case 'year-approx': {
      const guessedYearApprox = parseInt(normalizedGuess, 10);
      if (isNaN(guessedYearApprox)) return { correct: false };
      const diffApprox = Math.abs(guessedYearApprox - track.year);
      return { correct: diffApprox <= 3, similarity: diffApprox === 0 ? 1 : 1 - diffApprox / 10 };
    }
    default:
      return { correct: false };
  }
}
