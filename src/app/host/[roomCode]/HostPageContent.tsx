'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useGameState } from '@/hooks/useGameState';
import { useGameStore } from '@/stores/gameStore';
import { getSocket, disconnectSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import HostLobby from '@/components/host/HostLobby';
import HostGameShell from '@/components/host/HostGameShell';
import WinnerScreen from '@/components/host/WinnerScreen';
import Scoreboard from '@/components/host/Scoreboard';
import curatedTracks from '@/data/curated-tracks.json';
import type { Track, TrackHistoryEntry } from '@/types/game';

export default function HostPageContent() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  useSocket();
  useGameState();

  const {
    phase, players, currentTrack, currentCategory,
    roundNumber, roundGuesses, settings, timerSeconds,
    winner, partyTarget, setConnection,
    currentSpinnerName,
  } = useGameStore();

  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResultIndex, setWheelResultIndex] = useState<number | null>(null);
  const [swipeVelocity, setSwipeVelocity] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [trackHistory, setTrackHistory] = useState<TrackHistoryEntry[]>([]);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);

  // Track the previous phase to detect transitions into ROUND_RESULTS
  const prevPhaseRef = useRef(phase);

  // Ensure connection state on mount
  useEffect(() => {
    const socket = getSocket();
    if (socket.id) {
      setConnection(roomCode, socket.id, 'Host', true);
    }
  }, [roomCode, setConnection]);

  // Persistent listener for GAME_WHEEL_RESULT
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { category: string; segmentIndex: number; swipeVelocity?: number }) => {
      setWheelResultIndex(data.segmentIndex);
      setSwipeVelocity(data.swipeVelocity);
      setWheelSpinning(true);
    };
    socket.on(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    };
  }, []);

  // Accumulate track history when entering ROUND_RESULTS
  useEffect(() => {
    if (phase === 'ROUND_RESULTS' && prevPhaseRef.current === 'PLAYING' && currentTrack && currentCategory) {
      const correctCount = roundGuesses.filter((g) => g.correct).length;
      setTrackHistory((prev) => [
        {
          track: currentTrack,
          category: currentCategory,
          roundNumber,
          correctCount,
          totalGuesses: roundGuesses.length,
        },
        ...prev,
      ]);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

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
    return curatedTracks as Track[];
  };

  const handleStartGame = async () => {
    setLoading(true);
    const gameTracks = await fetchTracks();

    const needPreview = gameTracks.filter(
      (t) => (!t.previewUrl || !t.albumArt) && t.id && !t.id.startsWith('c')
    );
    if (needPreview.length > 0) {
      try {
        const res = await fetch('/api/spotify/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trackIds: needPreview.map((t) => t.id) }),
        });
        if (res.ok) {
          const { previews, albumArts } = await res.json();
          for (const track of gameTracks) {
            if (previews?.[track.id]) {
              track.previewUrl = previews[track.id];
            }
            if (albumArts?.[track.id] && !track.albumArt) {
              track.albumArt = albumArts[track.id];
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch preview URLs:', e);
      }
    }

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_START_GAME, { tracks: gameTracks });
    setLoading(false);
  };

  const handleSpin = () => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_SPIN_WHEEL);
  };

  const handleSpinComplete = () => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_WHEEL_DONE);
  };

  // Reset wheel state when entering SPINNING phase (new round)
  useEffect(() => {
    if (phase === 'SPINNING') {
      setWheelSpinning(false);
      setWheelResultIndex(null);
      setSwipeVelocity(undefined);
    }
  }, [phase]);

  const handleNextRound = () => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_NEXT_ROUND);
  };

  const handleEndSession = () => {
    disconnectSocket();
    router.push('/');
  };

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    if (v > 0 && muted) setMuted(false);
  }, [muted]);

  const handleMuteToggle = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  // ── LOBBY: full-page view (already redesigned) ──
  if (phase === 'LOBBY') {
    return <HostLobby onStartGame={handleStartGame} loading={loading} />;
  }

  // ── GAME OVER: full-page view ──
  if (phase === 'GAME_OVER') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-8">
        {winner ? (
          <WinnerScreen winner={winner} onPlayAgain={() => window.location.reload()} />
        ) : (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              No more tracks!
            </h2>
            <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)' }}>
              All available songs have been played.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="py-3 px-8 rounded-xl font-bold text-white glow"
              style={{ background: 'var(--accent)' }}
            >
              Play Again
            </button>
          </div>
        )}
        <div className="mt-8 w-full max-w-md">
          <Scoreboard />
        </div>
      </div>
    );
  }

  // ── IN-GAME: three-column master layout ──
  return (
    <HostGameShell
      roomCode={roomCode}
      phase={phase}
      roundNumber={roundNumber}
      players={players}
      currentTrack={currentTrack}
      currentCategory={currentCategory}
      roundGuesses={roundGuesses}
      timerSeconds={timerSeconds}
      maxTimer={settings.timerDuration}
      currentSpinnerName={currentSpinnerName}
      partyTarget={partyTarget}
      trackHistory={trackHistory}
      wheelSpinning={wheelSpinning}
      wheelResultIndex={wheelResultIndex}
      swipeVelocity={swipeVelocity}
      volume={volume}
      muted={muted}
      onSpin={handleSpin}
      onSpinComplete={handleSpinComplete}
      onNextRound={handleNextRound}
      onEndSession={handleEndSession}
      onVolumeChange={handleVolumeChange}
      onMuteToggle={handleMuteToggle}
    />
  );
}
