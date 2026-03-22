import type { BingoCell, GuessCategory, MediaType } from '@/types/game';
import { getGuessCategoriesForMode } from '@/types/game';

export function generateBingoCard(contentMode: MediaType | 'mixed' = 'music'): BingoCell[] {
  // 3x3 grid = 9 cells
  // Rules: at least 1 of each category, max 3 of any category
  const categories = getGuessCategoriesForMode(contentMode);
  const cells: BingoCell[] = [];
  const counts = new Map<GuessCategory, number>();
  for (const cat of categories) counts.set(cat, 0);

  // First, ensure at least 1 of each category
  const guaranteed = [...categories];
  shuffle(guaranteed);
  for (const cat of guaranteed) {
    cells.push({ category: cat, marked: false });
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }

  // Fill remaining cells randomly (up to 9), respecting max 3
  const remaining = 9 - cells.length;
  for (let i = 0; i < remaining; i++) {
    const available = categories.filter((c) => (counts.get(c) ?? 0) < 3);
    const cat = available[Math.floor(Math.random() * available.length)];
    cells.push({ category: cat, marked: false });
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
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

/**
 * Shuffle the category values among unmarked cells only.
 * Marked cells keep their categories unchanged.
 */
export function shuffleUnmarkedCategories(card: BingoCell[]): void {
  const unmarkedIndices = card
    .map((cell, i) => ({ cell, i }))
    .filter(({ cell }) => !cell.marked)
    .map(({ i }) => i);

  // Collect categories from unmarked cells, shuffle them, reassign
  const categories = unmarkedIndices.map((i) => card[i].category);
  shuffle(categories);
  for (let k = 0; k < unmarkedIndices.length; k++) {
    card[unmarkedIndices[k]].category = categories[k];
  }
}
