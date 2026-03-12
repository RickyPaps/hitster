'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Player } from '@/types/game';
import { TrophyIcon, SparkleIcon, CrownIcon } from '@/components/animations/SVGIcons';
import AnimatedNumber from '@/components/animations/AnimatedNumber';
import { useAudio } from '@/hooks/useAudio';
import { fireSideCannons } from '@/lib/confetti';

interface WinnerScreenProps {
  winner: Player;
  players?: Player[];
  onPlayAgain?: () => void;
}

const PODIUM_COLORS = ['#EAB308', '#94a3b8', '#cd7f32']; // gold, silver, bronze
const PODIUM_HEIGHTS = [160, 120, 90];

export default function WinnerScreen({ winner, players, onPlayAgain }: WinnerScreenProps) {
  const { playSound } = useAudio();
  const sorted = players
    ? [...players].sort((a, b) => b.score - a.score).slice(0, 3)
    : [winner];

  useEffect(() => {
    playSound('win');
    fireSideCannons(40);
  }, [playSound]);

  // Best streak across all players
  const bestStreak = players
    ? Math.max(...players.map((p) => p.streak ?? 0))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative flex flex-col items-center justify-center gap-6 text-center w-full"
    >
      {/* Spotlight beam */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.15 }}
        transition={{ delay: 0.3, duration: 1 }}
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: 0,
          height: 0,
          borderLeft: '200px solid transparent',
          borderRight: '200px solid transparent',
          borderTop: '500px solid rgba(234, 179, 8, 0.3)',
        }}
      />

      {/* Trophy */}
      <motion.div
        initial={{ y: -100, scale: 0, rotate: -30 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        <TrophyIcon size={96} color="#EAB308" />
      </motion.div>

      {/* Winner name with sparkles */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 20 }}
        className="relative flex items-center gap-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <SparkleIcon size={24} color="#EAB308" />
        </motion.div>
        <h1
          className="text-4xl md:text-5xl font-black"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#ff007f',
            textShadow: '0 0 20px rgba(255, 0, 127, 0.5)',
          }}
        >
          {winner.name} WINS!
        </h1>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <SparkleIcon size={24} color="#d946ef" />
        </motion.div>
      </motion.div>

      {/* Podium — top 3 */}
      {sorted.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="flex items-end justify-center gap-3 mt-4"
        >
          {/* Reorder: 2nd, 1st, 3rd for visual podium */}
          {[sorted[1], sorted[0], sorted[2]].filter(Boolean).map((p, visualIdx) => {
            const actualRank = visualIdx === 0 ? 1 : visualIdx === 1 ? 0 : 2;
            const height = PODIUM_HEIGHTS[actualRank];
            const color = PODIUM_COLORS[actualRank];
            return (
              <motion.div
                key={p!.id}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 1.4 + actualRank * 0.15, duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col items-center origin-bottom"
                style={{ width: 'clamp(80px, 20vw, 110px)' }}
              >
                {actualRank === 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, y: [0, -5, 0] }}
                    transition={{ delay: 1.8, duration: 0.5, y: { repeat: Infinity, duration: 2 } }}
                  >
                    <CrownIcon size={28} color="#EAB308" />
                  </motion.div>
                )}
                <span
                  className="text-sm font-black truncate max-w-full mb-1"
                  style={{ color }}
                >
                  {p!.name}
                </span>
                <span className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  <AnimatedNumber value={p!.score} /> pts
                </span>
                <div
                  className="w-full rounded-t-lg flex items-start justify-center pt-3"
                  style={{
                    height,
                    background: `linear-gradient(180deg, ${color}30, ${color}10)`,
                    border: `1px solid ${color}50`,
                    borderBottom: 'none',
                  }}
                >
                  <span className="text-2xl font-black" style={{ color }}>
                    {actualRank + 1}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Stats summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8 }}
        className="flex flex-wrap justify-center gap-3 mt-2"
      >
        <StatCard label="Lines" value={`${winner.completedRows}`} icon="&#x1F3AF;" delay={1.9} />
        <StatCard label="Score" value={winner.score.toLocaleString()} icon="&#x2B50;" delay={2.0} />
        {bestStreak > 0 && (
          <StatCard label="Best Streak" value={`${bestStreak}`} icon="&#x1F525;" delay={2.1} />
        )}
      </motion.div>

      {/* Play again button */}
      {onPlayAgain && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayAgain}
          className="mt-4 py-3.5 px-10 rounded-full font-black text-white text-lg uppercase tracking-wider cursor-pointer"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #ff007f, #bc13fe)',
            boxShadow: '0 0 30px rgba(255, 0, 127, 0.5), 0 0 60px rgba(188, 19, 254, 0.2)',
          }}
        >
          Play Again
        </motion.button>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, icon, delay }: { label: string; value: string; icon: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl min-w-[80px]"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      <span className="text-lg" dangerouslySetInnerHTML={{ __html: icon }} />
      <span className="text-lg font-black text-white">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
    </motion.div>
  );
}
