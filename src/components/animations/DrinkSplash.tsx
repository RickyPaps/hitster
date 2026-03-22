'use client';

import { useEffect, useRef, useCallback } from 'react';

interface DrinkSplashProps {
  active: boolean;
  count?: number;
}

interface Droplet {
  x: number; // 0-1 fraction of canvas width
  startY: number; // starting y offset (negative, fraction)
  size: number;
  color: string;
  delay: number; // seconds
  duration: number; // seconds
}

const LIQUID_COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#EAB308', '#fbbf24', '#fcd34d'];

const TOTAL_DURATION = 1500; // ms

export default function DrinkSplash({ active, count = 12 }: DrinkSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const dropletsRef = useRef<Droplet[]>([]);
  const startTimeRef = useRef<number>(0);

  const generate = useCallback(() => {
    const drops: Droplet[] = [];
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random(),
        startY: -(0.1 + Math.random() * 0.2),
        size: 6 + Math.random() * 10,
        color: LIQUID_COLORS[Math.floor(Math.random() * LIQUID_COLORS.length)],
        delay: Math.random() * 0.4,
        duration: 0.6 + Math.random() * 0.4,
      });
    }
    dropletsRef.current = drops;
  }, [count]);

  useEffect(() => {
    if (!active) return;

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    generate();
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000; // seconds
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';

      const droplets = dropletsRef.current;
      let anyVisible = false;

      for (let i = 0; i < droplets.length; i++) {
        const d = droplets[i];
        const t = elapsed - d.delay;
        if (t < 0) { anyVisible = true; continue; }
        if (t > d.duration) continue;

        anyVisible = true;
        const progress = t / d.duration;

        // Keyframe interpolation matching original:
        // 0->0.6: top 0%->70%, scale 0->1.2, opacity 0->0.8
        // 0.6->1.0: top 70%->100%, scale 1.2->0.4, opacity 0.8->0
        let yFrac: number, scale: number, opacity: number;
        if (progress < 0.6) {
          const p = progress / 0.6;
          // ease power2.out: 1 - (1-p)^2
          const eased = 1 - (1 - p) * (1 - p);
          yFrac = eased * 0.7;
          scale = eased * 1.2;
          opacity = eased * 0.8;
        } else {
          const p = (progress - 0.6) / 0.4;
          const eased = 1 - (1 - p) * (1 - p);
          yFrac = 0.7 + eased * 0.3;
          scale = 1.2 - eased * 0.8;
          opacity = 0.8 * (1 - eased);
        }

        const px = d.x * w;
        const py = yFrac * h;
        const r = (d.size * scale) / 2;

        if (r < 0.5 || opacity < 0.01) continue;

        ctx.save();
        ctx.globalAlpha = opacity;

        // Draw droplet shape (oval, taller than wide)
        const rw = r;
        const rh = r * 1.4;

        // Radial gradient
        const grad = ctx.createRadialGradient(
          px - rw * 0.2, py - rh * 0.2, 0,
          px, py, Math.max(rw, rh)
        );
        grad.addColorStop(0, 'rgba(255,255,255,0.4)');
        grad.addColorStop(1, d.color);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(px, py, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();

        // Glow
        ctx.shadowColor = d.color;
        ctx.shadowBlur = d.size * scale;
        ctx.fillStyle = d.color;
        ctx.globalAlpha = opacity * 0.3;
        ctx.beginPath();
        ctx.ellipse(px, py, rw, rh, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      if (anyVisible && elapsed < TOTAL_DURATION / 1000) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, w, h);
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
  }, [active, generate]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        width: '100%',
        height: '100%',
      }}
    />
  );
}
