import type { Player } from '@/types/game';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

/** Returns the minimum number of unmarked cells needed to complete any line */
export function getBingoProximity(player: Player): number {
  let minRemaining = 3;
  for (const line of LINES) {
    const unmarked = line.filter((i) => !player.bingoCard[i]?.marked).length;
    if (unmarked < minRemaining) {
      minRemaining = unmarked;
    }
  }
  return minRemaining;
}

/**
 * Returns players who are close to winning based on the win condition.
 * - winCondition 1 (1 line): 1 cell away from any line
 * - winCondition 2 (2 lines): have 1 line, and 1 cell away from a second
 * - winCondition 9 (full card): 1 cell away from full card (8 of 9 marked)
 */
export function getNearBingoPlayers(players: Player[], winCondition: 1 | 2 | 9 = 1): Player[] {
  if (winCondition === 9) {
    // Full card: 1 unmarked cell remaining
    return players.filter((p) => {
      const unmarked = p.bingoCard.filter((c) => !c.marked).length;
      return unmarked === 1;
    });
  }

  if (winCondition === 2) {
    // 2 lines: already have 1+ completed lines AND 1 cell from another
    return players.filter((p) => {
      const completedLines = LINES.filter((line) => line.every((i) => p.bingoCard[i]?.marked)).length;
      if (completedLines < 1) return false;
      // Check if there's an incomplete line with only 1 unmarked cell
      const nearLines = LINES.filter((line) => {
        const unmarked = line.filter((i) => !p.bingoCard[i]?.marked).length;
        return unmarked === 1;
      }).length;
      // nearLines includes already-completed lines (0 unmarked), so check for lines beyond completed
      return nearLines > completedLines;
    });
  }

  // winCondition 1: 1 cell away from any line
  return players.filter((p) => getBingoProximity(p) === 1);
}
