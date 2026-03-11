'use client';

import { useEffect, useRef, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '@/types/game';
import { getNearBingoPlayers } from '@/lib/game/bingo-utils';
import { CrownIcon, ArrowUp, ArrowDown } from '@/components/animations/SVGIcons';

interface LeaderboardProps {
  players: Player[];
  winCondition: 1 | 2 | 9;
}

interface PlayerRowProps {
  player: Player;
  index: number;
  rankChange: 'up' | 'down' | null;
  scoreChanged: boolean;
  isNearBingo: boolean;
}

const PlayerRow = memo(function PlayerRow({ player: p, index: i, rankChange, scoreChanged, isNearBingo }: PlayerRowProps) {
  return (
    <motion.div
      key={p.id}
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex items-center justify-between px-4 py-3"
      style={{ borderTop: i > 0 ? '1px solid rgba(255, 255, 255, 0.05)' : undefined }}
    >
      <div>
        <div className="flex items-center gap-3">
          <span
            className="font-black w-4 text-sm"
            style={{ color: i === 0 ? '#00f2ff' : '#6b7280' }}
          >
            {i + 1}
          </span>
          {i === 0 && (
            <div className="crown-bob">
              <CrownIcon size={16} color="#EAB308" />
            </div>
          )}
          <span className={`font-bold text-sm ${!p.connected ? 'opacity-40' : ''} ${i === 0 ? 'text-white' : 'text-gray-200'}`}>
            {p.name}
          </span>
          {rankChange === 'up' && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: [1, 1, 0], y: 0 }}
              transition={{ duration: 3 }}
            >
              <ArrowUp size={12} />
            </motion.div>
          )}
          {rankChange === 'down' && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: [1, 1, 0], y: 0 }}
              transition={{ duration: 3 }}
            >
              <ArrowDown size={12} />
            </motion.div>
          )}
        </div>
        {/* Inline badges */}
        {isNearBingo && (
          <div className="mt-1 ml-7">
            <span
              className="px-2 py-0.5 text-[10px] font-black rounded uppercase"
              style={{ background: 'rgba(255, 0, 127, 0.2)', color: '#ff007f' }}
            >
              Near Bingo!
            </span>
          </div>
        )}
        {p.completedRows > 0 && !isNearBingo && (
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
      <motion.span
        key={p.score}
        animate={scoreChanged ? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 0.5 }}
        className={`font-black text-right ${i === 0 ? 'text-lg italic' : 'text-sm'}`}
        style={{ color: i === 0 ? '#ff007f' : '#d1d5db' }}
      >
        {p.score.toLocaleString()}
      </motion.span>
    </motion.div>
  );
});

export default function Leaderboard({ players, winCondition }: LeaderboardProps) {
  const sorted = useMemo(
    () => [...players].sort((a, b) => b.completedRows - a.completedRows || b.score - a.score),
    [players]
  );

  const nearBingo = useMemo(() => getNearBingoPlayers(players, winCondition), [players, winCondition]);

  const nearBingoIds = useMemo(() => new Set(nearBingo.map(nb => nb.id)), [nearBingo]);

  const totalDrinks = useMemo(() => players.reduce((sum, p) => sum + p.drinks, 0), [players]);

  const drinkSorted = useMemo(
    () => [...players].sort((a, b) => b.drinks - a.drinks),
    [players]
  );

  // Track previous scores and rankings for animations
  const prevScoresRef = useRef<Record<string, number>>({});
  const prevRankingsRef = useRef<string[]>([]);

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
        className="flex flex-col overflow-hidden rounded-xl"
        style={{
          background: 'rgba(75, 32, 56, 0.3)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 0, 127, 0.2)',
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
          {sorted.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              index={i}
              rankChange={rankChanges[p.id] ?? null}
              scoreChanged={scoreChanged[p.id] ?? false}
              isNearBingo={nearBingoIds.has(p.id)}
            />
          ))}
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
