'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '@/types/game';
import { getNearBingoPlayers } from '@/lib/game/bingo-utils';
import { CrownIcon, ArrowUp, ArrowDown, FlameCrown } from '@/components/animations/SVGIcons';
import FlameParticles from '@/components/animations/FlameParticles';
import { useAudio } from '@/hooks/useAudio';

interface LeaderboardProps {
  players: Player[];
  winCondition: 1 | 2 | 9;
}

export default function Leaderboard({ players, winCondition }: LeaderboardProps) {
  const sorted = useMemo(
    () => [...players].sort((a, b) => b.completedRows - a.completedRows || b.score - a.score),
    [players]
  );

  const nearBingo = useMemo(() => getNearBingoPlayers(players, winCondition), [players, winCondition]);

  const totalDrinks = useMemo(() => players.reduce((sum, p) => sum + p.drinks, 0), [players]);

  const drinkSorted = useMemo(
    () => [...players].sort((a, b) => b.drinks - a.drinks),
    [players]
  );
  const { playSound } = useAudio();

  // Track previous scores and rankings for animations
  const prevScoresRef = useRef<Record<string, number>>({});
  const prevRankingsRef = useRef<string[]>([]);
  const [leaderTakeover, setLeaderTakeover] = useState(false);
  const [newLeaderName, setNewLeaderName] = useState<string | null>(null);

  const currentRankings = useMemo(() => sorted.map(p => p.id), [sorted]);
  const prevRankings = prevRankingsRef.current;

  // Compute rank changes
  const rankChanges = useMemo<Record<string, 'up' | 'down' | null>>(() => {
    const changes: Record<string, 'up' | 'down' | null> = {};
    if (prevRankings.length > 0) {
      sorted.forEach((p, newIdx) => {
        const oldIdx = prevRankings.indexOf(p.id);
        if (oldIdx === -1) {
          changes[p.id] = null;
        } else if (newIdx < oldIdx) {
          changes[p.id] = 'up';
        } else if (newIdx > oldIdx) {
          changes[p.id] = 'down';
        } else {
          changes[p.id] = null;
        }
      });
    }
    return changes;
  }, [sorted, prevRankings]);

  // Compute score changes
  const scoreChanged = useMemo<Record<string, boolean>>(() => {
    const changes: Record<string, boolean> = {};
    sorted.forEach(p => {
      const prev = prevScoresRef.current[p.id];
      changes[p.id] = prev !== undefined && p.score > prev;
    });
    return changes;
  }, [sorted]);

  // Detect #1 takeover
  useEffect(() => {
    if (
      prevRankings.length > 0 &&
      sorted.length > 1 &&
      sorted[0].id !== prevRankings[0] &&
      sorted[0].score > 0 // don't fire on initial load
    ) {
      setLeaderTakeover(true);
      setNewLeaderName(sorted[0].name);
      playSound('rankUp');
      const timer = setTimeout(() => {
        setLeaderTakeover(false);
        setNewLeaderName(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  });

  // Update refs after render
  useEffect(() => {
    const scores: Record<string, number> = {};
    sorted.forEach(p => { scores[p.id] = p.score; });
    prevScoresRef.current = scores;
    prevRankingsRef.current = currentRankings;
  });

  return (
    <section className="sidebar-panel-right sidebar-scroll p-4 flex flex-col gap-4">
      {/* Leaderboard header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span style={{ color: '#ff007f', fontSize: '1.1rem' }}>&#127942;</span>
          <h3 className="font-black text-base uppercase text-white" style={{ letterSpacing: '0.12em' }}>
            Leaderboard
          </h3>
        </div>
        <span
          className="text-[10px] font-black uppercase px-2 py-1 rounded-full"
          style={{
            background: 'rgba(0, 242, 255, 0.2)',
            color: '#00f2ff',
            border: '1px solid rgba(0, 242, 255, 0.3)',
          }}
        >
          Live
        </span>
      </div>

      {/* Table-style leaderboard */}
      <div
        className="relative flex flex-col overflow-hidden rounded-xl"
        style={{
          background: 'rgba(75, 32, 56, 0.3)',
          backdropFilter: 'blur(12px)',
          border: leaderTakeover
            ? '1px solid rgba(255, 107, 0, 0.6)'
            : '1px solid rgba(255, 0, 127, 0.2)',
          transition: 'border-color 0.3s',
          boxShadow: leaderTakeover
            ? '0 0 30px rgba(255, 107, 0, 0.3), 0 0 60px rgba(234, 179, 8, 0.15)'
            : 'none',
        }}
      >
        {/* Table header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: 'rgba(255, 0, 127, 0.1)' }}
        >
          <span className="text-xs font-black uppercase text-pink-400" style={{ letterSpacing: '0.15em' }}>Player</span>
          <span className="text-xs font-black uppercase text-pink-400" style={{ letterSpacing: '0.15em' }}>Score</span>
        </div>

        {/* Player rows */}
        <AnimatePresence mode="popLayout">
          {sorted.map((p, i) => {
            const isLeader = i === 0;
            const isTakeover = isLeader && leaderTakeover;

            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="relative flex items-center justify-between px-4 py-3"
                style={{
                  borderTop: i > 0 ? '1px solid rgba(255, 255, 255, 0.05)' : undefined,
                  background: isTakeover
                    ? 'linear-gradient(90deg, rgba(255, 107, 0, 0.15), rgba(234, 179, 8, 0.08), transparent)'
                    : undefined,
                }}
              >
                {/* Flame particles on #1 takeover */}
                {isTakeover && <FlameParticles active count={15} effectDuration={2} width={200} />}

                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-black w-4 text-sm"
                      style={{ color: isLeader ? '#00f2ff' : '#6b7280' }}
                    >
                      {i + 1}
                    </span>

                    {/* Crown icon — flame crown during takeover, normal crown otherwise */}
                    {isLeader && (
                      <AnimatePresence mode="wait">
                        {isTakeover ? (
                          <motion.div
                            key="flame-crown"
                            initial={{ scale: 0, rotate: -20 }}
                            animate={{
                              scale: [0, 1.4, 1],
                              rotate: [-20, 5, 0],
                            }}
                            transition={{
                              duration: 0.6,
                              type: 'spring',
                              stiffness: 300,
                              damping: 15,
                            }}
                            style={{ filter: 'drop-shadow(0 0 12px rgba(255, 107, 0, 0.7))' }}
                          >
                            <FlameCrown size={24} />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="crown"
                            animate={{ y: [0, -2, 0] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                          >
                            <CrownIcon size={16} color="#EAB308" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    )}

                    <span className={`font-bold text-sm ${!p.connected ? 'opacity-40' : ''} ${isLeader ? 'text-white' : 'text-gray-200'}`}>
                      {p.name}
                    </span>

                    {/* Rank change indicators with enhanced animation */}
                    {rankChanges[p.id] === 'up' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.5 }}
                        animate={{ opacity: [1, 1, 0], y: [8, -2, -5], scale: [0.5, 1.2, 1] }}
                        transition={{ duration: 3, ease: 'easeOut' }}
                      >
                        <ArrowUp size={14} />
                      </motion.div>
                    )}
                    {rankChanges[p.id] === 'down' && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.5 }}
                        animate={{ opacity: [1, 1, 0], y: [-8, 2, 5], scale: [0.5, 1.2, 1] }}
                        transition={{ duration: 3, ease: 'easeOut' }}
                      >
                        <ArrowDown size={14} />
                      </motion.div>
                    )}
                  </div>
                  {/* Inline badges */}
                  {nearBingo.some((nb) => nb.id === p.id) && (
                    <div className="mt-1 ml-7">
                      <span
                        className="px-2 py-0.5 text-[10px] font-black rounded uppercase"
                        style={{ background: 'rgba(255, 0, 127, 0.2)', color: '#ff007f' }}
                      >
                        Near Bingo!
                      </span>
                    </div>
                  )}
                  {p.completedRows > 0 && !nearBingo.some((nb) => nb.id === p.id) && (
                    <div className="mt-1 ml-7">
                      <span
                        className="px-2 py-0.5 text-[10px] font-black rounded uppercase"
                        style={{ background: 'rgba(188, 19, 254, 0.2)', color: '#bc13fe' }}
                      >
                        {p.completedRows} Line{p.completedRows > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                  {p.milestones && (p.milestones.drinks500Earned && !p.milestones.drinks500Used) && (
                    <div className="mt-1 ml-7">
                      <span
                        className="px-2 py-0.5 text-[10px] font-black rounded uppercase"
                        style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#EAB308' }}
                      >
                        &#127866; Drink Ready
                      </span>
                    </div>
                  )}
                  {p.milestones && (p.milestones.block1000Earned && !p.milestones.block1000Used) && (
                    <div className="mt-1 ml-7">
                      <span
                        className="px-2 py-0.5 text-[10px] font-black rounded uppercase"
                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                      >
                        &#128737; Block Ready
                      </span>
                    </div>
                  )}
                  {!p.connected && (
                    <div className="mt-1 ml-7">
                      <span className="text-[10px] text-gray-600">Disconnected</span>
                    </div>
                  )}
                </div>

                {/* Score with enhanced animation */}
                <motion.span
                  key={p.score}
                  animate={scoreChanged[p.id] ? {
                    scale: [1, 1.4, 1],
                    textShadow: [
                      '0 0 0px transparent',
                      isLeader ? '0 0 20px rgba(255, 107, 0, 0.8)' : '0 0 15px rgba(0, 242, 255, 0.6)',
                      '0 0 0px transparent',
                    ],
                  } : {}}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`font-black text-right ${isLeader ? 'text-lg italic' : 'text-sm'}`}
                  style={{ color: isLeader ? '#ff007f' : '#d1d5db' }}
                >
                  {p.score.toLocaleString()}
                </motion.span>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Takeover banner overlay */}
        <AnimatePresence>
          {leaderTakeover && newLeaderName && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="absolute top-12 left-2 right-2 z-40 flex items-center justify-center py-2 px-3 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.9), rgba(234, 179, 8, 0.85))',
                boxShadow: '0 0 20px rgba(255, 107, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="text-xs font-black uppercase text-white tracking-wider"
                style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)' }}
              >
                {newLeaderName} takes the lead!
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bingo alert panel */}
      {nearBingo.length > 0 && (
        <div
          className="mt-2 p-4 rounded-xl flex items-start gap-3"
          style={{
            background: 'rgba(75, 32, 56, 0.3)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 0, 127, 0.4)',
            boxShadow: '0 0 20px rgba(255, 0, 127, 0.5)',
          }}
        >
          <span style={{ color: '#ff007f', fontSize: '1.1rem' }}>&#128276;</span>
          <div>
            <p className="font-black text-sm uppercase" style={{ color: '#ff007f' }}>
              Alert: {nearBingo[0].name}
            </p>
            <p className="text-xs text-gray-200">
              {winCondition === 9
                ? 'Only 1 cell away from Full Card!'
                : winCondition === 2
                  ? '1 cell from a 2nd line!'
                  : 'Only 1 cell away from Bingo!'}
            </p>
          </div>
        </div>
      )}

      {/* Drink Tracker */}
      {totalDrinks > 0 && (
        <>
          <div className="flex items-center justify-between mt-2 mb-1">
            <div className="flex items-center gap-2">
              <span style={{ color: '#EAB308', fontSize: '1.1rem' }}>&#127866;</span>
              <h3 className="font-black text-base uppercase text-white" style={{ letterSpacing: '0.12em' }}>
                Drink Tracker
              </h3>
            </div>
            <span
              className="text-[10px] font-black uppercase px-2 py-1 rounded-full"
              style={{
                background: 'rgba(234, 179, 8, 0.2)',
                color: '#EAB308',
                border: '1px solid rgba(234, 179, 8, 0.3)',
              }}
            >
              {totalDrinks} Total
            </span>
          </div>

          <div
            className="flex flex-col overflow-hidden rounded-xl"
            style={{
              background: 'rgba(75, 32, 56, 0.3)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(234, 179, 8, 0.2)',
            }}
          >
            {/* Table header */}
            <div
              className="flex items-center justify-between px-4 py-2.5"
              style={{ background: 'rgba(234, 179, 8, 0.08)' }}
            >
              <span className="text-xs font-black uppercase" style={{ color: 'rgba(234, 179, 8, 0.8)', letterSpacing: '0.15em' }}>Player</span>
              <span className="text-xs font-black uppercase" style={{ color: 'rgba(234, 179, 8, 0.8)', letterSpacing: '0.15em' }}>Drinks</span>
            </div>

            {/* Player drink rows — sorted by most drinks */}
            {drinkSorted.map((p, i) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderTop: i > 0 ? '1px solid rgba(255, 255, 255, 0.05)' : undefined }}
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-gray-200">
                    {p.name}
                  </span>
                </div>
                <span
                  className="font-black text-sm tabular-nums"
                  style={{
                    color: p.drinks >= 5 ? '#ef4444' : p.drinks >= 3 ? '#EAB308' : '#d1d5db',
                    textShadow: p.drinks >= 5 ? '0 0 8px rgba(239, 68, 68, 0.5)' : undefined,
                  }}
                >
                  {p.drinks}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
