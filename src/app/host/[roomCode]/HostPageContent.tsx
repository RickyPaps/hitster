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
import SurpriseEventOverlay from '@/components/host/SurpriseEventOverlay';
import curatedTracks from '@/data/curated-tracks.json';
import curatedMovies from '@/data/curated-movies.json';
import type { Track, TrackHistoryEntry, SurpriseEventType, MusicTrack, MovieTrack, MediaType } from '@/types/game';
import { isMovieTrack } from '@/types/game';
import { useAudio } from '@/hooks/useAudio';

export default function HostPageContent() {
  const params = useParams();
  const router = useRouter();
  const roomCode = params.roomCode as string;
  useSocket();
  useGameState();

  const {
    phase, players, currentTrack, currentCategory,
    roundNumber, roundGuesses, settings, timerSeconds,
    winner, setConnection,
    currentSpinnerName,
  } = useGameStore();

  const [wheelSpinning, setWheelSpinning] = useState(false);
  const [wheelResultIndex, setWheelResultIndex] = useState<number | null>(null);
  const [swipeVelocity, setSwipeVelocity] = useState<number | undefined>(undefined);
  const [wheelMediaType, setWheelMediaType] = useState<MediaType | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [trackHistory, setTrackHistory] = useState<TrackHistoryEntry[]>([]);
  const [volume, setVolume] = useState(70);
  const [muted, setMuted] = useState(false);
  const [surpriseEvent, setSurpriseEvent] = useState<{ type: SurpriseEventType; targetName: string | null } | null>(null);
  const { playSound } = useAudio();

  // Track the previous phase to detect transitions into ROUND_RESULTS
  const prevPhaseRef = useRef(phase);

  // Ensure connection state on mount
  useEffect(() => {
    const socket = getSocket();
    if (socket.id) {
      setConnection(roomCode, socket.id, 'Host', true);
    }
  }, [roomCode, setConnection]);

  // Reset store on navigation away
  useEffect(() => {
    return () => {
      useGameStore.getState().reset();
    };
  }, []);

  // Persistent listener for GAME_WHEEL_RESULT
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { category: string; segmentIndex: number; swipeVelocity?: number; mediaType?: MediaType }) => {
      setWheelResultIndex(data.segmentIndex);
      setSwipeVelocity(data.swipeVelocity);
      setWheelMediaType(data.mediaType);
      setWheelSpinning(true);
    };
    socket.on(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    return () => {
      socket.off(SOCKET_EVENTS.GAME_WHEEL_RESULT, handler);
    };
  }, []);

  // Listen for surprise events
  useEffect(() => {
    const socket = getSocket();
    const handler = (data: { type: SurpriseEventType; targetName: string | null }) => {
      playSound('surprise');
      setSurpriseEvent(data);
    };
    socket.on(SOCKET_EVENTS.SURPRISE_EVENT, handler);
    return () => {
      socket.off(SOCKET_EVENTS.SURPRISE_EVENT, handler);
    };
  }, [playSound]);

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
    const contentMode = settings.contentMode ?? 'music';

    // Fetch music tracks (from playlist or curated)
    const fetchMusicTracks = async (): Promise<Track[]> => {
      if (settings.musicSource === 'playlist' && settings.playlistUrl) {
        try {
          const res = await fetch(`/api/spotify/playlist?url=${encodeURIComponent(settings.playlistUrl)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.tracks && data.tracks.length > 0) {
              // Ensure mediaType is set on playlist tracks
              return data.tracks.map((t: any) => ({ ...t, mediaType: 'music' as const }));
            }
          }
        } catch (e) {
          console.error('Failed to fetch playlist:', e);
        }
      }
      // Default: curated music tracks (add mediaType if missing)
      return (curatedTracks as any[]).map((t) => ({ ...t, mediaType: 'music' as const })) as MusicTrack[];
    };

    // Fetch movie tracks (curated for now, skip entries without Spotify IDs)
    const fetchMovieTracks = (): Track[] => {
      return (curatedMovies as MovieTrack[]).filter((m) => m.id);
    };

    if (contentMode === 'music') {
      return fetchMusicTracks();
    }
    if (contentMode === 'movie') {
      return fetchMovieTracks();
    }
    // Mixed: combine both sets
    const [music, movies] = await Promise.all([fetchMusicTracks(), Promise.resolve(fetchMovieTracks())]);
    return [...music, ...movies];
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

    // Fetch trailer video IDs for movies that don't have one yet
    const moviesNeedingTrailer = gameTracks.filter(
      (t): t is MovieTrack => isMovieTrack(t) && !t.trailerVideoId
    );
    if (moviesNeedingTrailer.length > 0) {
      try {
        const res = await fetch('/api/tmdb/trailers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movies: moviesNeedingTrailer.map((m) => ({ title: m.title, year: m.year })),
          }),
        });
        if (res.ok) {
          const { trailers } = await res.json() as { trailers: Record<string, string> };
          for (const track of gameTracks) {
            if (isMovieTrack(track) && !track.trailerVideoId) {
              const key = `${track.title}|${track.year}`;
              if (trailers[key]) {
                track.trailerVideoId = trailers[key];
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch trailer IDs:', e);
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
      setWheelMediaType(undefined);
    }
  }, [phase]);

  // Play win fanfare when game ends with a winner
  useEffect(() => {
    if (winner) {
      playSound('win');
    }
  }, [winner, playSound]);

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

  const handlePlayAgain = () => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_PLAY_AGAIN);
  };

  const surpriseOverlay = (
    <SurpriseEventOverlay
      event={surpriseEvent}
      onComplete={() => setSurpriseEvent(null)}
    />
  );

  // ── GAME OVER: full-page view with disco atmosphere ──
  if (phase === 'GAME_OVER') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {surpriseOverlay}
        {/* Disco background */}
        <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: '#0d0216' }}>
          <div className="disco-grid-bg absolute inset-0 opacity-20" />
          <div
            className="absolute rounded-full"
            style={{
              top: '-10%', left: '-10%', width: '40%', height: '40%',
              background: 'rgba(188, 19, 254, 0.2)', filter: 'blur(120px)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: '-10%', right: '-10%', width: '40%', height: '40%',
              background: 'rgba(188, 19, 254, 0.1)', filter: 'blur(120px)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
          {winner ? (
            <WinnerScreen winner={winner} players={players} onPlayAgain={handlePlayAgain} />
          ) : (
            <div className="text-center glass-panel-purple rounded-2xl p-8 w-full">
              <h2
                className="text-3xl font-bold mb-2 uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-display)', color: 'white', textShadow: '0 0 15px rgba(217, 70, 239, 0.6)' }}
              >
                No More Tracks!
              </h2>
              <p className="text-base mb-6" style={{ color: 'rgba(148, 163, 184, 0.8)' }}>
                All available songs have been played.
              </p>
              <button
                onClick={handlePlayAgain}
                className="py-3 px-8 rounded-xl font-bold text-white cursor-pointer uppercase tracking-wider"
                style={{
                  background: 'linear-gradient(135deg, #ff007f, #bc13fe)',
                  boxShadow: '0 0 20px rgba(255, 0, 127, 0.4)',
                }}
              >
                Play Again
              </button>
            </div>
          )}
          <div className="mt-8 w-full">
            <Scoreboard />
          </div>
        </div>
      </div>
    );
  }

  // ── IN-GAME: three-column master layout ──
  return (
    <>
    {surpriseOverlay}
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
      winCondition={settings.winCondition}
      currentSpinnerName={currentSpinnerName}
      trackHistory={trackHistory}
      wheelSpinning={wheelSpinning}
      wheelResultIndex={wheelResultIndex}
      swipeVelocity={swipeVelocity}
      wheelMediaType={wheelMediaType}
      volume={volume}
      muted={muted}
      onSpin={handleSpin}
      onSpinComplete={handleSpinComplete}
      onNextRound={handleNextRound}
      onEndSession={handleEndSession}
      onVolumeChange={handleVolumeChange}
      onMuteToggle={handleMuteToggle}
    />
    </>
  );
}
