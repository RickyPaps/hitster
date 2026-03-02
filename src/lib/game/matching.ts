import { compareTwoStrings } from 'string-similarity';

const YEAR_TOLERANCE = 2;
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
      const diff = Math.abs(guessedYear - track.year);
      return { correct: diff <= YEAR_TOLERANCE, similarity: diff === 0 ? 1 : 1 - diff / 10 };
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
    case 'lyrics':
      // Lyrics are judged by host manually
      return { correct: false };
    default:
      return { correct: false };
  }
}
