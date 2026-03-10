'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHEEL_SEGMENTS } from '@/types/game';
import { drawWheel } from '@/lib/wheel/draw-wheel';
import { calculateSpinFromMomentum, easeOutQuintic } from '@/lib/wheel/animate-spin';
import CategoryBadge from '@/components/shared/CategoryBadge';

interface PlayerWheelSpinnerProps {
  onSwipe: (velocity: number) => void;
  isSpinning: boolean;
  resultIndex: number | null;
  swipeVelocity: number | undefined;
  onSpinComplete: () => void;
}

type SpinState = 'IDLE' | 'DRAGGING' | 'MOMENTUM' | 'SERVER_SPIN' | 'COMPLETE';

// Velocity sample for tracking angular speed
interface VelocitySample {
  angle: number;
  time: number;
}

const FRICTION = 0.995;
const MIN_FLICK_VELOCITY = 0.003; // rad/ms threshold
const VELOCITY_HISTORY = 5;

export default function PlayerWheelSpinner({
  onSwipe,
  isSpinning,
  resultIndex,
  swipeVelocity,
  onSpinComplete,
}: PlayerWheelSpinnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const velocityRef = useRef(0); // current angular velocity (rad/ms)
  const spinStateRef = useRef<SpinState>('IDLE');
  const hasFiredSwipeRef = useRef(false);

  // Drag tracking
  const lastAngleRef = useRef(0);
  const velocitySamplesRef = useRef<VelocitySample[]>([]);
  const centerRef = useRef({ x: 0, y: 0 });

  const [spinState, setSpinState] = useState<SpinState>('IDLE');
  const [showResult, setShowResult] = useState(false);

  // Keep ref in sync with state for use in rAF callbacks
  const updateSpinState = useCallback((s: SpinState) => {
    spinStateRef.current = s;
    setSpinState(s);
  }, []);

  // Cache canvas context and draw initial wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    drawWheel(ctx, canvas.width, 0);
  }, []);

  // Redraw helper
  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    drawWheel(ctx, canvas.width, rotationRef.current);
  }, []);

  // Calculate touch angle relative to wheel center
  const getTouchAngle = useCallback((clientX: number, clientY: number) => {
    const { x, y } = centerRef.current;
    return Math.atan2(clientY - y, clientX - x);
  }, []);

  // Update wheel center position (for angle calc)
  const updateCenter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }, []);

  // Sample angular velocity from recent frames
  const sampleVelocity = useCallback((angle: number) => {
    const now = performance.now();
    const samples = velocitySamplesRef.current;
    samples.push({ angle, time: now });
    if (samples.length > VELOCITY_HISTORY) samples.shift();
  }, []);

  const computeVelocity = useCallback((): number => {
    const samples = velocitySamplesRef.current;
    if (samples.length < 2) return 0;
    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = last.time - first.time;
    if (dt === 0) return 0;

    // Sum angular deltas (handling wrapping)
    let totalDelta = 0;
    for (let i = 1; i < samples.length; i++) {
      let d = samples[i].angle - samples[i - 1].angle;
      // Normalize to [-PI, PI]
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      totalDelta += d;
    }
    return totalDelta / dt; // rad/ms
  }, []);

  // --- MOMENTUM animation loop ---
  const runMomentum = useCallback(() => {
    const state = spinStateRef.current;
    if (state !== 'MOMENTUM') return;

    velocityRef.current *= FRICTION;
    rotationRef.current += velocityRef.current * 16; // ~16ms per frame
    redraw();

    // If velocity drops below threshold and server hasn't responded, keep going slowly
    if (Math.abs(velocityRef.current) > 0.0001) {
      animationRef.current = requestAnimationFrame(runMomentum);
    } else {
      // Wheel stopped naturally before server responded — keep idle rotation visible
      velocityRef.current = 0;
    }
  }, [redraw]);

  // --- SERVER_SPIN: animate from current state to target ---
  useEffect(() => {
    if (!isSpinning || resultIndex === null) return;
    // Only transition if we're in MOMENTUM or IDLE (server result arrived)
    const state = spinStateRef.current;
    if (state !== 'MOMENTUM' && state !== 'IDLE') return;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    updateSpinState('SERVER_SPIN');
    setShowResult(false);

    const currentRotation = rotationRef.current;
    const currentVelocity = velocityRef.current;

    const { targetRotation, duration } = calculateSpinFromMomentum(
      resultIndex,
      currentRotation,
      currentVelocity,
      3
    );

    const startTime = performance.now();
    const startRotation = currentRotation;
    const totalDelta = targetRotation - startRotation;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuintic(progress);

      rotationRef.current = startRotation + totalDelta * eased;
      redraw();

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = targetRotation;
        redraw();
        updateSpinState('COMPLETE');
        setShowResult(true);
        setTimeout(onSpinComplete, 1500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSpinning, resultIndex, redraw, updateSpinState, onSpinComplete]);

  // --- Touch handlers ---
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const state = spinStateRef.current;
    if (state !== 'IDLE' && state !== 'MOMENTUM') return;
    if (hasFiredSwipeRef.current) return;

    e.preventDefault();
    updateCenter();

    // Cancel momentum if active
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    const touch = e.touches[0];
    lastAngleRef.current = getTouchAngle(touch.clientX, touch.clientY);
    velocitySamplesRef.current = [{ angle: lastAngleRef.current, time: performance.now() }];
    updateSpinState('DRAGGING');
  }, [getTouchAngle, updateCenter, updateSpinState]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (spinStateRef.current !== 'DRAGGING') return;
    e.preventDefault();

    const touch = e.touches[0];
    const angle = getTouchAngle(touch.clientX, touch.clientY);

    let delta = angle - lastAngleRef.current;
    // Normalize delta to [-PI, PI]
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    rotationRef.current += delta;
    lastAngleRef.current = angle;
    sampleVelocity(angle);
    redraw();
  }, [getTouchAngle, redraw, sampleVelocity]);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (spinStateRef.current !== 'DRAGGING') return;
    if (hasFiredSwipeRef.current) return;
    e.preventDefault();

    const velocity = computeVelocity();

    if (Math.abs(velocity) >= MIN_FLICK_VELOCITY) {
      // Sufficient velocity — start momentum
      velocityRef.current = velocity;
      updateSpinState('MOMENTUM');
      hasFiredSwipeRef.current = true;

      // Haptic feedback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }

      // Notify server (convert rad/ms to a 0.3-3.0 velocity scale)
      const normalizedVelocity = Math.max(0.3, Math.min(3.0, Math.abs(velocity) * 300));
      onSwipe(normalizedVelocity);

      animationRef.current = requestAnimationFrame(runMomentum);
    } else {
      // Not enough velocity — return to idle
      updateSpinState('IDLE');
    }
  }, [computeVelocity, updateSpinState, onSwipe, runMomentum]);

  // --- Mouse handlers (desktop testing) ---
  const isDraggingMouseRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const state = spinStateRef.current;
    if (state !== 'IDLE' && state !== 'MOMENTUM') return;
    if (hasFiredSwipeRef.current) return;

    e.preventDefault();
    updateCenter();

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    lastAngleRef.current = getTouchAngle(e.clientX, e.clientY);
    velocitySamplesRef.current = [{ angle: lastAngleRef.current, time: performance.now() }];
    isDraggingMouseRef.current = true;
    updateSpinState('DRAGGING');
  }, [getTouchAngle, updateCenter, updateSpinState]);

  // Window-level mouse handlers for drag continuation outside canvas
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingMouseRef.current || spinStateRef.current !== 'DRAGGING') return;

      const angle = getTouchAngle(e.clientX, e.clientY);
      let delta = angle - lastAngleRef.current;
      if (delta > Math.PI) delta -= 2 * Math.PI;
      if (delta < -Math.PI) delta += 2 * Math.PI;

      rotationRef.current += delta;
      lastAngleRef.current = angle;
      sampleVelocity(angle);
      redraw();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDraggingMouseRef.current || spinStateRef.current !== 'DRAGGING') return;
      if (hasFiredSwipeRef.current) return;
      isDraggingMouseRef.current = false;

      const velocity = computeVelocity();

      if (Math.abs(velocity) >= MIN_FLICK_VELOCITY) {
        velocityRef.current = velocity;
        updateSpinState('MOMENTUM');
        hasFiredSwipeRef.current = true;

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }

        const normalizedVelocity = Math.max(0.3, Math.min(3.0, Math.abs(velocity) * 300));
        onSwipe(normalizedVelocity);

        animationRef.current = requestAnimationFrame(runMomentum);
      } else {
        updateSpinState('IDLE');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [getTouchAngle, sampleVelocity, redraw, computeVelocity, updateSpinState, onSwipe, runMomentum]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const wheelSize = Math.min(300, typeof window !== 'undefined' ? window.innerWidth - 60 : 300);

  const isInteractive = spinState === 'IDLE' && !hasFiredSwipeRef.current;
  const isAnimating = spinState === 'MOMENTUM' || spinState === 'SERVER_SPIN';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden touch-none" style={{ background: '#0d0216', overscrollBehavior: 'none' }}>
      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-15 disco-grid-bg" />
        <div
          className="absolute"
          style={{
            top: '-20%', left: '-20%', width: '70%', height: '70%',
            background: 'radial-gradient(circle, rgba(188, 19, 254, 0.25) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-20%', right: '-20%', width: '70%', height: '70%',
            background: 'radial-gradient(circle, rgba(255, 0, 127, 0.15) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-0 left-[15%] w-20 h-full origin-top -rotate-12 opacity-20"
          style={{ background: 'linear-gradient(to bottom, rgba(188, 19, 254, 0.5), transparent 50%)' }}
        />
        <div
          className="absolute top-0 right-[15%] w-20 h-full origin-top rotate-12 opacity-15"
          style={{ background: 'linear-gradient(to bottom, rgba(0, 242, 255, 0.4), transparent 50%)' }}
        />
      </div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center mb-6"
      >
        <h1
          className="text-2xl font-black uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-display)',
            color: 'white',
            textShadow: '0 0 10px rgba(217, 70, 239, 0.6), 0 0 30px rgba(217, 70, 239, 0.3)',
          }}
        >
          Your Turn!
        </h1>
        <p className="text-xs font-bold uppercase mt-1" style={{ color: 'rgba(0, 242, 255, 0.8)', letterSpacing: '0.3em' }}>
          Spin the Category Wheel
        </p>
      </motion.div>

      {/* Wheel with glow ring */}
      <div
        className="relative z-10"
        style={{ cursor: isInteractive ? 'grab' : spinState === 'DRAGGING' ? 'grabbing' : 'default' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
      >
        {/* Outer neon glow ring */}
        <div
          className="absolute -inset-3 rounded-full pointer-events-none"
          style={{
            border: '2px solid rgba(188, 19, 254, 0.5)',
            boxShadow: isAnimating
              ? '0 0 40px rgba(188, 19, 254, 0.6), 0 0 80px rgba(188, 19, 254, 0.3)'
              : '0 0 30px rgba(188, 19, 254, 0.4)',
            transition: 'box-shadow 0.3s',
          }}
        />
        <div
          className="absolute -inset-1 rounded-full pointer-events-none opacity-30"
          style={{ border: '8px solid rgba(188, 19, 254, 0.2)' }}
        />
        <canvas
          ref={canvasRef}
          width={wheelSize}
          height={wheelSize}
          className="max-w-full touch-none relative select-none"
          style={{ willChange: 'auto' }}
        />
      </div>

      {/* Drag prompt */}
      <AnimatePresence>
        {isInteractive && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mt-8 flex flex-col items-center gap-3"
          >
            <motion.div
              animate={{ rotate: [0, -20, 20, -20, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="flex flex-col items-center"
            >
              <span className="text-3xl" style={{ color: '#00f2ff' }}>
                &#8635;
              </span>
            </motion.div>
            <p
              className="text-xl font-black tracking-wider uppercase italic"
              style={{
                color: 'white',
                textShadow: '0 0 10px rgba(255, 0, 127, 0.5)',
              }}
            >
              Drag & Flick to Spin!
            </p>
            <p className="text-xs" style={{ color: 'rgba(148, 163, 184, 0.5)' }}>
              Spin the wheel with your finger
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spinning state */}
      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mt-6 text-center"
          >
            <motion.p
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="text-lg font-bold uppercase"
              style={{ color: '#bc13fe', letterSpacing: '0.2em' }}
            >
              Spinning...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result badge */}
      <AnimatePresence>
        {showResult && resultIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.3, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative z-10 mt-6 flex flex-col items-center gap-3"
          >
            <CategoryBadge category={WHEEL_SEGMENTS[resultIndex].category} large />
            <p className="text-sm font-bold" style={{ color: 'rgba(148, 163, 184, 0.6)' }}>
              Watch the host screen!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
