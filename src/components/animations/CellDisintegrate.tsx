'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';

interface Shard {
  id: number;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  color: string;
  delay: number;
  skewX: number;
}

interface CellDisintegrateProps {
  active: boolean;
  cellSize?: number;
  onComplete?: () => void;
}

const SHARD_COLORS = [
  'rgba(217, 70, 239, 0.9)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(217, 70, 239, 0.6)',
  'rgba(168, 85, 247, 0.7)',
  'rgba(99, 102, 241, 0.6)',
];

export default function CellDisintegrate({
  active,
  cellSize = 100,
  onComplete,
}: CellDisintegrateProps) {
  const [shards, setShards] = useState<Shard[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const generateShards = useCallback(() => {
    const newShards: Shard[] = [];
    const gridSize = 4;
    const shardW = cellSize / gridSize;
    const shardH = cellSize / gridSize;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const idx = row * gridSize + col;
        const cx = (col - gridSize / 2 + 0.5) * shardW;
        const cy = (row - gridSize / 2 + 0.5) * shardH;
        const angle = Math.atan2(cy, cx);
        const dist = 60 + Math.random() * 100;

        newShards.push({
          id: idx,
          x: Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
          y: Math.sin(angle) * dist + Math.random() * 30,
          rotation: (Math.random() - 0.5) * 540,
          width: shardW + (Math.random() - 0.5) * 4,
          height: shardH + (Math.random() - 0.5) * 4,
          color: SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)],
          delay: Math.random() * 0.1,
          skewX: (Math.random() - 0.5) * 20,
        });
      }
    }
    setShards(newShards);
  }, [cellSize]);

  useEffect(() => {
    if (active) {
      generateShards();
      const timer = setTimeout(() => {
        setShards([]);
        onComplete?.();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [active, generateShards, onComplete]);

  // Animate with GSAP
  useEffect(() => {
    if (shards.length === 0) return;
    const container = containerRef.current;
    const flash = flashRef.current;
    const svg = svgRef.current;
    if (!container || !flash || !svg) return;

    const ctx = gsap.context(() => {
      // Flash
      gsap.fromTo(flash,
        { opacity: 0.8 },
        { opacity: 0, duration: 0.3 }
      );

      // Crack lines (SVG strokeDashoffset)
      const lines = svg.querySelectorAll('line');
      lines.forEach((line, i) => {
        const length = Math.sqrt(
          Math.pow(parseFloat(line.getAttribute('x2')!) - parseFloat(line.getAttribute('x1')!), 2) +
          Math.pow(parseFloat(line.getAttribute('y2')!) - parseFloat(line.getAttribute('y1')!), 2)
        );
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
        gsap.to(line, { strokeDashoffset: 0, duration: 0.15, delay: i * 0.01 });
      });
      gsap.to(svg, { opacity: 0, duration: 0.5, delay: 0.15 });

      // Shards
      const shardEls = container.querySelectorAll('.cell-shard');
      shardEls.forEach((el, i) => {
        const s = shards[i];
        if (!s) return;
        gsap.to(el, {
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          skewX: s.skewX,
          scale: 0,
          opacity: 0,
          duration: 0.7,
          delay: s.delay + 0.15,
          ease: 'power2.out',
        });
      });

      // Dust particles
      const dustEls = container.querySelectorAll('.cell-dust');
      dustEls.forEach((el, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        gsap.fromTo(el,
          { x: 0, y: 0, scale: 0, opacity: 0.8 },
          {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            scale: 0.3,
            opacity: 0,
            duration: 0.6,
            delay: 0.25,
            ease: 'power2.out',
          }
        );
      });
    });
    return () => ctx.revert();
  }, [shards]);

  if (shards.length === 0) return null;

  const half = cellSize / 2;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        overflow: 'visible',
      }}
    >
      {/* Initial flash */}
      <div
        ref={flashRef}
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: 16,
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.6), rgba(217, 70, 239, 0.3), transparent)',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
          opacity: 0,
        }}
      />

      {/* Crack lines */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${cellSize} ${cellSize}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {[0, 45, 90, 135].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={half}
              y1={half}
              x2={half + Math.cos(rad) * half}
              y2={half + Math.sin(rad) * half}
              stroke="rgba(239, 68, 68, 0.8)"
              strokeWidth="2"
            />
          );
        })}
      </svg>

      {/* Shattering shards */}
      {shards.map((s) => (
        <div
          key={s.id}
          className="cell-shard"
          style={{
            position: 'absolute',
            left: `${(s.id % 4) * 25}%`,
            top: `${Math.floor(s.id / 4) * 25}%`,
            width: s.width,
            height: s.height,
            background: s.color,
            borderRadius: 3,
            boxShadow: `0 0 8px ${s.color}`,
          }}
        />
      ))}

      {/* Dust particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`dust-${i}`}
          className="cell-dust"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.7)',
            boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)',
          }}
        />
      ))}
    </div>
  );
}
