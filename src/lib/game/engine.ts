import type { RoomState, GamePhase, GuessResult, WheelCategory } from '@/types/game';
import { spinWheel, isGuessCategory, isPartyCategory } from './wheel';
import { checkAnswer } from './matching';
import { checkWin, countCompletedLines } from './bingo';
import { getNextTrack } from './room';

export interface GameEngine {
  room: RoomState;
  startGame: (tracks: import('@/types/game').Track[]) => void;
  doSpin: () => { category: WheelCategory; segmentIndex: number };
  startRound: () => import('@/types/game').Track | null;
  submitGuess: (playerId: string, guess: string) => GuessResult | null;
  approveLyrics: (playerId: string, approved: boolean) => GuessResult | null;
  endRound: () => void;
  checkForWinner: () => import('@/types/game').Player | null;
  getRandomPlayer: () => string | null;
}

export function createGameEngine(room: RoomState): GameEngine {
  return {
    room,

    startGame(tracks) {
      room.tracks = tracks;
      room.phase = 'SPINNING';
      room.roundNumber = 0;
      room.usedTrackIds = new Set();
      room.winner = null;
    },

    doSpin() {
      const { segment, index } = spinWheel();
      room.currentCategory = segment.category;

      if (isPartyCategory(segment.category)) {
        room.phase = 'DRINKING_SEGMENT';
      } else {
        room.phase = 'SPINNING'; // will transition to PLAYING after animation
      }

      return { category: segment.category, segmentIndex: index };
    },

    startRound() {
      const track = getNextTrack(room);
      if (!track) return null;

      room.currentTrack = track;
      room.roundNumber++;
      room.roundGuesses = [];
      room.timerSeconds = room.settings.timerDuration;
      room.phase = 'PLAYING';

      // Reset hasGuessed for all players (tracked per-guess on server)
      return track;
    },

    submitGuess(playerId: string, guess: string) {
      if (!room.currentTrack || !room.currentCategory) return null;
      if (!isGuessCategory(room.currentCategory)) return null;

      const player = room.players.find((p) => p.id === playerId);
      if (!player) return null;

      // Check if already guessed
      if (room.roundGuesses.some((g) => g.playerId === playerId)) return null;

      // Lyrics are judged manually
      if (room.currentCategory === 'lyrics') {
        const result: GuessResult = {
          playerId,
          playerName: player.name,
          guess,
          correct: false, // pending host approval
        };
        room.roundGuesses.push(result);
        return result;
      }

      const { correct, similarity } = checkAnswer(
        room.currentCategory,
        guess,
        room.currentTrack
      );

      const result: GuessResult = {
        playerId,
        playerName: player.name,
        guess,
        correct,
        similarity,
      };
      room.roundGuesses.push(result);

      // If correct, mark the player's bingo card
      if (correct) {
        const cellIndex = player.bingoCard.findIndex(
          (cell) => cell.category === room.currentCategory && !cell.marked
        );
        if (cellIndex !== -1) {
          player.bingoCard[cellIndex].marked = true;
          player.completedRows = countCompletedLines(player.bingoCard);
        }
      }

      return result;
    },

    approveLyrics(playerId: string, approved: boolean) {
      const guessEntry = room.roundGuesses.find((g) => g.playerId === playerId);
      if (!guessEntry) return null;

      guessEntry.correct = approved;

      if (approved) {
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          const cellIndex = player.bingoCard.findIndex(
            (cell) => cell.category === 'lyrics' && !cell.marked
          );
          if (cellIndex !== -1) {
            player.bingoCard[cellIndex].marked = true;
            player.completedRows = countCompletedLines(player.bingoCard);
          }
        }
      }

      return guessEntry;
    },

    endRound() {
      room.phase = 'ROUND_RESULTS';
    },

    checkForWinner() {
      for (const player of room.players) {
        if (checkWin(player.bingoCard, room.settings.winCondition)) {
          room.winner = player;
          room.phase = 'GAME_OVER';
          return player;
        }
      }
      return null;
    },

    getRandomPlayer() {
      const connected = room.players.filter((p) => p.connected);
      if (connected.length === 0) return null;
      return connected[Math.floor(Math.random() * connected.length)].name;
    },
  };
}
