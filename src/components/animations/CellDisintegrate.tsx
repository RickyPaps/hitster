'use client';

import { useEffect, useRef, useCallback } from 'react';

interface CellDisintegrateProps {
  active: boolean;
  cellSize?: number;
  onComplete?: () => void;
}

interface Shard {
  // Grid position (fraction 0-1)
  gridX: number;
  gridY: number;
  // Target displacement
  targetX: number;
  targetY: number;
  rotation: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  skewX: number;
}

interface DustParticle {
  angle: number;
  dist: number;
}

const SHARD_COLORS = [
  'rgba(217, 70, 239, 0.9)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(217, 70, 239, 0.6)',
  'rgba(168, 85, 247, 0.7)',
  'rgba(99, 102, 241, 0.6)',
];

const TOTAL_DURATION = 1200; // ms
const GRID_SIZE = 4;
const DUST_COUNT = 8;

// Crack line angles in radians
const CRACK_ANGLES = [0, 45, 90, 135].map((deg) => (deg * Math.PI) / 180);

export default function CellDisintegrate({
  active,
  cellSize = 100,
  onComplete,
}: CellDisintegrateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const shardsRef = useRef<Shard[]>([]);
  const dustRef = useRef<DustParticle[]>([]);
  const startTimeRef = useRef<number>(0);
  const activeRef = useRef(false);

  const generateShards = useCallback(() => {
    const newShards: Shard[] = [];
    const shardW = cellSize / GRID_SIZE;
    const shardH = cellSize / GRID_SIZE;

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cx = (col - GRID_SIZE / 2 + 0.5) * shardW;
        const cy = (row - GRID_SIZE / 2 + 0.5) * shardH;
        const angle = Math.atan2(cy, cx);
        const dist = 60 + Math.random() * 100;

        newShards.push({
          gridX: col / GRID_SIZE,
          gridY: row / GRID_SIZE,
          targetX: Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
          targetY: Math.sin(angle) * dist + Math.random() * 30,
          rotation: (Math.random() - 0.5) * 540 * (Math.PI / 180),
          width: shardW + (Math.random() - 0.5) * 4,
          height: shardH + (Math.random() - 0.5) * 4,
          color: SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)],
          delay: Math.random() * 0.1,
          skewX: (Math.random() - 0.5) * 20 * (Math.PI / 180),
        });
      }
    }
    shardsRef.current = newShards;

    // Generate dust particles
    const dust: DustParticle[] = [];
    for (let i = 0; i < DUST_COUNT; i++) {
      dust.push({
        angle: (i / DUST_COUNT) * Math.PI * 2,
        dist: 40 + Math.random() * 60,
      });
    }
    dustRef.current = dust;
  }, [cellSize]);

  useEffect(() => {
    if (!active) {
      activeRef.current = false;
      return;
    }

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete?.();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    generateShards();
    startTimeRef.current = performance.now();
    activeRef.current = true;

    const completionTimer = setTimeout(() => {
      activeRef.current = false;
      onComplete?.();
    }, TOTAL_DURATION);

    const animate = (now: number) => {
      if (!activeRef.current) return;

      const elapsed = (now - startTimeRef.current) / 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      // Canvas needs overflow room for flying shards
      const margin = 200;
      const canvasW = rect.width + margin * 2;
      const canvasH = rect.height + margin * 2;

      if (canvas.width !== Math.round(canvasW * dpr) || canvas.height !== Math.round(canvasH * dpr)) {
        canvas.width = Math.round(canvasW * dpr);
        canvas.height = Math.round(canvasH * dpr);
        canvas.style.width = `${canvasW}px`;
        canvas.style.height = `${canvasH}px`;
        canvas.style.left = `${-margin}px`;
        canvas.style.top = `${-margin}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasW, canvasH);

      const centerX = canvasW / 2;
      const centerY = canvasH / 2;
      const half = cellSize / 2;

      // === 1. Flash effect (0-0.3s): starts at opacity 0.8, fades to 0 ===
      if (elapsed < 0.3) {
        const flashOpacity = 0.8 * (1 - elapsed / 0.3);
        const flashR = half + 4;
        const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, flashR * 1.5);
        grad.addColorStop(0, `rgba(239, 68, 68, ${0.6 * flashOpacity})`);
        grad.addColorStop(0.5, `rgba(217, 70, 239, ${0.3 * flashOpacity})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(centerX - half - 4, centerY - half - 4, cellSize + 8, cellSize + 8, 16);
        ctx.fill();
      }

      // === 2. Crack lines (0-0.15s draw, 0.15-0.65s fade) ===
      const crackDrawEnd = 0.15;
      const crackFadeEnd = 0.65;
      if (elapsed < crackFadeEnd) {
        const crackOpacity = elapsed > crackDrawEnd
          ? 0.8 * (1 - (elapsed - crackDrawEnd) / (crackFadeEnd - crackDrawEnd))
          : 0.8;

        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${crackOpacity})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        for (let i = 0; i < CRACK_ANGLES.length; i++) {
          const angle = CRACK_ANGLES[i];
          // Staggered draw progress
          const lineDelay = i * 0.01;
          const lineProgress = Math.min(1, Math.max(0, (elapsed - lineDelay) / crackDrawEnd));
          if (lineProgress <= 0) continue;

          const eased = 1 - (1 - lineProgress) * (1 - lineProgress);
          const lineLen = half * eased;

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(
            centerX + Math.cos(angle) * lineLen,
            centerY + Math.sin(angle) * lineLen
          );
          ctx.stroke();
        }
        ctx.restore();
      }

      // === 3. Shards (delay+0.15s start, 0.7s duration, ease power2.out) ===
      const shards = shardsRef.current;
      for (let i = 0; i < shards.length; i++) {
        const s = shards[i];
        const shardStart = s.delay + 0.15;
        const shardDur = 0.7;
        const t = elapsed - shardStart;

        if (t < 0) {
          // Draw shard at initial position
          const sx = centerX - half + s.gridX * cellSize;
          const sy = centerY - half + s.gridY * cellSize;
          ctx.save();
          ctx.fillStyle = s.color;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 8;
          ctx.fillRect(sx, sy, s.width, s.height);
          ctx.restore();
          continue;
        }
        if (t > shardDur) continue;

        const progress = t / shardDur;
        const eased = 1 - (1 - progress) * (1 - progress); // power2.out

        const dx = eased * s.targetX;
        const dy = eased * s.targetY;
        const rot = eased * s.rotation;
        const skew = eased * s.skewX;
        const scale = 1 - eased;
        const opacity = 1 - eased;

        const sx = centerX - half + s.gridX * cellSize + dx;
        const sy = centerY - half + s.gridY * cellSize + dy;

        if (opacity < 0.01 || scale < 0.01) continue;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(sx + s.width / 2, sy + s.height / 2);
        ctx.rotate(rot);
        // Apply skew via transform matrix
        ctx.transform(1, 0, Math.tan(skew), 1, 0, 0);
        ctx.scale(scale, scale);

        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(-s.width / 2, -s.height / 2, s.width, s.height);
        ctx.restore();
      }

      // === 4. Dust particles (0.25s delay, 0.6s duration) ===
      const dustStart = 0.25;
      const dustDur = 0.6;
      const dustT = elapsed - dustStart;
      if (dustT >= 0 && dustT <= dustDur) {
        const dust = dustRef.current;
        const dp = dustT / dustDur;
        const eased = 1 - (1 - dp) * (1 - dp);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < dust.length; i++) {
          const d = dust[i];
          const dx = Math.cos(d.angle) * d.dist * eased;
          const dy = Math.sin(d.angle) * d.dist * eased;
          // Scale: 0 -> peak -> 0.3 at end
          const dustScale = dp < 0.3 ? (dp / 0.3) : 1 - (dp - 0.3) / 0.7 * 0.7;
          const dustOpacity = 0.8 * (1 - eased);
          const r = 2 * dustScale;

          if (r < 0.2 || dustOpacity < 0.01) continue;

          ctx.globalAlpha = dustOpacity;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(centerX + dx, centerY + dy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (elapsed < TOTAL_DURATION / 1000) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvasW, canvasH);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(completionTimer);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, [active, cellSize, generateShards, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    />
  );
}
