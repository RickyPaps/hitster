'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameState } from '@/hooks/useGameState';
import { useGameStore } from '@/stores/gameStore';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import HostLobby from '@/components/host/HostLobby';
import WheelSpinner from '@/components/host/WheelSpinner';
import SongPlayer from '@/components/host/SongPlayer';
import RoundResults from '@/components/host/RoundResults';
import LyricsValidator from '@/components/host/LyricsValidator';
import DrinkingPrompt from '@/components/host/DrinkingPrompt';
import WinnerScreen from '@/components/host/WinnerScreen';
import Scoreboard from '@/components/host/Scoreboard';
import Timer from '@/components/shared/Timer';
import CategoryBadge from '@/components/shared/CategoryBadge';
import RoomCodeDisplay from '@/components/shared/RoomCodeDisplay';
import curatedTracks from '@/data/curated-tracks.json';
import type { Track } from '@/types/game';

export default function HostPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  useSocket();
  useGameState();

  const {
    phase, players, currentTrack, currentCategory,
    roundNumber, roundGuesses, settings, timerSeconds,
    winner, partyTarget, setConnection,
  } = useGameStore();

  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResultIndex, setWheelResultIndex] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);

  // Ensure connection state on mount
  useEffect(() => {
    const socket = getSocket();
    if (socket.id) {
      setConnection(roomCode, socket.id, 'Host', true);
    }
  }, [roomCode, setConnection]);

  const fetchTracks = async (): Promise<Track[]> => {
    if (settings.musicSource === 'playlist' && settings.playlistUrl) {
      try {
        const res = await fetch(`/api/spotify/playlist?url=${encodeURIComponent(settings.playlistUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.tracks && data.tracks.length > 0) return data.tracks;
        }
      } catch (e) {
        console.error('Failed to fetch playlist:', e);
      }
    }
    // Fallback to curated tracks
    return curatedTracks as Track[];
  };

  const handleStartGame = async () => {
    setLoading(true);
    const gameTracks = await fetchTracks();
    setTracks(gameTracks);

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_START_GAME, { tracks: gameTracks });
    setLoading(false);
  };

  const handleSpin = () => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_SPIN_WHEEL);

    // Listen for wheel result
    socket.once(SOCKET_EVENTS.GAME_WHEEL_RESULT, (data: { category: string; segmentIndex: number }) => {
      setWheelResultIndex(data.segmentIndex);
      setWheelSpinning(true);
    });
  };

  const handleSpinComplete = () => {
    setWheelSpinning(false);
    setWheelResultIndex(null);
  };

  const handleNextRound = () => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_NEXT_ROUND);
  };

  const handleLyricsDone = () => {
    handleNextRound();
  };

  const handleDrinkingContinue = () => {
    handleNextRound();
  };

  if (phase === 'LOBBY') {
    return <HostLobby onStartGame={handleStartGame} />;
  }

  if (phase === 'GAME_OVER' && winner) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-8">
        <WinnerScreen winner={winner} onPlayAgain={() => window.location.reload()} />
        <div className="mt-8 w-full max-w-md">
          <Scoreboard />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <RoomCodeDisplay code={roomCode} />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Round {roundNumber}
          </span>
        </div>
        {phase === 'PLAYING' && (
          <Timer seconds={timerSeconds} maxSeconds={settings.timerDuration} />
        )}
        {currentCategory && <CategoryBadge category={currentCategory} large />}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-full">
          {phase === 'SPINNING' && !wheelSpinning && (
            <div className="flex flex-col items-center gap-6">
              <WheelSpinner
                onSpinComplete={handleSpinComplete}
                isSpinning={wheelSpinning}
                resultIndex={wheelResultIndex}
              />
              <button
                onClick={handleSpin}
                className="py-4 px-12 rounded-xl font-bold text-lg text-white glow"
                style={{ background: 'var(--accent)' }}
              >
                SPIN!
              </button>
            </div>
          )}

          {phase === 'SPINNING' && wheelSpinning && (
            <WheelSpinner
              onSpinComplete={handleSpinComplete}
              isSpinning={wheelSpinning}
              resultIndex={wheelResultIndex}
            />
          )}

          {phase === 'PLAYING' && (
            <div className="flex flex-col items-center gap-6">
              <SongPlayer
                previewUrl={currentTrack?.previewUrl || null}
                albumArt={currentTrack?.albumArt}
              />
              <div className="text-center">
                <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                  {roundGuesses.length} / {players.length} guesses submitted
                </p>
              </div>
            </div>
          )}

          {phase === 'JUDGING' && (
            <LyricsValidator
              guesses={roundGuesses}
              onDone={handleLyricsDone}
            />
          )}

          {phase === 'ROUND_RESULTS' && (
            <RoundResults
              guesses={roundGuesses}
              track={currentTrack}
              category={currentCategory}
              onNextRound={handleNextRound}
            />
          )}

          {phase === 'DRINKING_SEGMENT' && currentCategory && (
            <DrinkingPrompt
              type={currentCategory as any}
              targetPlayer={partyTarget}
              onContinue={handleDrinkingContinue}
            />
          )}
        </div>
      </div>

      {/* Sidebar Scoreboard */}
      <div className="fixed right-4 top-4 w-64">
        <Scoreboard />
      </div>
    </div>
  );
}
