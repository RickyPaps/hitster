'use client';

import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
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
const VICTORY_MSGS = ['WINS!', 'TAKES IT!', 'IS THE CHAMPION!', 'REIGNS SUPREME!', 'CLAIMS VICTORY!'];
const PLAY_AGAIN_MSGS = ['Play Again', 'Rematch!', 'Another Round?', 'Run It Back'];

export default function WinnerScreen({ winner, players, onPlayAgain }: WinnerScreenProps) {
  const { playSound } = useAudio();
  const sorted = players
    ? [...players].sort((a, b) => b.score - a.score).slice(0, 3)
    : [winner];

  const victoryMsg = useMemo(() => VICTORY_MSGS[Math.floor(Math.random() * VICTORY_MSGS.length)], []);
  const playAgainMsg = useMemo(() => PLAY_AGAIN_MSGS[Math.floor(Math.random() * PLAY_AGAIN_MSGS.length)], []);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const trophyRef = useRef<HTMLDivElement>(null);
  const nameContainerRef = useRef<HTMLDivElement>(null);
  const sparkleLeftRef = useRef<HTMLDivElement>(null);
  const sparkleRightRef = useRef<HTMLDivElement>(null);
  const podiumRef = useRef<HTMLDivElement>(null);
  const podiumItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const crownRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const statCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const playAgainBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    playSound('win');
    fireSideCannons(40);
  }, [playSound]);

  // Best streak across all players
  const bestStreak = players
    ? Math.max(...players.map((p) => p.streak ?? 0))
    : 0;

  // Master GSAP timeline
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      // Just make everything visible
      [containerRef, spotlightRef, trophyRef, nameContainerRef, sparkleLeftRef, sparkleRightRef, podiumRef, statsRef].forEach(ref => {
        if (ref.current) gsap.set(ref.current, { opacity: 1 });
      });
      podiumItemRefs.current.forEach(el => { if (el) gsap.set(el, { scaleY: 1 }); });
      statCardRefs.current.forEach(el => { if (el) gsap.set(el, { opacity: 1, scale: 1 }); });
      if (playAgainBtnRef.current) gsap.set(playAgainBtnRef.current, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Container fade in
      tl.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });

      // Spotlight
      tl.fromTo(spotlightRef.current,
        { opacity: 0 },
        { opacity: 0.15, duration: 1 },
        0.3
      );

      // Trophy slam in
      tl.fromTo(trophyRef.current,
        { y: -100, scale: 0, rotation: -30 },
        { y: 0, scale: 1, rotation: 0, duration: 0.7, ease: 'elastic.out(1, 0.5)' },
        0.2
      );

      // Winner name
      tl.fromTo(nameContainerRef.current,
        { opacity: 0, scale: 0.5 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' },
        0.6
      );

      // Sparkles
      tl.fromTo(sparkleLeftRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.4, ease: 'back.out(3)', keyframes: [{ scale: 0 }, { scale: 1.3 }, { scale: 1 }] },
        0.8
      );
      tl.fromTo(sparkleRightRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.4, ease: 'back.out(3)', keyframes: [{ scale: 0 }, { scale: 1.3 }, { scale: 1 }] },
        1.0
      );

      // Podium
      if (podiumRef.current) {
        tl.fromTo(podiumRef.current,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.6 },
          1.2
        );

        // Podium items scale up
        podiumItemRefs.current.forEach((el, idx) => {
          if (el) {
            const actualRank = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            tl.fromTo(el,
              { scaleY: 0 },
              { scaleY: 1, duration: 0.4, ease: 'power2.out' },
              1.4 + actualRank * 0.15
            );
          }
        });

        // Crown bob
        if (crownRef.current) {
          tl.fromTo(crownRef.current,
            { scale: 0 },
            { scale: 1, duration: 0.4, ease: 'back.out(3)' },
            1.8
          );
          // Continuous bob after timeline
          tl.to(crownRef.current, { y: -5, yoyo: true, repeat: -1, duration: 1, ease: 'sine.inOut' }, '+=0');
        }
      }

      // Stats
      tl.fromTo(statsRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4 },
        1.8
      );

      // Stat cards
      statCardRefs.current.forEach((el, idx) => {
        if (el) {
          tl.fromTo(el,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 0.3 },
            1.9 + idx * 0.1
          );
        }
      });

      // Play again button
      if (playAgainBtnRef.current) {
        tl.fromTo(playAgainBtnRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.4 },
          2.2
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Hover/tap for play again button
  useEffect(() => {
    const btn = playAgainBtnRef.current;
    if (!btn) return;
    const onEnter = () => gsap.to(btn, { scale: 1.05, duration: 0.2 });
    const onLeave = () => gsap.to(btn, { scale: 1, duration: 0.2 });
    const onDown = () => gsap.to(btn, { scale: 0.95, duration: 0.1 });
    const onUp = () => gsap.to(btn, { scale: 1.05, duration: 0.1 });
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointerup', onUp);
    return () => {
      btn.removeEventListener('mouseenter', onEnter);
      btn.removeEventListener('mouseleave', onLeave);
      btn.removeEventListener('pointerdown', onDown);
      btn.removeEventListener('pointerup', onUp);
    };
  }, [onPlayAgain]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center justify-center gap-6 text-center w-full"
    >
      {/* Spotlight beam */}
      <div
        ref={spotlightRef}
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
      <div ref={trophyRef}>
        <TrophyIcon size={96} color="#EAB308" />
      </div>

      {/* Winner name with sparkles */}
      <div
        ref={nameContainerRef}
        className="relative flex items-center gap-3"
      >
        <div ref={sparkleLeftRef}>
          <SparkleIcon size={24} color="#EAB308" />
        </div>
        <h1
          className="text-4xl md:text-5xl font-black"
          style={{
            fontFamily: 'var(--font-display)',
            color: '#ff007f',
            textShadow: '0 0 20px rgba(255, 0, 127, 0.5)',
          }}
        >
          {winner.name} {victoryMsg}
        </h1>
        <div ref={sparkleRightRef}>
          <SparkleIcon size={24} color="#d946ef" />
        </div>
      </div>

      {/* Podium — top 3 */}
      {sorted.length > 1 && (
        <div
          ref={podiumRef}
          className="flex items-end justify-center gap-3 mt-4"
        >
          {/* Reorder: 2nd, 1st, 3rd for visual podium */}
          {[sorted[1], sorted[0], sorted[2]].filter(Boolean).map((p, visualIdx) => {
            const actualRank = visualIdx === 0 ? 1 : visualIdx === 1 ? 0 : 2;
            const height = PODIUM_HEIGHTS[actualRank];
            const color = PODIUM_COLORS[actualRank];
            return (
              <div
                key={p!.id}
                ref={(el) => { podiumItemRefs.current[visualIdx] = el; }}
                className="flex flex-col items-center origin-bottom"
                style={{ width: 'clamp(80px, 20vw, 110px)' }}
              >
                {actualRank === 0 && (
                  <div ref={crownRef}>
                    <CrownIcon size={28} color="#EAB308" />
                  </div>
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
              </div>
            );
          })}
        </div>
      )}

      {/* Stats summary */}
      <div
        ref={statsRef}
        className="flex flex-wrap justify-center gap-3 mt-2"
      >
        <StatCard ref={(el) => { statCardRefs.current[0] = el; }} label="Lines" value={`${winner.completedRows}`} icon="&#x1F3AF;" />
        <StatCard ref={(el) => { statCardRefs.current[1] = el; }} label="Score" value={winner.score.toLocaleString()} icon="&#x2B50;" />
        {bestStreak > 0 && (
          <StatCard ref={(el) => { statCardRefs.current[2] = el; }} label="Best Streak" value={`${bestStreak}`} icon="&#x1F525;" />
        )}
      </div>

      {/* Play again button */}
      {onPlayAgain && (
        <button
          ref={playAgainBtnRef}
          onClick={onPlayAgain}
          className="mt-4 py-3.5 px-10 rounded-full font-black text-white text-lg uppercase tracking-wider cursor-pointer"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #ff007f, #bc13fe)',
            boxShadow: '0 0 30px rgba(255, 0, 127, 0.5), 0 0 60px rgba(188, 19, 254, 0.2)',
          }}
        >
          {playAgainMsg}
        </button>
      )}
    </div>
  );
}

import { forwardRef } from 'react';

const StatCard = forwardRef<HTMLDivElement, { label: string; value: string; icon: string }>(
  function StatCard({ label, value, icon }, ref) {
    return (
      <div
        ref={ref}
        className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl min-w-[80px]"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <span className="text-lg" dangerouslySetInnerHTML={{ __html: icon }} />
        <span className="text-lg font-black text-white">{value}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
    );
  }
);
