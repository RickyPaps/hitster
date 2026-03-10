import type { BingoCell, GuessCategory } from '@/types/game';

const GUESS_CATEGORIES: GuessCategory[] = ['year', 'artist', 'title', 'year-approx', 'album', 'decade'];

export function generateBingoCard(): BingoCell[] {
  // 3x3 grid = 9 cells
  // Rules: at least 1 of each category, max 3 of any category
  const cells: BingoCell[] = [];
  const counts: Record<GuessCategory, number> = {
    year: 0, artist: 0, title: 0, 'year-approx': 0, album: 0, decade: 0,
  };

  // First, ensure at least 1 of each (6 cells)
  const guaranteed = [...GUESS_CATEGORIES];
  shuffle(guaranteed);
  for (const cat of guaranteed) {
    cells.push({ category: cat, marked: false });
    counts[cat]++;
  }

  // Fill remaining 3 cells randomly, respecting max 3
  for (let i = 0; i < 3; i++) {
    const available = GUESS_CATEGORIES.filter((c) => counts[c] < 3);
    const cat = available[Math.floor(Math.random() * available.length)];
    cells.push({ category: cat, marked: false });
    counts[cat]++;
  }

  // Shuffle the full 9-cell array
  shuffle(cells);
  return cells;
}

export function checkWin(card: BingoCell[], winCondition: number): boolean {
  const completedLines = countCompletedLines(card);
  if (winCondition === 9) {
    // Full card: all 9 cells marked
    return card.every((cell) => cell.marked);
  }
  return completedLines >= winCondition;
}

export function countCompletedLines(card: BingoCell[]): number {
  // 3x3 grid stored as flat array (row-major)
  // Rows: [0,1,2], [3,4,5], [6,7,8]
  // Cols: [0,3,6], [1,4,7], [2,5,8]
  // Diags: [0,4,8], [2,4,6]
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diagonals
  ];

  let count = 0;
  for (const line of lines) {
    if (line.every((i) => card[i]?.marked)) {
      count++;
    }
  }
  return count;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
