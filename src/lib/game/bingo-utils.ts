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

/** Returns players who are exactly 1 cell away from completing any line */
export function getNearBingoPlayers(players: Player[]): Player[] {
  return players.filter((p) => getBingoProximity(p) === 1);
}
