'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHEEL_SEGMENTS } from '@/types/game';
import { drawWheel } from '@/lib/wheel/draw-wheel';
import { calculateSpinAnimation, easeOutQuintic } from '@/lib/wheel/animate-spin';
import CategoryBadge from '@/components/shared/CategoryBadge';
import { useAudio, playSpinTick } from '@/hooks/useAudio';

interface WheelSpinnerProps {
  onSpinComplete: () => void;
  isSpinning: boolean;
  resultIndex: number | null;
  swipeVelocity?: number;
}

export default function WheelSpinner({ onSpinComplete, isSpinning, resultIndex, swipeVelocity }: WheelSpinnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const prevSegmentRef = useRef(-1);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const { playSound } = useAudio();

  // Cache canvas context and draw initial wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    drawWheel(ctx, canvas.width, 0);
  }, []);

  // Spin animation — draws directly to canvas without React state updates
  useEffect(() => {
    if (!isSpinning || resultIndex === null) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    setSpinning(true);
    setShowResult(false);
    prevSegmentRef.current = -1;

    // Use provided swipeVelocity or random fallback for host-only spin
    const velocity = swipeVelocity ?? (0.8 + Math.random() * 0.7);
    const { totalRotation, duration } = calculateSpinAnimation(resultIndex, velocity);
    const startTime = performance.now();
    const size = canvas.width;
    const segmentCount = WHEEL_SEGMENTS.length;
    const arc = (2 * Math.PI) / segmentCount;

    rotationRef.current = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuintic(progress);
      const currentRotation = progress >= 1 ? totalRotation : totalRotation * eased;

      rotationRef.current = currentRotation;
      drawWheel(ctx, size, currentRotation);

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
        playSound('wheelLand');
        setSpinning(false);
        setShowResult(true);
        setTimeout(() => {
          onSpinComplete();
        }, 1500);
      }
    };

    // Draw initial frame at rotation 0
    drawWheel(ctx, size, 0);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSpinning, resultIndex]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative max-w-[400px] w-full">
        {/* Outer glow ring — matches Stitch neon purple border */}
        <div
          className="absolute -inset-3 rounded-full pointer-events-none"
          style={{
            border: '2px solid rgba(188, 19, 254, 0.6)',
            boxShadow: '0 0 50px rgba(188, 19, 254, 0.4)',
          }}
        />
        <div
          className="absolute -inset-1 rounded-full pointer-events-none opacity-50"
          style={{
            border: '12px solid rgba(188, 19, 254, 0.15)',
            filter: 'blur(6px)',
          }}
        />
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="max-w-full w-full h-auto relative"
          style={{ filter: spinning ? 'brightness(1.1)' : 'brightness(1)' }}
        />
      </div>
      <AnimatePresence>
        {showResult && resultIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <CategoryBadge category={WHEEL_SEGMENTS[resultIndex].category} large />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
