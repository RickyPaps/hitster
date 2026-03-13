'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import type { GamePhase, Player, Track, WheelCategory, GuessResult, TrackHistoryEntry, MediaType } from '@/types/game';
import { ALL_WHEEL_SEGMENTS, getWheelSegments, isMovieTrack } from '@/types/game';
import HostTopNav from './HostTopNav';
import HostLeftSidebar from './HostLeftSidebar';
import Leaderboard from './Leaderboard';
import MobileActionBar from './MobileActionBar';
import WheelSpinner from './WheelSpinner';
import RoundResults from './RoundResults';
import DrinkingPrompt from './DrinkingPrompt';
import RoundAnnouncer from '@/components/animations/RoundAnnouncer';

const SongPlayer = dynamic(() => import('./SongPlayer'), { ssr: false });
const TrailerPlayer = dynamic(() => import('./TrailerPlayer'), { ssr: false });

const PHASE_VARIANTS: Record<string, {
  initial: Record<string, number>;
  animate: Record<string, number>;
  exit: Record<string, number>;
  transition?: object;
  exitTransition?: object;
}> = {
  SPINNING: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1 },
    transition: { duration: 0.3, ease: 'easeOut' },
    exitTransition: { duration: 0.2, ease: 'easeIn' },
  },
  PLAYING: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1 },
    transition: { duration: 0.3, ease: 'easeOut' },
    exitTransition: { duration: 0.2, ease: 'easeIn' },
  },
  ROUND_RESULTS: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1 },
    transition: { duration: 0.4, ease: 'easeOut' },
    exitTransition: { duration: 0.2, ease: 'easeIn' },
  },
  DRINKING_SEGMENT: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1 },
    transition: { duration: 0.3, ease: 'easeOut' },
    exitTransition: { duration: 0.2, ease: 'easeIn' },
  },
};

interface HostGameShellProps {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number;
  players: Player[];
  currentTrack: Track | null;
  currentCategory: WheelCategory | null;
  roundGuesses: GuessResult[];
  timerSeconds: number;
  maxTimer: number;
  winCondition: 1 | 2 | 9;
  currentSpinnerName: string | null;
  trackHistory: TrackHistoryEntry[];
  wheelSpinning: boolean;
  wheelResultIndex: number | null;
  swipeVelocity?: number;
  wheelMediaType?: MediaType | 'mixed';
  volume: number;
  muted: boolean;
  onSpin: () => void;
  onSpinComplete: () => void;
  onNextRound: () => void;
  onEndSession: () => void;
  onVolumeChange: (v: number) => void;
  onMuteToggle: () => void;
}

