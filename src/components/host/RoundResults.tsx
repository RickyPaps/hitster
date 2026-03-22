'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import gsap from 'gsap';
import type { GuessResult, Track, Player } from '@/types/game';
import { ALL_WHEEL_SEGMENTS, isMusicTrack, getMediaTitle, getMediaSubtitle, getMediaDetail } from '@/types/game';
import CategoryBadge from '@/components/shared/CategoryBadge';
import TextReveal from '@/components/animations/TextReveal';
import { useAudio } from '@/hooks/useAudio';
import { fireConfetti } from '@/lib/confetti';

interface RoundResultsProps {
  guesses: GuessResult[];
  track: Track | null;
  category: string | null;
  roundNumber: number;
  players: Player[];
  onNextRound: () => void;
}

type RevealStage = 'flash' | 'spotlight' | 'albumArt' | 'trackInfo' | 'playerCards' | 'done';

const STAGE_ORDER: RevealStage[] = ['flash', 'spotlight', 'albumArt', 'trackInfo', 'playerCards', 'done'];

function stageAtLeast(current: RevealStage, target: RevealStage): boolean {
  return STAGE_ORDER.indexOf(current) >= STAGE_ORDER.indexOf(target);
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
  const [stage, setStage] = useState<RevealStage>('flash');
  const [revealedPlayerIndex, setRevealedPlayerIndex] = useState(-1);
  const revealIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const categoryLabel = category
    ? ALL_WHEEL_SEGMENTS.find((s) => s.category === category)?.label ?? category
    : '';
  const isMovie = track && !isMusicTrack(track);

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

  // Refs for GSAP animations
  const flashRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const trackCardRef = useRef<HTMLDivElement>(null);
  const trackGlowRef = useRef<HTMLDivElement>(null);
  const albumArtRef = useRef<HTMLDivElement>(null);
  const artistRef = useRef<HTMLParagraphElement>(null);
  const detailRef = useRef<HTMLParagraphElement>(null);
  const yearBadgeRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const correctHeaderRef = useRef<HTMLDivElement>(null);
  const playerCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const playerIconRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const setPlayerCardRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) playerCardRefs.current.set(id, el);
    else playerCardRefs.current.delete(id);
  }, []);

  const setPlayerIconRef = useCallback((id: string) => (el: HTMLSpanElement | null) => {
    if (el) playerIconRefs.current.set(id, el);
    else playerIconRefs.current.delete(id);
  }, []);

  // Cinematic stage progression
  useEffect(() => {
    playSound('reveal');

    const timers = [
      setTimeout(() => setStage('spotlight'), 400),
      setTimeout(() => setStage('albumArt'), 800),
      setTimeout(() => setStage('trackInfo'), 1400),
      setTimeout(() => setStage('playerCards'), 2200),
    ];

    return () => timers.forEach(clearTimeout);
  }, [playSound]);

  // Flash overlay animation
  useEffect(() => {
    if (stage === 'flash' && flashRef.current) {
      gsap.fromTo(flashRef.current,
        { opacity: 1 },
        { opacity: 0, duration: 0.4 }
      );
    }
  }, [stage]);

  // Spotlight beam animation
  useEffect(() => {
    if (stageAtLeast(stage, 'spotlight') && !stageAtLeast(stage, 'trackInfo') && spotlightRef.current) {
      gsap.fromTo(spotlightRef.current,
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 0.15, duration: 0.5, ease: 'power2.out' }
      );
    }
    if (stageAtLeast(stage, 'trackInfo') && spotlightRef.current) {
      gsap.to(spotlightRef.current, { opacity: 0, duration: 0.3 });
    }
  }, [stage]);

  // Title slam-in animation
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      if (titleRef.current) {
        gsap.fromTo(titleRef.current,
          { scale: 1.8, y: -20, opacity: 0, filter: 'blur(10px)' },
          { scale: 1, y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.5, delay: 0.1, ease: 'power4.out' }
        );
      }
      if (subtitleRef.current) {
        gsap.fromTo(subtitleRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, delay: 0.3 }
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Track card entrance
  useEffect(() => {
    if (!stageAtLeast(stage, 'albumArt') || !trackCardRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(trackCardRef.current,
        { opacity: 0, scale: 0.8, y: 40 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
      );

      // Background glow pulse
      if (trackGlowRef.current) {
        gsap.fromTo(trackGlowRef.current,
          { opacity: 0 },
          { opacity: 0.3, duration: 0.5, yoyo: true, repeat: 1, repeatDelay: 0.2 }
        );
      }

      // Album art 3D flip
      if (albumArtRef.current) {
        gsap.fromTo(albumArtRef.current,
          { rotateY: -90, opacity: 0 },
          { rotateY: 0, opacity: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' }
        );
      }
    });

    return () => ctx.revert();
  }, [stage === 'albumArt' || stage === 'trackInfo' || stage === 'playerCards' || stage === 'done' ? 'shown' : 'hidden']);

  // Track info slide-in animations
  useEffect(() => {
    if (!stageAtLeast(stage, 'trackInfo')) return;

    const ctx = gsap.context(() => {
      if (artistRef.current) {
        gsap.fromTo(artistRef.current,
          { x: 20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, delay: 0.4 }
        );
      }
      if (detailRef.current) {
        gsap.fromTo(detailRef.current,
          { x: 20, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.3, delay: 0.55 }
        );
      }
      if (yearBadgeRef.current) {
        gsap.fromTo(yearBadgeRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.3, delay: 0.6 }
        );
      }
    });

    return () => ctx.revert();
  }, [stageAtLeast(stage, 'trackInfo') ? 'trackInfo' : 'waiting']);

  // Divider + correct header animation
  useEffect(() => {
    if (!stageAtLeast(stage, 'playerCards')) return;

    const ctx = gsap.context(() => {
      if (dividerRef.current) {
        gsap.fromTo(dividerRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.4 }
        );
      }
      if (correctHeaderRef.current) {
        gsap.fromTo(correctHeaderRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3 }
        );
      }
    });

    return () => ctx.revert();
  }, [stageAtLeast(stage, 'playerCards') ? 'playerCards' : 'waiting']);

  // Player card cascade with sounds
  useEffect(() => {
    if (stage !== 'playerCards') return;

    let idx = 0;
    let doneTimer: ReturnType<typeof setTimeout> | null = null;
    revealIntervalRef.current = setInterval(() => {
      if (idx < playerResults.length) {
        setRevealedPlayerIndex(idx);
        const result = playerResults[idx];
        playSound(result.correct ? 'ding' : 'buzzer');
        if (result.correct) {
          fireConfetti({ particleCount: 8 });
        }
        idx++;
      } else {
        if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
        doneTimer = setTimeout(() => setStage('done'), 500);
      }
    }, 300);

    return () => {
      if (revealIntervalRef.current) clearInterval(revealIntervalRef.current);
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [stage]);

  // Animate each player card as it's revealed
  useEffect(() => {
    if (revealedPlayerIndex < 0) return;
    const result = playerResults[revealedPlayerIndex];
    if (!result) return;

    const cardEl = playerCardRefs.current.get(result.id);
    const iconEl = playerIconRefs.current.get(result.id);

    if (cardEl) {
      gsap.fromTo(cardEl,
        { opacity: 0, y: 20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
      );
    }
    if (iconEl) {
      gsap.fromTo(iconEl,
        { scale: 0 },
        { scale: 1, duration: 0.3, ease: 'back.out(3)', keyframes: [{ scale: 0 }, { scale: 1.3 }, { scale: 1 }] }
      );
    }
  }, [revealedPlayerIndex]);

  // Next button entrance + hover
  useEffect(() => {
    if (stage !== 'done' || !nextBtnRef.current) return;
    gsap.fromTo(nextBtnRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3 }
    );

    const btn = nextBtnRef.current;
    const onEnter = () => gsap.to(btn, { scale: 1.03, duration: 0.2 });
    const onLeave = () => gsap.to(btn, { scale: 1, duration: 0.2 });
    const onDown = () => gsap.to(btn, { scale: 0.97, duration: 0.1 });
    const onUp = () => gsap.to(btn, { scale: 1.03, duration: 0.1 });
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
  }, [stage]);

  return (
    <div className="relative flex flex-col items-center w-full max-w-2xl">
      {/* Dark flash overlay */}
      {stage === 'flash' && (
        <div
          ref={flashRef}
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ background: '#0d0216' }}
        />
      )}

      {/* Spotlight beam */}
      {stageAtLeast(stage, 'spotlight') && (
        <div
          ref={spotlightRef}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-80 origin-top pointer-events-none z-10"
          style={{
            clipPath: 'polygon(40% 0%, 60% 0%, 80% 100%, 20% 100%)',
            background: 'linear-gradient(180deg, rgba(188,19,254,0.4), transparent)',
          }}
        />
      )}

      {/* Title — slams in */}
      <h1
        ref={titleRef}
        className="text-4xl md:text-5xl font-black uppercase tracking-wide text-center"
        style={{
          fontFamily: 'var(--font-display)',
          color: 'var(--game-pink)',
          textShadow: '0 0 20px rgba(255, 0, 127, 0.6), 0 0 60px rgba(255, 0, 127, 0.3)',
        }}
      >
        Round Results
      </h1>

      <p
        ref={subtitleRef}
        className="text-xs font-bold uppercase mt-2 mb-8"
        style={{ color: 'var(--game-cyan)', letterSpacing: '0.3em' }}
      >
        Neon Disco Edition &middot; Round {roundNumber}
      </p>

      {/* Track Card — album art with 3D flip + typewriter track name */}
      {track && stageAtLeast(stage, 'albumArt') && (
        <div
          ref={trackCardRef}
          className="relative w-full rounded-2xl p-5 mb-8 flex gap-5 items-center overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(188, 19, 254, 0.4)',
            boxShadow: '0 0 40px rgba(188, 19, 254, 0.2)',
          }}
        >
          {/* Background glow */}
          <div
            ref={trackGlowRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(188, 19, 254, 0.3), transparent 70%)',
            }}
          />

          {/* Album Art with 3D flip */}
          {track.albumArt && (
            <div
              ref={albumArtRef}
              className="shrink-0 rounded-xl overflow-hidden relative"
              style={{
                width: 'clamp(80px, 20vw, 120px)',
                height: 'clamp(80px, 20vw, 120px)',
                border: '2px solid rgba(188, 19, 254, 0.6)',
                boxShadow: '0 0 25px rgba(188, 19, 254, 0.4)',
                perspective: '800px',
                transformStyle: 'preserve-3d',
              }}
            >
              <img
                src={track.albumArt}
                alt={getMediaTitle(track)}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          {/* Track / Movie Info */}
          <div className="flex flex-col gap-2 min-w-0 relative">
            {stageAtLeast(stage, 'trackInfo') ? (
              <>
                <h2
                  className="text-xl sm:text-2xl md:text-3xl font-black uppercase leading-tight text-white truncate"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  <TextReveal text={getMediaTitle(track)} mode="typewriter" speed={30} />
                </h2>
                <p
                  ref={artistRef}
                  className="text-base font-medium truncate" style={{ color: 'rgba(0, 242, 255, 0.6)' }}
                >
                  {isMovie ? 'Dir. ' : ''}{getMediaSubtitle(track)}
                </p>
                {getMediaDetail(track) && (
                  <p
                    ref={detailRef}
                    className="text-sm text-gray-500 font-medium truncate italic"
                  >
                    {getMediaDetail(track)}
                  </p>
                )}
                <div
                  ref={yearBadgeRef}
                  className="flex items-center gap-2 flex-wrap mt-1"
                >
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem' }}>{isMovie ? '\u{1F3AC}' : '\u{266B}'}</span>
                    {track.year}
                  </span>
                  {category && <CategoryBadge category={category} />}
                </div>
              </>
            ) : (
              <div className="h-20" /> /* placeholder while waiting for trackInfo stage */
            )}
          </div>
        </div>
      )}

      {/* Divider */}
      {stageAtLeast(stage, 'playerCards') && (
        <div
          ref={dividerRef}
          className="w-full h-px mb-6 origin-center"
          style={{
            background: 'linear-gradient(to right, transparent, rgba(188, 19, 254, 0.3), transparent)',
          }}
        />
      )}

      {/* Correct Guesses Header */}
      {stageAtLeast(stage, 'playerCards') && (
        <div
          ref={correctHeaderRef}
          className="flex items-center gap-2 mb-5"
        >
          <span style={{ color: 'var(--game-cyan)' }}>&#10003;</span>
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: 'rgba(217, 70, 239, 0.7)' }}>
            {correctCount > 0 ? 'Correct Guesses' : 'No Correct Guesses'}
            {category && (
              <>
                : <span style={{ color: ALL_WHEEL_SEGMENTS.find((s) => s.category === category)?.color ?? '#bc13fe' }}>
                  {categoryLabel} Category
                </span>
              </>
            )}
          </span>
        </div>
      )}

      {/* Player Result Cards — cascade one-by-one with sounds */}
      {stageAtLeast(stage, 'playerCards') && (
        <div className="w-full flex flex-wrap justify-center gap-2 sm:gap-3 mb-8">
          {playerResults.map((p, i) => (
            i <= revealedPlayerIndex && (
              <div
                key={p.id}
                ref={setPlayerCardRef(p.id)}
                className="flex flex-col items-center gap-1 rounded-xl px-3 sm:px-5 py-2.5 sm:py-3 min-w-[80px] sm:min-w-[100px]"
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
                  ref={setPlayerIconRef(p.id)}
                  className="text-lg"
                >
                  {p.correct ? '\u2705' : '\u274C'}
                </span>
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
              </div>
            )
          ))}
        </div>
      )}

      {/* Next Round Button */}
      {stage === 'done' && (
        <button
          ref={nextBtnRef}
          onClick={onNextRound}
          className="py-3 px-12 rounded-full font-black text-lg text-white uppercase tracking-wider cursor-pointer"
          style={{
            fontFamily: 'var(--font-display)',
            background: 'linear-gradient(135deg, #bc13fe, #ff007f)',
            boxShadow: '0 0 25px rgba(188, 19, 254, 0.5), 0 0 60px rgba(188, 19, 254, 0.2)',
          }}
        >
          Next Round
        </button>
      )}
    </div>
  );
}
