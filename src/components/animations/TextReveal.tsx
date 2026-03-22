'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface TextRevealProps {
  text: string;
  mode: 'typewriter' | 'shimmer';
  speed?: number; // chars per second for typewriter
  shimmerDuration?: number; // seconds for shimmer
  delay?: number; // seconds
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function TextReveal({
  text,
  mode,
  speed = 40,
  shimmerDuration = 1.5,
  delay = 0,
  onComplete,
  className,
  style,
}: TextRevealProps) {
  // Respect prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  if (reducedMotion) {
    return <span className={className} style={style}>{text}</span>;
  }

  if (mode === 'typewriter') {
    return (
      <TypewriterText
        text={text}
        speed={speed}
        delay={delay}
        onComplete={onComplete}
        className={className}
        style={style}
      />
    );
  }

  return (
    <ShimmerText
      text={text}
      duration={shimmerDuration}
      delay={delay}
      onComplete={onComplete}
      className={className}
      style={style}
    />
  );
}

function TypewriterText({
  text,
  speed,
  delay,
  onComplete,
  className,
  style,
}: {
  text: string;
  speed: number;
  delay: number;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [displayedChars, setDisplayedChars] = useState(0);
  const [started, setStarted] = useState(false);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const delayTimer = setTimeout(() => setStarted(true), delay * 1000);
    return () => clearTimeout(delayTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    if (displayedChars >= text.length) {
      onCompleteRef.current?.();
      return;
    }
    const interval = 1000 / speed;
    const timer = setTimeout(() => setDisplayedChars((c) => c + 1), interval);
    return () => clearTimeout(timer);
  }, [started, displayedChars, text.length, speed]);

  // Blinking cursor with GSAP
  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.to(el, { opacity: 0, duration: 0.3, repeat: -1, yoyo: true, ease: 'power1.inOut' });
    });
    return () => ctx.revert();
  }, [started]);

  const isComplete = displayedChars >= text.length;

  return (
    <span className={className} style={style}>
      {text.slice(0, displayedChars)}
      {!isComplete && started && (
        <span
          ref={cursorRef}
          style={{ display: 'inline-block', width: '2px', height: '1em', background: 'currentColor', verticalAlign: 'text-bottom', marginLeft: '1px' }}
        />
      )}
    </span>
  );
}

function ShimmerText({
  text,
  duration,
  delay,
  onComplete,
  className,
  style,
}: {
  text: string;
  duration: number;
  delay: number;
  onComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { backgroundPosition: '-200% center' },
        {
          backgroundPosition: '200% center',
          duration,
          delay,
          ease: 'none',
          onComplete: () => onCompleteRef.current?.(),
        }
      );
    });
    return () => ctx.revert();
  }, [duration, delay]);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        ...style,
        backgroundImage: 'linear-gradient(90deg, currentColor 0%, #ff007f 25%, #00f2ff 50%, #EAB308 75%, currentColor 100%)',
        backgroundSize: '200% auto',
        backgroundPosition: '-200% center',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
      }}
    >
      {text}
    </span>
  );
}
