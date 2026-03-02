'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHEEL_SEGMENTS } from '@/types/game';
import CategoryBadge from '@/components/shared/CategoryBadge';

interface WheelSpinnerProps {
  onSpinComplete: () => void;
  isSpinning: boolean;
  resultIndex: number | null;
}

export default function WheelSpinner({ onSpinComplete, isSpinning, resultIndex }: WheelSpinnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const animationRef = useRef<number | null>(null);

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, size: number, currentRotation: number) => {
    const center = size / 2;
    const radius = center - 10;
    const segments = WHEEL_SEGMENTS;
    const arc = (2 * Math.PI) / segments.length;

    ctx.clearRect(0, 0, size, size);

    segments.forEach((seg, i) => {
      const startAngle = i * arc + currentRotation;
      const endAngle = startAngle + arc;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(11, size / 28)}px system-ui`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label, radius - 20, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 25, 0, 2 * Math.PI);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(center - 12, 5);
    ctx.lineTo(center + 12, 5);
    ctx.lineTo(center, 30);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    drawWheel(ctx, size, rotation);
  }, [rotation, drawWheel]);

  useEffect(() => {
    if (!isSpinning || resultIndex === null) return;

    setSpinning(true);
    setShowResult(false);

    const segments = WHEEL_SEGMENTS.length;
    const arc = (2 * Math.PI) / segments;
    // Target: pointer at top (= -PI/2), land on resultIndex center
    // Final rotation = fullSpins * 2PI + offset to land on segment
    const targetAngle = -(resultIndex * arc + arc / 2) - Math.PI / 2;
    const fullSpins = 5 + Math.random() * 3;
    const totalRotation = fullSpins * 2 * Math.PI + targetAngle - (rotation % (2 * Math.PI));

    const startRotation = rotation;
    const startTime = Date.now();
    const duration = 3500; // ms

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRotation = startRotation + totalRotation * eased;

      setRotation(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setShowResult(true);
        setTimeout(() => {
          onSpinComplete();
        }, 1500);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isSpinning, resultIndex]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="max-w-full"
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
