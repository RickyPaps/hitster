import type { RoomState, GamePhase, GuessResult, WheelCategory } from '@/types/game';
import { getCategoryMediaType } from '@/types/game';
import { spinWheel, isGuessCategory, isPartyCategory } from './wheel';
import { checkAnswer } from './matching';
import { checkWin, countCompletedLines } from './bingo';
import { getNextTrack, getNextTrackByMediaType, shuffleTracks } from './room';

export interface GameEngine {
  room: RoomState;
  startGame: (tracks: import('@/types/game').Track[]) => void;
  doSpin: () => { category: WheelCategory; segmentIndex: number; mediaType?: import('@/types/game').MediaType | 'mixed' };
  startRound: () => import('@/types/game').Track | null;
  submitGuess: (playerId: string, guess: string) => GuessResult | null;
  endRound: () => void;
  checkForWinner: () => import('@/types/game').Player | null;
  getRandomPlayer: () => { id: string; name: string } | null;
}

export function createGameEngine(room: RoomState): GameEngine {
  // Track pre-picked by doSpin() in mixed mode so startRound() reuses it
  let prePickedTrack: import('@/types/game').Track | null = null;
  // Alternate media type for shared categories (year, decade) in mixed mode
  let nextSharedMediaType: import('@/types/game').MediaType = 'movie';

  return {
    room,

    startGame(tracks) {
      room.tracks = shuffleTracks(tracks);
      room.phase = 'SPINNING';
      room.roundNumber = 0;
      room.usedTrackIds = new Set();
      room.winner = null;
      prePickedTrack = null;
      nextSharedMediaType = 'movie';
    },

    doSpin() {
      // Determine media type for wheel segments based on content mode
      let wheelMode: import('@/types/game').MediaType | 'mixed' | undefined;
      const mode = room.settings.contentMode;
      if (mode === 'music' || mode === 'movie') {
        wheelMode = mode;
      } else if (mode === 'mixed') {
        wheelMode = 'mixed';
      }
      const { segment, index, mediaType: resolvedMediaType } = spinWheel(wheelMode);
      room.currentCategory = segment.category;

      // In mixed mode, determine required media type from the landed category
      // and pre-pick a track of the correct type
      if (mode === 'mixed' && isGuessCategory(segment.category)) {
        const requiredMediaType = getCategoryMediaType(segment.category);
        let nextTrack: import('@/types/game').Track | null = null;
        if (requiredMediaType) {
          // Category-specific: try matching media type, fall back to any
          nextTrack = getNextTrackByMediaType(room, requiredMediaType) ?? getNextTrack(room);
        } else {
          // Shared category (year, year-approx, decade): alternate between music and movie
          nextTrack = getNextTrackByMediaType(room, nextSharedMediaType) ?? getNextTrack(room);
          nextSharedMediaType = nextSharedMediaType === 'music' ? 'movie' : 'music';
        }
        if (nextTrack) {
          prePickedTrack = nextTrack;
          room.currentTrack = nextTrack;
        }
      } else if (mode === 'music' || mode === 'movie') {
        // Single-mode: pre-pick track as before (only needed for startRound)
      }

      // Phase stays SPINNING — client emits HOST_WHEEL_DONE after animation completes
      return { category: segment.category, segmentIndex: index, mediaType: resolvedMediaType };
    },

    startRound() {
      // In mixed mode, doSpin() pre-picks the track — reuse it instead of picking another
      const track = prePickedTrack ?? getNextTrack(room);
      prePickedTrack = null;
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

      const { correct, similarity, bonusCategories } = checkAnswer(
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
        bonusCategories,
      };
      room.roundGuesses.push(result);

      // Card marking is deferred to endRound/handleTimerEnd so players
      // don't see updates until results are revealed.

      return result;
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
      const player = connected[Math.floor(Math.random() * connected.length)];
      return { id: player.id, name: player.name };
    },
  };
}
