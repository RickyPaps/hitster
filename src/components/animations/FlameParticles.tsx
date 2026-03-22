'use client';

import { useEffect, useRef, useCallback } from 'react';

interface FlameParticlesProps {
  active: boolean;
  count?: number;
  effectDuration?: number;
  colors?: string[];
  width?: number;
}

interface Ember {
  x: number; // final x offset in px from center
  y: number; // final y offset in px (negative = upward)
  size: number;
  color: string;
  delay: number;
  duration: number;
  wobble: number;
}

const FIRE_COLORS = ['#ff4500', '#ff6b00', '#ff9500', '#ffb700', '#EAB308', '#fff176', '#ffffff'];

export default function FlameParticles({
  active,
  count = 20,
  effectDuration = 2,
  colors = FIRE_COLORS,
  width = 120,
}: FlameParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const embersRef = useRef<Ember[]>([]);
  const startTimeRef = useRef<number>(0);

  const generateEmbers = useCallback(() => {
    const newEmbers: Ember[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / count;
      newEmbers.push({
        x: (Math.random() - 0.5) * width,
        y: -(40 + Math.random() * 80),
        size: 3 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: t * effectDuration * 0.4,
        duration: 0.6 + Math.random() * 0.8,
        wobble: (Math.random() - 0.5) * 30,
      });
    }
    embersRef.current = newEmbers;
  }, [count, effectDuration, colors, width]);

  useEffect(() => {
    if (!active) return;

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    generateEmbers();
    startTimeRef.current = performance.now();

    const totalMs = effectDuration * 1000 + 200;

    const animate = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Size canvas to parent with overflow margin
      const canvasW = w + 200;
      const canvasH = h + 200;
      if (canvas.width !== Math.round(canvasW * dpr) || canvas.height !== Math.round(canvasH * dpr)) {
        canvas.width = Math.round(canvasW * dpr);
        canvas.height = Math.round(canvasH * dpr);
        canvas.style.width = `${canvasW}px`;
        canvas.style.height = `${canvasH}px`;
        canvas.style.left = `-100px`;
        canvas.style.top = `-100px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasW, canvasH);
      ctx.globalCompositeOperation = 'lighter';

      const embers = embersRef.current;
      // Origin: center-x of parent, 80% down from top (bottom: 20%)
      const originX = canvasW / 2;
      const originY = 100 + h * 0.8;

      let anyVisible = false;

      for (let i = 0; i < embers.length; i++) {
        const e = embers[i];
        const t = elapsed - e.delay;
        if (t < 0) { anyVisible = true; continue; }
        if (t > e.duration) continue;

        anyVisible = true;
        const progress = t / e.duration;

        // Keyframe interpolation matching original:
        // 0->0.3: x=wobble*0.5, y=finalY*0.3, scale 0->1.2, opacity 0.9->0.95
        // 0.3->0.7: x=finalX+wobble, y=finalY*0.7, scale 1.2->0.8, opacity 0.95->0.7
        // 0.7->1.0: x=finalX+wobble*1.5, y=finalY, scale 0.8->0, opacity 0.7->0
        let px: number, py: number, scale: number, opacity: number;

        if (progress < 0.3) {
          const p = progress / 0.3;
          const eased = 1 - (1 - p) * (1 - p);
          px = eased * e.wobble * 0.5;
          py = eased * e.y * 0.3;
          scale = eased * 1.2;
          opacity = 0.9 + eased * 0.05;
        } else if (progress < 0.7) {
          const p = (progress - 0.3) / 0.4;
          const eased = 1 - (1 - p) * (1 - p);
          px = e.wobble * 0.5 + eased * (e.x + e.wobble - e.wobble * 0.5);
          py = e.y * 0.3 + eased * (e.y * 0.7 - e.y * 0.3);
          scale = 1.2 - eased * 0.4;
          opacity = 0.95 - eased * 0.25;
        } else {
          const p = (progress - 0.7) / 0.3;
          const eased = 1 - (1 - p) * (1 - p);
          px = (e.x + e.wobble) + eased * (e.x + e.wobble * 1.5 - e.x - e.wobble);
          py = e.y * 0.7 + eased * (e.y - e.y * 0.7);
          scale = 0.8 - eased * 0.8;
          opacity = 0.7 * (1 - eased);
        }

        const drawX = originX + px;
        const drawY = originY + py;
        const r = (e.size * scale) / 2;

        if (r < 0.3 || opacity < 0.01) continue;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Radial gradient for ember glow
        const grad = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, r);
        grad.addColorStop(0, e.color);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow
        ctx.shadowColor = e.color;
        ctx.shadowBlur = e.size * 2 * scale;
        ctx.fillStyle = e.color;
        ctx.globalAlpha = opacity * 0.3;
        ctx.beginPath();
        ctx.arc(drawX, drawY, r * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      if (anyVisible && elapsed < totalMs / 1000) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvasW, canvasH);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, [active, generateEmbers, effectDuration]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 30,
      }}
    />
  );
}
