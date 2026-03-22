'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { useAudio } from '@/hooks/useAudio';

interface GuessInputProps {
  category: string;
  disabled: boolean;
  onGuessSubmitted: () => void;
  timerSeconds?: number;
}

const DECADE_OPTIONS = [
  { label: "60's", value: '60' },
  { label: "70's", value: '70' },
  { label: "80's", value: '80' },
  { label: "90's", value: '90' },
  { label: "00's", value: '0' },
  { label: "10's", value: '10' },
  { label: "20's", value: '20' },
];

export default function GuessInput({ category, disabled, onGuessSubmitted, timerSeconds }: GuessInputProps) {
  const [guess, setGuess] = useState('');
  const [locked, setLocked] = useState(false);
  const { playSound } = useAudio();

  const lockedRef = useRef<HTMLDivElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);
  const glowTweenRef = useRef<gsap.core.Tween | null>(null);

  // Timer pressure: haptic + tick at <3s
  useEffect(() => {
    if (timerSeconds !== undefined && timerSeconds <= 3 && timerSeconds > 0 && !locked) {
      navigator.vibrate?.(30);
      playSound('tick');
    }
  }, [timerSeconds, locked, playSound]);

  // Border pressure class
  const pressureClass = !locked && timerSeconds !== undefined
    ? timerSeconds <= 3 ? 'timer-pressure-3' : timerSeconds <= 5 ? 'timer-pressure-5' : ''
    : '';

  const placeholder: Record<string, string> = {
    // Music categories
    year: 'Enter the year (e.g. 2005)',
    artist: 'Who is the artist?',
    title: 'What is the song title?',
    'year-approx': 'Enter the year (e.g. 2005)',
    album: 'What album is this from?',
    decade: '',
    // Movie categories
    director: 'Who directed this movie?',
    'movie-title': 'What is the movie title?',
    genre: 'What genre is this movie?',
  };
  const placeholderText = placeholder[category] || 'Enter your guess...';

  const isYear = category === 'year' || category === 'year-approx';
  const isDecade = category === 'decade';

  // Locked stamp entrance animation
  useEffect(() => {
    if (!locked) return;
    const el = lockedRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { scale: 1.4, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
      );
    });
    return () => ctx.revert();
  }, [locked]);

  // Pulsing glow on submit button when input is non-empty
  useEffect(() => {
    const el = submitBtnRef.current;
    if (!el || locked) return;

    if (isDecade ? guess : guess.trim()) {
      const ctx = gsap.context(() => {
        glowTweenRef.current = gsap.fromTo(el,
          { boxShadow: '0 0 15px rgba(217,70,239,0.4), 0 0 30px rgba(139,92,246,0.2)' },
          {
            boxShadow: '0 0 25px rgba(217,70,239,0.7), 0 0 45px rgba(139,92,246,0.4)',
            yoyo: true,
            repeat: -1,
            duration: 0.75,
            ease: 'sine.inOut',
          }
        );
      });
      return () => ctx.revert();
    } else {
      if (glowTweenRef.current) {
        glowTweenRef.current.kill();
        glowTweenRef.current = null;
      }
      gsap.set(el, { boxShadow: '0 0 15px rgba(217,70,239,0.4), 0 0 30px rgba(139,92,246,0.2)' });
    }
  }, [guess, locked, isDecade]);

  const handleTap = useCallback(() => {
    const el = submitBtnRef.current;
    if (!el) return;
    gsap.to(el, { scale: 0.92, rotation: -1, duration: 0.1, ease: 'power2.in', onComplete: () => {
      gsap.to(el, { scale: 1, rotation: 0, duration: 0.2, ease: 'elastic.out(1, 0.5)' });
    }});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || disabled || locked) return;

    handleTap();
    navigator.vibrate?.([30, 50, 80]);
    setLocked(true);
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.PLAYER_SUBMIT_GUESS, { guess: guess.trim() });
    onGuessSubmitted();
  };

  if (isDecade) {
    return (
      <div className={`relative w-full max-w-sm ${pressureClass}`}>
        {/* Timer vignette overlay */}
        {timerSeconds !== undefined && timerSeconds <= 3 && !locked && (
          <div className="timer-vignette" />
        )}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <select
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            disabled={disabled || locked}
            aria-label="Select a decade"
            className="w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl text-center text-base sm:text-lg font-medium disabled:opacity-50 neon-input appearance-none cursor-pointer"
            style={{
              background: 'rgba(20, 12, 50, 0.85)',
              color: guess ? '#e2e8f0' : 'rgba(148, 163, 184, 0.6)',
              border: '1.5px solid rgba(217, 70, 239, 0.4)',
              boxShadow: '0 0 8px rgba(217, 70, 239, 0.1)',
            }}
          >
            <option value="" disabled>Pick a decade...</option>
            {DECADE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {locked ? (
            <div
              ref={lockedRef}
              className="stamp-lock w-full py-3.5 rounded-xl font-black text-white text-lg uppercase tracking-wider text-center"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 25px rgba(34,197,94,0.5)' }}
            >
              Locked In!
            </div>
          ) : (
            <button
              ref={submitBtnRef}
              type="submit"
              disabled={disabled || !guess}
              className="w-full py-3.5 rounded-xl font-bold text-white text-lg uppercase tracking-wider disabled:opacity-40 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
                boxShadow: '0 0 15px rgba(217,70,239,0.4), 0 0 30px rgba(139,92,246,0.2)',
              }}
            >
              Submit Guess
            </button>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className={`relative w-full max-w-sm ${pressureClass}`}>
      {/* Timer vignette overlay */}
      {timerSeconds !== undefined && timerSeconds <= 3 && !locked && (
        <div className="timer-vignette" />
      )}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <input
          type={isYear ? 'tel' : 'text'}
          inputMode={isYear ? 'numeric' : 'text'}
          pattern={isYear ? '[0-9]*' : undefined}
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          onFocus={(e) => {
            setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
          }}
          placeholder={placeholderText}
          aria-label={placeholderText}
          disabled={disabled || locked}
          autoFocus
          className="w-full py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl text-center text-base sm:text-lg font-medium disabled:opacity-50 neon-input"
          style={{
            background: 'rgba(20, 12, 50, 0.85)',
            color: '#e2e8f0',
            border: '1.5px solid rgba(217, 70, 239, 0.4)',
            boxShadow: '0 0 8px rgba(217, 70, 239, 0.1)',
          }}
        />
        {locked ? (
          <div
            ref={lockedRef}
            className="stamp-lock w-full py-3.5 rounded-xl font-black text-white text-lg uppercase tracking-wider text-center"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 25px rgba(34,197,94,0.5)' }}
          >
            Locked In!
          </div>
        ) : (
          <button
            ref={submitBtnRef}
            type="submit"
            disabled={disabled || !guess.trim()}
            className="w-full py-3.5 rounded-xl font-bold text-white text-lg uppercase tracking-wider disabled:opacity-40 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
              boxShadow: '0 0 15px rgba(217,70,239,0.4), 0 0 30px rgba(139,92,246,0.2)',
            }}
          >
            Submit Guess
          </button>
        )}
      </form>
    </div>
  );
}
