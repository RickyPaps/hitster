'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GuessResult, Track, Player } from '@/types/game';
import { ALL_WHEEL_SEGMENTS, isMusicTrack, getMediaTitle, getMediaSubtitle, getMediaDetail } from '@/types/game';
import CategoryBadge from '@/components/shared/CategoryBadge';
import ConfettiBurst from '@/components/animations/ConfettiBurst';
import { useAudio } from '@/hooks/useAudio';

interface RoundResultsProps {
  guesses: GuessResult[];
  track: Track | null;
  category: string | null;
  roundNumber: number;
  players: Player[];
  onNextRound: () => void;
}

export default function RoundResults({
  guesses,
  track,
  category,
  roundNumber,
  players,
  onNextRound,
}: RoundResultsProps) {
  const { playSound } = useAudio();
  const [revealPhase, setRevealPhase] = useState<'flash' | 'reveal' | 'results'>('flash');

  const categoryLabel = category
    ? ALL_WHEEL_SEGMENTS.find((s) => s.category === category)?.label ?? category
    : '';
  const isMovie = track && !isMusicTrack(track);

  // Cinematic reveal sequence
  useEffect(() => {
    playSound('reveal');
    const revealTimer = setTimeout(() => setRevealPhase('reveal'), 400);
    const resultsTimer = setTimeout(() => setRevealPhase('results'), 1200);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(resultsTimer);
    };
  }, [playSound]);

  // Build player result cards
  const playerResults = players.map((p) => {
    const guess = guesses.find((g) => g.playerId === p.id);
    return {
      id: p.id,
      name: p.name,
      guess: guess?.guess ?? null,
      correct: guess?.correct ?? false,
      similarity: guess?.similarity,
      points: guess?.pointsAwarded ?? 0,
      submitted: !!guess,
    };
  });

  const correctCount = playerResults.filter((p) => p.correct).length;

  return (
    <div className="relative flex flex-col items-center w-full max-w-2xl">
      {/* Dark flash overlay */}
      <AnimatePresence>
        {revealPhase === 'flash' && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{ background: '#0d0216' }}
          />
        )}
      </AnimatePresence>

      {/* Title — slams in */}
      <motion.h1
        initial={{ scale: 1.8, y: -20, opacity: 0, filter: 'blur(10px)' }}
        animate={{ scale: 1, y: 0, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-4xl md:text-5xl font-black uppercase tracking-wide text-center"
        style={{
          fontFamily: 'var(--font-display)',
          color: '#ff007f',
          textShadow: '0 0 20px rgba(255, 0, 127, 0.6), 0 0 60px rgba(255, 0, 127, 0.3)',
        }}
      >
        Round Results
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs font-bold uppercase mt-2 mb-8"
        style={{ color: '#00f2ff', letterSpacing: '0.3em' }}
      >
        Neon Disco Edition &middot; Round {roundNumber}
      </motion.p>

      {/* Track Card — cinematic reveal with parallax */}
      {track && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
          className="relative w-full rounded-2xl p-5 mb-8 flex gap-5 items-center overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(188, 19, 254, 0.4)',
            boxShadow: '0 0 40px rgba(188, 19, 254, 0.2)',
          }}
        >
          {/* Background glow on reveal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.1] }}
            transition={{ duration: 1, delay: 0.5 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(188, 19, 254, 0.3), transparent 70%)',
            }}
          />

          {/* Album Art / Movie Poster with scale entrance */}
          {track.albumArt && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
              className="shrink-0 rounded-xl overflow-hidden relative"
              style={{
                width: 'clamp(80px, 20vw, 120px)',
                height: 'clamp(80px, 20vw, 120px)',
                border: '2px solid rgba(188, 19, 254, 0.6)',
                boxShadow: '0 0 25px rgba(188, 19, 254, 0.4)',
              }}
            >
              <img
                src={track.albumArt}
                alt={getMediaTitle(track)}
                className="w-full h-full object-cover"
              />
            </motion.div>
          )}

          {/* Track / Movie Info — staggered text entrance */}
          <div className="flex flex-col gap-2 min-w-0 relative">
            <motion.h2
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              className="text-xl sm:text-2xl md:text-3xl font-black uppercase leading-tight text-white truncate"
              style={{ letterSpacing: '-0.01em' }}
            >
              {getMediaTitle(track)}
            </motion.h2>
            <motion.p
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              className="text-base text-gray-400 font-medium truncate"
            >
              {isMovie ? 'Dir. ' : ''}{getMediaSubtitle(track)}
            </motion.p>
            {getMediaDetail(track) && (
              <motion.p
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.85, duration: 0.3 }}
                className="text-sm text-gray-500 font-medium truncate italic"
              >
                {getMediaDetail(track)}
              </motion.p>
            )}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="flex items-center gap-2 flex-wrap mt-1"
            >
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>{isMovie ? '\u{1F3AC}' : '\u{266B}'}</span>
                {track.year}
              </span>
              {category && <CategoryBadge category={category} />}
            </motion.div>
          </div>

          {/* Mini confetti on the track card */}
          {correctCount > 0 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <ConfettiBurst active={revealPhase === 'results'} particleCount={10} duration={1} />
            </div>
          )}
        </motion.div>
      )}

      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        className="w-full h-px mb-6 origin-center"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(188, 19, 254, 0.3), transparent)',
        }}
      />

      {/* Correct Guesses Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="flex items-center gap-2 mb-5"
      >
        <span style={{ color: '#00f2ff' }}>&#10003;</span>
        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">
          {correctCount > 0 ? 'Correct Guesses' : 'No Correct Guesses'}
          {category && (
            <>
              : <span style={{ color: ALL_WHEEL_SEGMENTS.find((s) => s.category === category)?.color ?? '#bc13fe' }}>
                {categoryLabel} Category
              </span>
            </>
          )}
        </span>
      </motion.div>

      {/* Player Result Cards — fly in with checkmarks/X's */}
      <div className="w-full flex flex-wrap justify-center gap-3 mb-8">
        {playerResults.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 1.2 + i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-1 rounded-xl px-5 py-3 min-w-[100px]"
            style={{
              background: p.correct
                ? 'rgba(0, 242, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.03)',
              border: p.correct
                ? '1px solid rgba(0, 242, 255, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.06)',
              opacity: p.correct ? 1 : 0.5,
            }}
          >
            {/* Result icon */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ delay: 1.3 + i * 0.08, duration: 0.3 }}
              className="text-lg"
            >
              {p.correct ? '\u2705' : '\u274C'}
            </motion.span>
            <span
              className="text-sm font-bold truncate max-w-[120px]"
              style={{ color: p.correct ? '#fff' : '#94a3b8' }}
            >
              {p.name}
            </span>
            <span
              className="text-xs font-black"
              style={{ color: p.correct ? '#00f2ff' : '#64748b' }}
            >
              {p.correct ? `+${p.points} PTS` : '0 PTS'}
            </span>
            {p.guess && (
              <span
                className="text-[10px] truncate max-w-[120px]"
                style={{ color: p.correct ? 'rgba(0, 242, 255, 0.6)' : 'rgba(148, 163, 184, 0.5)' }}
              >
                &ldquo;{p.guess}&rdquo;
              </span>
            )}
          </motion.div>
        ))}
      </div>

      {/* Next Round Button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNextRound}
        className="py-3 px-12 rounded-full font-black text-lg text-white uppercase tracking-wider cursor-pointer"
        style={{
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, #bc13fe, #ff007f)',
          boxShadow: '0 0 25px rgba(188, 19, 254, 0.5), 0 0 60px rgba(188, 19, 254, 0.2)',
        }}
      >
        Next Round
      </motion.button>
    </div>
  );
}
