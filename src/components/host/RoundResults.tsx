'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import type { GuessResult, Track, Player } from '@/types/game';
import { WHEEL_SEGMENTS } from '@/types/game';
import CategoryBadge from '@/components/shared/CategoryBadge';

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
  const categoryLabel = category
    ? WHEEL_SEGMENTS.find((s) => s.category === category)?.label ?? category
    : '';

  // Build player result cards: merge players with their guess data
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center w-full max-w-2xl"
    >
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
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
        transition={{ delay: 0.1 }}
        className="text-xs font-bold uppercase mt-2 mb-8"
        style={{ color: '#00f2ff', letterSpacing: '0.3em' }}
      >
        Neon Disco Edition &middot; Round {roundNumber}
      </motion.p>

      {/* Track Card */}
      {track && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="w-full rounded-2xl p-5 mb-8 flex gap-5 items-center"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(188, 19, 254, 0.25)',
          }}
        >
          {/* Album Art */}
          {track.albumArt && (
            <div
              className="relative shrink-0 rounded-xl overflow-hidden"
              style={{
                width: 'clamp(80px, 20vw, 120px)',
                height: 'clamp(80px, 20vw, 120px)',
                border: '2px solid rgba(188, 19, 254, 0.6)',
                boxShadow: '0 0 25px rgba(188, 19, 254, 0.4)',
              }}
            >
              <Image
                src={track.albumArt}
                alt={track.name}
                fill
                sizes="120px"
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          {/* Track Info */}
          <div className="flex flex-col gap-2 min-w-0">
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-black uppercase leading-tight text-white truncate"
              style={{ letterSpacing: '-0.01em' }}
            >
              {track.name}
            </h2>
            <p className="text-base text-gray-400 font-medium truncate">
              {track.artist}
            </p>
            {track.album && (
              <p className="text-sm text-gray-500 font-medium truncate italic">
                {track.album}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>&#9835;</span>
                {track.year}
              </span>
              {category && <CategoryBadge category={category} />}
            </div>
          </div>
        </motion.div>
      )}

      {/* Divider */}
      <div
        className="w-full h-px mb-6"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(188, 19, 254, 0.3), transparent)',
        }}
      />

      {/* Correct Guesses Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex items-center gap-2 mb-5"
      >
        <span style={{ color: '#00f2ff' }}>&#10003;</span>
        <span className="text-sm font-bold uppercase tracking-widest text-gray-400">
          {correctCount > 0 ? 'Correct Guesses' : 'No Correct Guesses'}
          {category && (
            <>
              : <span style={{ color: WHEEL_SEGMENTS.find((s) => s.category === category)?.color ?? '#bc13fe' }}>
                {categoryLabel} Category
              </span>
            </>
          )}
        </span>
      </motion.div>

      {/* Player Result Cards */}
      <div className="w-full flex flex-wrap justify-center gap-3 mb-8">
        {playerResults.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.07 }}
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
            <span
              className="text-sm font-bold truncate max-w-[120px]"
              style={{ color: p.correct ? '#fff' : '#94a3b8' }}
            >
              {p.name}
            </span>
            <span
              className="text-xs font-black"
              style={{
                color: p.correct ? '#00f2ff' : '#64748b',
              }}
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
        transition={{ delay: 0.5 }}
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
    </motion.div>
  );
}
