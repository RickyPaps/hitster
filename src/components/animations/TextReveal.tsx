'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

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

  const isComplete = displayedChars >= text.length;

  return (
    <span className={className} style={style}>
      {text.slice(0, displayedChars)}
      {!isComplete && started && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.6 }}
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
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  return (
    <motion.span
      className={className}
      initial={{ backgroundPosition: '-200% center' }}
      animate={{ backgroundPosition: '200% center' }}
      transition={{ duration, delay, ease: 'linear' }}
      onAnimationComplete={() => onCompleteRef.current?.()}
      style={{
        ...style,
        backgroundImage: 'linear-gradient(90deg, currentColor 0%, #ff007f 25%, #00f2ff 50%, #EAB308 75%, currentColor 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        display: 'inline-block',
      }}
    >
      {text}
    </motion.span>
  );
}