export default function HostGameShell(props: HostGameShellProps) {
  const {
    roomCode, phase, roundNumber, players, currentTrack, currentCategory,
    roundGuesses, timerSeconds, maxTimer, winCondition, currentSpinnerName,
    trackHistory, wheelSpinning, wheelResultIndex, swipeVelocity, wheelMediaType,
    volume, muted,
    onSpin, onSpinComplete, onNextRound, onEndSession, onVolumeChange, onMuteToggle,
  } = props;

  const [showMobileLeaderboard, setShowMobileLeaderboard] = useState(false);
  const [showRoundAnnounce, setShowRoundAnnounce] = useState(false);
  const prevPhaseRef = useRef<GamePhase | null>(null);

  // Trigger round announcer on phase transition to PLAYING
  useEffect(() => {
    if (phase === 'PLAYING' && prevPhaseRef.current && prevPhaseRef.current !== 'PLAYING') {
      setShowRoundAnnounce(true);
      const t = setTimeout(() => setShowRoundAnnounce(false), 1500);
      return () => clearTimeout(t);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  return (
    <div className="host-game-grid">
      {/* Background atmosphere */}
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

      {/* Top Nav — row 1, all columns */}
      <HostTopNav
        roomCode={roomCode}
        phase={phase}
        roundNumber={roundNumber}
        playerCount={players.length}
        timerSeconds={timerSeconds}
        volume={volume}
        muted={muted}
        onEndSession={onEndSession}
        onToggleLeaderboard={() => setShowMobileLeaderboard((v) => !v)}
        onVolumeChange={onVolumeChange}
        onMuteToggle={onMuteToggle}
      />

      {/* Left Sidebar — row 2, col 1 */}
      <HostLeftSidebar
        phase={phase}
        currentSpinnerName={currentSpinnerName}
        wheelSpinning={wheelSpinning}
        trackHistory={trackHistory}
        playerCount={players.length}
        onSpin={onSpin}
        onNextRound={onNextRound}
      />

      {/* Center Content — row 2, col 2 */}
      <div className="host-center-content relative z-10 p-6 flex-col">
        {/* Mobile action bar — hidden on lg+ */}
        <MobileActionBar
          phase={phase}
          currentSpinnerName={currentSpinnerName}
          wheelSpinning={wheelSpinning}
          onSpin={onSpin}
          onNextRound={onNextRound}
        />

        <div className="flex-1 flex items-center justify-center w-full">
          <AnimatePresence mode="wait">
            <CenterContent
              phase={phase}
              currentTrack={currentTrack}
              currentCategory={currentCategory}
              roundGuesses={roundGuesses}
              players={players}
              roundNumber={roundNumber}
              currentSpinnerName={currentSpinnerName}
              wheelSpinning={wheelSpinning}
              wheelResultIndex={wheelResultIndex}
              swipeVelocity={swipeVelocity}
              wheelMediaType={wheelMediaType}
              timerSeconds={timerSeconds}
              maxTimer={maxTimer}
              showRoundAnnounce={showRoundAnnounce}
              onSpinComplete={onSpinComplete}
              onNextRound={onNextRound}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Right Sidebar — row 2, col 3 */}
      <Leaderboard players={players} winCondition={winCondition} />

      {/* Mobile Leaderboard Overlay */}
      {showMobileLeaderboard && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowMobileLeaderboard(false)}
          />
          {/* Panel */}
          <div
            className="absolute top-0 right-0 h-full w-80 max-w-[85vw] overflow-y-auto mobile-leaderboard-panel"
            style={{ background: '#0d0216' }}
          >
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <span className="text-sm font-bold text-white uppercase tracking-wide">Leaderboard</span>
              <button
                onClick={() => setShowMobileLeaderboard(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
                style={{ background: 'rgba(255, 255, 255, 0.1)' }}
              >
                <span className="text-gray-300">&#10005;</span>
              </button>
            </div>
            <Leaderboard players={players} winCondition={winCondition} />
          </div>
        </div>
      )}

      {/* Round transition announcer */}
      <RoundAnnouncer roundNumber={roundNumber} trigger={showRoundAnnounce} />
    </div>
  );
}

/* ── Center content renders phase-specific UI ── */
interface CenterContentProps {
  phase: GamePhase;
  currentTrack: Track | null;
  currentCategory: WheelCategory | null;
  roundGuesses: GuessResult[];
  players: Player[];
  roundNumber: number;
  currentSpinnerName: string | null;
  wheelSpinning: boolean;
  wheelResultIndex: number | null;
  swipeVelocity?: number;
  wheelMediaType?: MediaType | 'mixed';
  timerSeconds: number;
  maxTimer: number;
  showRoundAnnounce: boolean;
  onSpinComplete: () => void;
  onNextRound: () => void;
}

function CenterContent({
  phase, currentTrack, currentCategory, roundGuesses, players, roundNumber,
  currentSpinnerName, wheelSpinning, wheelResultIndex, swipeVelocity, wheelMediaType,
  timerSeconds, maxTimer, showRoundAnnounce,
  onSpinComplete, onNextRound,
}: CenterContentProps) {
  // Memoize startAt per track so re-renders don't restart the video
  const trailerStartAt = useMemo(
    () => Math.floor(Math.random() * 30),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentTrack?.id]
  );

  const v = PHASE_VARIANTS[phase] || PHASE_VARIANTS.SPINNING;
  const announceDelay = showRoundAnnounce && phase === 'PLAYING';

  const wrapPhase = (key: string, children: React.ReactNode) => (
    <motion.div
      key={key}
      initial={v.initial}
      animate={{
        ...v.animate,
        transition: announceDelay
          ? { ...v.transition, delay: 1.4 }
          : v.transition,
      }}
      exit={{ ...v.exit, transition: v.exitTransition }}
      style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
    >
      {children}
    </motion.div>
  );

  if (phase === 'SPINNING') {
    return wrapPhase('SPINNING',
      <div className="flex flex-col items-center gap-4 relative">
        {/* Pointer above wheel */}
        <div className="flex flex-col items-center">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'white', boxShadow: '0 0 30px rgba(255, 255, 255, 0.8)' }}
          >
            <span className="text-xl font-black" style={{ color: '#0d0216' }}>&#9660;</span>
          </div>
          <div className="w-0.5 h-6" style={{ background: 'linear-gradient(to bottom, white, transparent)' }} />
        </div>

        <WheelSpinner
          onSpinComplete={onSpinComplete}
          isSpinning={wheelSpinning}
          resultIndex={wheelResultIndex}
          swipeVelocity={swipeVelocity}
          segments={wheelMediaType ? getWheelSegments(wheelMediaType) : undefined}
        />

        {/* Call to action below wheel */}
        <div className="mt-6 text-center">
          <h1
            className="text-2xl sm:text-4xl font-black text-white uppercase italic mb-2"
            style={{
              letterSpacing: '-0.02em',
              textShadow: '0 0 10px rgba(255, 0, 127, 0.5)',
            }}
          >
            Spin the Wheel!
          </h1>
          <p
            className="text-sm font-bold uppercase"
            style={{ color: '#00f2ff', letterSpacing: '0.3em' }}
          >
            {currentSpinnerName
              ? `Waiting for ${currentSpinnerName}`
              : 'Waiting for Host Command'}
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'PLAYING') {
    const categoryLabel = currentCategory
      ? ALL_WHEEL_SEGMENTS.find((s) => s.category === currentCategory)?.label ?? currentCategory
      : 'UNKNOWN';

    const isMovie = currentTrack && isMovieTrack(currentTrack);
    const hasTrailer = isMovie && currentTrack.trailerVideoId;

    // Movie trailer layout: neon title + hero video with overlapping timer
    if (hasTrailer) {
      const timerColor = timerSeconds <= 10 ? '#ff007f' : '#bc13fe';
      const timerGlow = timerSeconds <= 10
        ? '0 0 20px rgba(255, 0, 127, 0.6), 0 0 40px rgba(255, 0, 127, 0.3)'
        : '0 0 20px rgba(188, 19, 254, 0.6), 0 0 40px rgba(188, 19, 254, 0.3)';

      return wrapPhase('PLAYING',
        <div className="flex flex-col items-center w-full max-w-5xl">
          {/* Neon category title */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic text-center mb-4"
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              background: 'linear-gradient(90deg, #00f2ff, #ff007f, #bc13fe)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 20px rgba(0, 242, 255, 0.4)) drop-shadow(0 0 40px rgba(188, 19, 254, 0.3))',
            }}
          >
            Guess the {categoryLabel}!
          </h1>

          {/* Guess count */}
          <p className="text-sm text-gray-400 mb-4">
            {roundGuesses.length} / {players.length} guesses submitted
          </p>

          {/* Video frame with neon border + overlapping timer */}
          <div className="relative w-full">
            {/* Neon glow behind the frame */}
            <div
              className="absolute -inset-1 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #00f2ff, #ff007f, #bc13fe, #00f2ff)',
                filter: 'blur(8px)',
                opacity: 0.6,
              }}
            />

            {/* Neon border frame */}
            <div
              className="relative rounded-2xl p-[3px]"
              style={{
                background: 'linear-gradient(135deg, #00f2ff, #ff007f, #bc13fe, #00f2ff)',
              }}
            >
              <div className="rounded-[13px] overflow-hidden bg-black">
                <TrailerPlayer
                  videoId={currentTrack.trailerVideoId!}
                  startAt={trailerStartAt}
                  clipDuration={30}
                  showControls={false}
                />
              </div>
            </div>

            {/* Overlapping timer circle — bottom right */}
            <div
              className="absolute -bottom-6 -right-6 z-30 flex items-center justify-center"
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(13, 2, 22, 0.95) 60%, rgba(13, 2, 22, 0.8) 100%)',
                border: `3px solid ${timerColor}`,
                boxShadow: timerGlow,
              }}
            >
              <svg width="70" height="70" className="absolute rotate-[-90deg]">
                <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle
                  cx="35" cy="35" r="30"
                  fill="none"
                  stroke={timerColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - (maxTimer > 0 ? timerSeconds / maxTimer : 0))}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                />
              </svg>
              <span
                className={`font-black text-lg tabular-nums ${timerSeconds <= 10 ? 'animate-pulse' : ''}`}
                style={{ color: timerColor }}
              >
                0:{timerSeconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Standard music/non-trailer layout
    return wrapPhase('PLAYING',
      <div className="flex flex-col items-center gap-8 w-full max-w-4xl">
        {/* Glowing challenge card */}
        <div className="w-full relative group">
          {/* Outer glow */}
          <div className="absolute -inset-1 rounded-2xl challenge-card-glow transition-opacity duration-1000 group-hover:opacity-60" />

          {/* Card content */}
          <div className="relative px-4 py-8 sm:px-8 sm:py-12 challenge-card rounded-2xl flex flex-col items-center text-center">
            <div className="phase-pill mb-6">Current Challenge</div>

            <h1
              className="text-3xl sm:text-5xl md:text-6xl font-black uppercase italic leading-tight mb-4"
              style={{
                color: '#00f2ff',
                letterSpacing: '-0.02em',
                filter: 'drop-shadow(0 0 15px rgba(0, 242, 255, 0.6))',
              }}
            >
              Guess the {categoryLabel}!
            </h1>

            <p className="text-gray-300 text-lg font-medium max-w-md mb-2">
              {isMovie ? 'Listen to the soundtrack' : 'Listen closely to the track'} and identify its {
                currentCategory === 'year' || currentCategory === 'year-approx' ? 'release date'
                : currentCategory === 'artist' ? 'artist'
                : currentCategory === 'title' ? 'title'
                : currentCategory === 'album' ? 'album'
                : currentCategory === 'director' ? 'director'
                : currentCategory === 'movie-title' ? 'movie title'
                : currentCategory === 'genre' ? 'genre'
                : currentCategory === 'decade' ? 'decade'
                : 'answer'
              }.
            </p>

            {/* Countdown timer */}
            <div className="flex items-center justify-center gap-6 mt-4 mb-1">
              <div className="relative flex items-center justify-center">
                {/* Circular progress ring */}
                <svg width="72" height="72" className="rotate-[-90deg]">
                  <circle
                    cx="36" cy="36" r="30"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="36" cy="36" r="30"
                    fill="none"
                    stroke={timerSeconds <= 10 ? '#ff007f' : '#00f2ff'}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - (maxTimer > 0 ? timerSeconds / maxTimer : 0))}
                    style={{
                      transition: 'stroke-dashoffset 1s linear, stroke 0.3s',
                      filter: timerSeconds <= 10
                        ? 'drop-shadow(0 0 6px rgba(255, 0, 127, 0.8))'
                        : 'drop-shadow(0 0 6px rgba(0, 242, 255, 0.5))',
                    }}
                  />
                </svg>
                <span
                  className={`absolute font-black text-xl tabular-nums ${timerSeconds <= 10 ? 'animate-pulse' : ''}`}
                  style={{ color: timerSeconds <= 10 ? '#ff007f' : '#00f2ff' }}
                >
                  {timerSeconds}
                </span>
              </div>
            </div>

            <div className="text-sm text-gray-400 mt-2">
              {roundGuesses.length} / {players.length} guesses submitted
            </div>
          </div>
        </div>

        {/* Media player below the card — audio for music */}
        {currentTrack?.previewUrl ? (
          <SongPlayer
            previewUrl={currentTrack.previewUrl}
            albumArt={currentTrack.albumArt}
          />
        ) : (
          <div className="text-center p-6 rounded-xl" style={{ background: 'rgba(75, 32, 56, 0.3)', border: '1px solid rgba(0, 242, 255, 0.2)' }}>
            <p className="text-4xl mb-3">&#9835;</p>
            <p className="font-bold text-lg text-white">No audio available</p>
            <p className="text-sm mt-1 text-gray-400">Play the {isMovie ? 'soundtrack' : 'song'} from your own device!</p>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'ROUND_RESULTS') {
    return wrapPhase('ROUND_RESULTS',
      <RoundResults
        guesses={roundGuesses}
        track={currentTrack}
        category={currentCategory}
        roundNumber={roundNumber}
        players={players}
        onNextRound={onNextRound}
      />
    );
  }

  if (phase === 'DRINKING_SEGMENT' && currentCategory) {
    return wrapPhase('DRINKING_SEGMENT',
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
        <DrinkingPrompt
          type={currentCategory as 'everybody-drinks' | 'rock-off'}
          isMovie={currentTrack?.mediaType === 'movie'}
          onContinue={onNextRound}
        />
        {currentCategory === 'rock-off' && currentTrack && isMovieTrack(currentTrack) && currentTrack.trailerVideoId ? (
          <TrailerPlayer videoId={currentTrack.trailerVideoId} clipDuration={30} />
        ) : currentCategory === 'rock-off' && currentTrack?.previewUrl ? (
          <SongPlayer
            previewUrl={currentTrack.previewUrl}
            albumArt={currentTrack.albumArt}
          />
        ) : null}
        {currentCategory === 'rock-off' && roundGuesses.length > 0 && (
          <RockOffResults guesses={roundGuesses} />
        )}
      </div>
    );
  }

  return null;
}

