'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import type { Player } from '@/types/game';
import { getNearBingoPlayers } from '@/lib/game/bingo-utils';
import { CrownIcon, ArrowUp, ArrowDown, FlameCrown } from '@/components/animations/SVGIcons';
import FlameParticles from '@/components/animations/FlameParticles';
import AnimatedNumber from '@/components/animations/AnimatedNumber';
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
    }
  }, [sorted, prevRankings, playSound]);

  // Auto-dismiss takeover banner (separate effect so re-renders don't cancel the timer)
  useEffect(() => {
    if (leaderTakeover) {
      const timer = setTimeout(() => {
        setLeaderTakeover(false);
        setNewLeaderName(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [leaderTakeover]);

  // Update refs after render
  useEffect(() => {
    const scores: Record<string, number> = {};
    sorted.forEach(p => { scores[p.id] = p.score; });
    prevScoresRef.current = scores;
    prevRankingsRef.current = currentRankings;
  });

  // Refs for GSAP animations
  const playerRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setPlayerRowRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) playerRowRefs.current.set(id, el);
    else playerRowRefs.current.delete(id);
  }, []);

  const crownRef = useRef<HTMLDivElement>(null);
  const flameCrownRef = useRef<HTMLDivElement>(null);
  const takeoverBannerRef = useRef<HTMLDivElement>(null);
  const takeoverTextRef = useRef<HTMLSpanElement>(null);

  // Animate player rows entrance
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      sorted.forEach((p) => {
        const el = playerRowRefs.current.get(p.id);
        if (!el) return;
        if (!el.dataset.animated) {
          gsap.fromTo(el,
            { opacity: 0, x: 20 },
            { opacity: 1, x: 0, duration: 0.3 }
          );
          el.dataset.animated = '1';
        }
      });
    });

    return () => ctx.revert();
  }, [sorted]);

  // Score change pulse animation
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    sorted.forEach((p) => {
      if (scoreChanged[p.id]) {
        const el = playerRowRefs.current.get(p.id);
        if (!el) return;
        const scoreEl = el.querySelector('[data-score]');
        if (scoreEl) {
          const isLeader = sorted[0].id === p.id;
          gsap.fromTo(scoreEl,
            { scale: 1, textShadow: '0 0 0px transparent' },
            {
              scale: 1.4,
              textShadow: isLeader ? '0 0 20px rgba(255, 107, 0, 0.8)' : '0 0 15px rgba(0, 242, 255, 0.6)',
              duration: 0.3,
              yoyo: true,
              repeat: 1,
              ease: 'power2.out',
            }
          );
        }
      }
    });
  }, [sorted, scoreChanged]);

  // Rank change arrow animations
  const arrowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setArrowRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) arrowRefs.current.set(id, el);
    else arrowRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      sorted.forEach((p) => {
        const change = rankChanges[p.id];
        const el = arrowRefs.current.get(p.id);
        if (!el || !change) return;

        if (change === 'up') {
          gsap.fromTo(el,
            { opacity: 0, y: 8, scale: 0.5 },
            { opacity: 1, y: -2, scale: 1.2, duration: 0.5, ease: 'power2.out' }
          );
          gsap.to(el, { opacity: 0, y: -5, scale: 1, duration: 0.5, delay: 2.5 });
        } else {
          gsap.fromTo(el,
            { opacity: 0, y: -8, scale: 0.5 },
            { opacity: 1, y: 2, scale: 1.2, duration: 0.5, ease: 'power2.out' }
          );
          gsap.to(el, { opacity: 0, y: 5, scale: 1, duration: 0.5, delay: 2.5 });
        }
      });
    });

    return () => ctx.revert();
  }, [sorted, rankChanges]);

  // Crown bob animation
  useEffect(() => {
    if (!crownRef.current) return;
    const ctx = gsap.context(() => {
      gsap.to(crownRef.current, { y: -2, yoyo: true, repeat: -1, duration: 0.75, ease: 'sine.inOut' });
    });
    return () => ctx.revert();
  }, [sorted]);

  // Flame crown entrance animation on takeover
  useEffect(() => {
    if (!leaderTakeover || !flameCrownRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(flameCrownRef.current,
        { scale: 0, rotation: -20 },
        { scale: 1, rotation: 0, duration: 0.6, ease: 'power2.out',
          keyframes: [
            { scale: 0, rotation: -20 },
            { scale: 1.4, rotation: 5 },
            { scale: 1, rotation: 0 },
          ]
        }
      );
    });
    return () => ctx.revert();
  }, [leaderTakeover]);

  // Takeover banner animation
  useEffect(() => {
    if (!leaderTakeover || !takeoverBannerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(takeoverBannerRef.current,
        { opacity: 0, y: -20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' }
      );
      // Pulse text
      if (takeoverTextRef.current) {
        gsap.to(takeoverTextRef.current, { scale: 1.05, yoyo: true, repeat: -1, duration: 0.4, ease: 'sine.inOut' });
      }
    });
    return () => ctx.revert();
  }, [leaderTakeover]);

  return (
    <section className="sidebar-panel-right sidebar-scroll p-4 flex flex-col gap-4">
      {/* Leaderboard header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--game-pink)', fontSize: '1.1rem' }}>&#127942;</span>
          <h3 className="font-black text-base uppercase text-white" style={{ letterSpacing: '0.12em' }}>
            Leaderboard
          </h3>
        </div>
        <span
          className="text-[10px] font-black uppercase px-2 py-1 rounded-full"
          style={{
            background: 'rgba(0, 242, 255, 0.2)',
            color: 'var(--game-cyan)',
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
        {sorted.map((p, i) => {
          const isLeader = i === 0;
          const isTakeover = isLeader && leaderTakeover;

          return (
            <div
              key={p.id}
              ref={setPlayerRowRef(p.id)}
              className="relative flex items-center justify-between px-4 py-3"
              style={{
                borderTop: i > 0 ? '1px solid rgba(217, 70, 239, 0.1)' : undefined,
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
                    style={{ color: isLeader ? '#00f2ff' : 'rgba(217, 70, 239, 0.5)' }}
                  >
                    {i + 1}
                  </span>

                  {/* Crown icon — flame crown during takeover, normal crown otherwise */}
                  {isLeader && (
                    <>
                      {isTakeover ? (
                        <div
                          ref={flameCrownRef}
                          style={{ filter: 'drop-shadow(0 0 12px rgba(255, 107, 0, 0.7))' }}
                        >
                          <FlameCrown size={24} />
                        </div>
                      ) : (
                        <div ref={crownRef}>
                          <CrownIcon size={16} color="#EAB308" />
                        </div>
                      )}
                    </>
                  )}

                  <span className={`font-bold text-sm ${!p.connected ? 'opacity-40' : ''} ${isLeader ? 'text-white' : 'text-gray-200'}`}>
                    {p.name}
                  </span>

                  {/* Rank change indicators */}
                  {rankChanges[p.id] === 'up' && (
                    <div ref={setArrowRef(p.id)}>
                      <ArrowUp size={14} />
                    </div>
                  )}
                  {rankChanges[p.id] === 'down' && (
                    <div ref={setArrowRef(p.id)}>
                      <ArrowDown size={14} />
                    </div>
                  )}
                </div>
                {/* Inline badges */}
                {nearBingo.some((nb) => nb.id === p.id) && (
                  <div className="mt-1 ml-7">
                    <span
                      className="px-2 py-1 sm:py-0.5 text-[10px] font-black rounded uppercase"
                      style={{ background: 'rgba(255, 0, 127, 0.2)', color: 'var(--game-pink)' }}
                    >
                      Near Bingo!
                    </span>
                  </div>
                )}
                {p.completedRows > 0 && !nearBingo.some((nb) => nb.id === p.id) && (
                  <div className="mt-1 ml-7">
                    <span
                      className="px-2 py-1 sm:py-0.5 text-[10px] font-black rounded uppercase"
                      style={{ background: 'rgba(188, 19, 254, 0.2)', color: 'var(--game-purple)' }}
                    >
                      {p.completedRows} Line{p.completedRows > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {p.milestones && (p.milestones.drinks500Earned && !p.milestones.drinks500Used) && (
                  <div className="mt-1 ml-7">
                    <span
                      className="px-2 py-1 sm:py-0.5 text-[10px] font-black rounded uppercase"
                      style={{ background: 'rgba(234, 179, 8, 0.2)', color: 'var(--game-gold)' }}
                    >
                      &#127866; Drink Ready
                    </span>
                  </div>
                )}
                {p.milestones && (p.milestones.hint1000Earned && !p.milestones.hint1000Used) && (
                  <div className="mt-1 ml-7">
                    <span
                      className="px-2 py-1 sm:py-0.5 text-[10px] font-black rounded uppercase"
                      style={{ background: 'rgba(0, 242, 255, 0.2)', color: '#00f2ff' }}
                    >
                      &#128269; Hint Ready
                    </span>
                  </div>
                )}
                {!p.connected && (
                  <div className="mt-1 ml-7">
                    <span className="text-[10px] text-red-400/70">Disconnected</span>
                  </div>
                )}
              </div>

              {/* Score */}
              <span
                data-score
                className={`font-black text-right ${isLeader ? 'text-lg italic' : 'text-sm'}`}
                style={{ color: isLeader ? '#ff007f' : '#d1d5db' }}
              >
                <AnimatedNumber value={p.score} />
              </span>
            </div>
          );
        })}

        {/* Takeover banner overlay */}
        {leaderTakeover && newLeaderName && (
          <div
            ref={takeoverBannerRef}
            role="status"
            aria-live="polite"
            className="absolute top-12 left-2 right-2 z-40 flex items-center justify-center py-2 px-3 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 0, 0.9), rgba(234, 179, 8, 0.85))',
              boxShadow: '0 0 20px rgba(255, 107, 0, 0.5), 0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span
              ref={takeoverTextRef}
              className="text-xs font-black uppercase text-white tracking-wider"
              style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)' }}
            >
              {newLeaderName} takes the lead!
            </span>
          </div>
        )}
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
          <span style={{ color: 'var(--game-pink)', fontSize: '1.1rem' }}>&#128276;</span>
          <div>
            <p className="font-black text-sm uppercase" style={{ color: 'var(--game-pink)' }}>
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
              <span style={{ color: 'var(--game-gold)', fontSize: '1.1rem' }}>&#127866;</span>
              <h3 className="font-black text-base uppercase text-white" style={{ letterSpacing: '0.12em' }}>
                Drink Tracker
              </h3>
            </div>
            <span
              className="text-[10px] font-black uppercase px-2 py-1 rounded-full"
              style={{
                background: 'rgba(234, 179, 8, 0.2)',
                color: 'var(--game-gold)',
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
