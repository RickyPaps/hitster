import type { RoomState, GamePhase, GuessResult, WheelCategory } from '@/types/game';
import { spinWheel, isGuessCategory, isPartyCategory } from './wheel';
import { checkAnswer } from './matching';
import { checkWin, countCompletedLines } from './bingo';
import { getNextTrack } from './room';

export interface GameEngine {
  room: RoomState;
  startGame: (tracks: import('@/types/game').Track[]) => void;
  doSpin: () => { category: WheelCategory; segmentIndex: number; mediaType?: import('@/types/game').MediaType };
  startRound: () => import('@/types/game').Track | null;
  submitGuess: (playerId: string, guess: string) => GuessResult | null;
  endRound: () => void;
  checkForWinner: () => import('@/types/game').Player | null;
  getRandomPlayer: () => { id: string; name: string } | null;
}

export function createGameEngine(room: RoomState): GameEngine {
  // Track pre-picked by doSpin() in mixed mode so startRound() reuses it
  let prePickedTrack: import('@/types/game').Track | null = null;

  return {
    room,

    startGame(tracks) {
      room.tracks = tracks;
      room.phase = 'SPINNING';
      room.roundNumber = 0;
      room.usedTrackIds = new Set();
      room.winner = null;
      prePickedTrack = null;
    },

    doSpin() {
      // Determine media type for wheel segments based on content mode
      let mediaType: import('@/types/game').MediaType | undefined;
      const mode = room.settings.contentMode;
      if (mode === 'music' || mode === 'movie') {
        mediaType = mode;
      } else if (mode === 'mixed') {
        // In mixed mode, pre-pick the next track so we know its media type
        // before the wheel spins. startRound() will reuse this pre-picked track.
        const nextTrack = getNextTrack(room);
        if (nextTrack) {
          prePickedTrack = nextTrack;
          room.currentTrack = nextTrack;
          mediaType = nextTrack.mediaType;
        }
      }
      const { segment, index, mediaType: resolvedMediaType } = spinWheel(mediaType);
      room.currentCategory = segment.category;
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
