'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHEEL_SEGMENTS, type WheelSegment } from '@/types/game';
import { drawWheel } from '@/lib/wheel/draw-wheel';
import { calculateSpinAnimation, easeOutQuintic } from '@/lib/wheel/animate-spin';
import CategoryBadge from '@/components/shared/CategoryBadge';
import ScreenShake from '@/components/animations/ScreenShake';
import { useAudio, playSpinTick } from '@/hooks/useAudio';
import { fireFromElement } from '@/lib/confetti';

const WHEEL_DISPLAY_SIZE = 400;

interface WheelSpinnerProps {
  onSpinComplete: () => void;
  isSpinning: boolean;
  resultIndex: number | null;
  swipeVelocity?: number;
  segments?: WheelSegment[];
}

type LandingStage = 'idle' | 'decel' | 'impact' | 'reveal';

export default function WheelSpinner({ onSpinComplete, isSpinning, resultIndex, swipeVelocity, segments: customSegments }: WheelSpinnerProps) {
  const segments = customSegments ?? WHEEL_SEGMENTS;
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const prevSegmentRef = useRef(-1);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [landed, setLanded] = useState(false);
  const [landingStage, setLandingStage] = useState<LandingStage>('idle');
  const [showVignette, setShowVignette] = useState(false);
  const { playSound } = useAudio();

  // Cache canvas context and draw initial wheel (DPI-aware)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WHEEL_DISPLAY_SIZE * dpr;
    canvas.height = WHEEL_DISPLAY_SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    drawWheel(ctx, WHEEL_DISPLAY_SIZE, 0, segments);
  }, [segments]);

  // Reset landing state when a new spin starts
  useEffect(() => {
    if (isSpinning) {
      setLandingStage('idle');
      setShowVignette(false);
      setShowResult(false);
      setLanded(false);
    }
  }, [isSpinning]);

  // Spin animation
  useEffect(() => {
    if (!isSpinning || resultIndex === null) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    setSpinning(true);
    setShowResult(false);
    setLanded(false);
    setLandingStage('idle');
    setShowVignette(false);
    prevSegmentRef.current = -1;

    const velocity = swipeVelocity ?? (0.8 + Math.random() * 0.7);
    const { totalRotation, duration } = calculateSpinAnimation(resultIndex, velocity, segments.length);
    const startTime = performance.now();
    const size = WHEEL_DISPLAY_SIZE;
    const segmentCount = segments.length;
    const arc = (2 * Math.PI) / segmentCount;

    rotationRef.current = 0;
    let hasEnteredDecel = false;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuintic(progress);
      const currentRotation = progress >= 1 ? totalRotation : totalRotation * eased;

      rotationRef.current = currentRotation;
      drawWheel(ctx, size, currentRotation, segments);

      // Stage 1: Deceleration vignette (last 15% of spin)
      if (progress > 0.85 && !hasEnteredDecel) {
        hasEnteredDecel = true;
        setLandingStage('decel');
        setShowVignette(true);
      }

      // Segment tick sound
      const normalizedRotation = ((currentRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const pointerAngle = (normalizedRotation + Math.PI / 2) % (2 * Math.PI);
      const currentSegment = Math.floor(pointerAngle / arc) % segmentCount;
      if (currentSegment !== prevSegmentRef.current && progress < 0.98) {
        playSpinTick();
      }
      prevSegmentRef.current = currentSegment;

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Stage 2: Impact
        setLandingStage('impact');
        playSound('wheelLand');
        setSpinning(false);
        setLanded(true);

        // Stage 3: Confetti (immediately after impact)
        if (wheelContainerRef.current) {
          fireFromElement(wheelContainerRef.current, {
            particleCount: 30,
            colors: [segments[resultIndex].color],
          });
        }

        // Stage 4: Category reveal (400ms after impact)
        setTimeout(() => {
          setLandingStage('reveal');
          setShowResult(true);
        }, 400);

        // Complete callback at 2s total
        setTimeout(() => {
          onSpinComplete();
        }, 2000);
      }
    };

    drawWheel(ctx, size, 0, segments);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSpinning, resultIndex]);

  const landedColor = landed && resultIndex !== null ? segments[resultIndex].color : undefined;

  return (
    <ScreenShake trigger={landed} intensity="medium">
      <div className="flex flex-col items-center gap-4">
        <div ref={wheelContainerRef} className="relative max-w-[400px] w-full">
          {/* Outer glow ring */}
          <div
            className="absolute -inset-3 rounded-full pointer-events-none transition-all duration-500"
            style={{
              border: `2px solid ${landed && landedColor ? landedColor : 'rgba(188, 19, 254, 0.6)'}`,
              boxShadow: landed && landedColor
                ? `0 0 60px ${landedColor}, 0 0 120px ${landedColor}40`
                : '0 0 50px rgba(188, 19, 254, 0.4)',
            }}
          />
          <div
            className="absolute -inset-1 rounded-full pointer-events-none opacity-50"
            style={{
              border: '12px solid rgba(188, 19, 254, 0.15)',
              filter: 'blur(6px)',
            }}
          />

          <div className="relative overflow-hidden rounded-full">
            {/* Deceleration vignette overlay */}
            <AnimatePresence>
              {showVignette && !landed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 rounded-full pointer-events-none z-10"
                  style={{
                    background: 'radial-gradient(circle at center, transparent 40%, rgba(13, 2, 22, 0.8) 100%)',
                  }}
                />
              )}
            </AnimatePresence>

            {/* Impact shockwave ring */}
            <AnimatePresence>
              {landingStage === 'impact' && landedColor && (
                <motion.div
                  key="shockwave"
                  initial={{ scale: 0.3, opacity: 0.9 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full pointer-events-none z-20"
                  style={{
                    border: `3px solid ${landedColor}`,
                    boxShadow: `0 0 30px ${landedColor}, 0 0 60px ${landedColor}60`,
                  }}
                />
              )}
            </AnimatePresence>

            <canvas
              ref={canvasRef}
              width={400}
              height={400}
              className="max-w-full w-full h-auto relative"
              style={{ filter: spinning ? 'brightness(1.1)' : 'brightness(1)' }}
            />
          </div>
        </div>

        {/* Category badge reveal */}
        <AnimatePresence>
          {showResult && resultIndex !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <CategoryBadge category={segments[resultIndex].category} large />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenShake>
  );
}