/* ── Rock-off buzz results ── */
function RockOffResults({ guesses }: { guesses: GuessResult[] }) {
  const winner = guesses.find((g) => g.correct);
  const suffix = (n: number) => (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

  return (
    <div className="w-full mt-2">
      <h3 className="text-sm font-bold uppercase tracking-widest mb-3 text-center text-gray-400">
        Buzz-In Results
      </h3>
      <div className="space-y-2">
        {guesses.map((g, i) => {
          const isWinner = winner && g.playerId === winner.playerId;
          return (
            <div
              key={g.playerId}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: isWinner ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: isWinner ? '1.5px solid rgba(234, 179, 8, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span
                className="text-sm font-bold shrink-0 w-10 text-center py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: isWinner ? '#EAB308' : '#ff007f',
                }}
              >
                {i + 1}{suffix(i + 1)}
              </span>
              <span className="flex-1 font-semibold text-lg truncate text-white">
                {isWinner && '\u{1F3C6} '}{g.playerName}
              </span>
              <span className="text-sm truncate max-w-[200px] text-gray-400">
                &ldquo;{g.guess}&rdquo;
              </span>
              <span className="text-xl shrink-0">
                {g.correct ? '\u2705' : '\u274C'}
              </span>
            </div>
          );
        })}
      </div>
      {winner && (
        <p className="text-center mt-4 text-xl font-bold" style={{ color: '#EAB308', textShadow: '0 0 15px rgba(234,179,8,0.5)' }}>
          &#x1F3C6; {winner.playerName} wins the Rock Off!
        </p>
      )}
    </div>
  );
}
