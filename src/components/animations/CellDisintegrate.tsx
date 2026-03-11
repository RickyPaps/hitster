'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

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
  /** Trigger the disintegration animation */
  active: boolean;
  /** Size of the cell being disintegrated */
  cellSize?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

const SHARD_COLORS = [
  'rgba(217, 70, 239, 0.9)',   // fuchsia
  'rgba(139, 92, 246, 0.8)',   // purple
  'rgba(217, 70, 239, 0.6)',
  'rgba(168, 85, 247, 0.7)',   // violet
  'rgba(99, 102, 241, 0.6)',   // indigo
];

export default function CellDisintegrate({
  active,
  cellSize = 100,
  onComplete,
}: CellDisintegrateProps) {
  const [shards, setShards] = useState<Shard[]>([]);

  const generateShards = useCallback(() => {
    const newShards: Shard[] = [];
    const gridSize = 4; // 4x4 grid of shards
    const shardW = cellSize / gridSize;
    const shardH = cellSize / gridSize;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const idx = row * gridSize + col;
        // Shards fly outward from center
        const cx = (col - gridSize / 2 + 0.5) * shardW;
        const cy = (row - gridSize / 2 + 0.5) * shardH;
        const angle = Math.atan2(cy, cx);
        const dist = 60 + Math.random() * 100;

        newShards.push({
          id: idx,
          x: Math.cos(angle) * dist + (Math.random() - 0.5) * 40,
          y: Math.sin(angle) * dist + Math.random() * 30, // slight gravity bias
          rotation: (Math.random() - 0.5) * 540,
          width: shardW + (Math.random() - 0.5) * 4,
          height: shardH + (Math.random() - 0.5) * 4,
          color: SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)],
          delay: Math.random() * 0.1, // staggered start for crack effect
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

  if (shards.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 40,
        overflow: 'visible',
      }}
    >
      {/* Initial flash */}
      <motion.div
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: 16,
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.6), rgba(217, 70, 239, 0.3), transparent)',
          boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)',
        }}
      />

      {/* Crack lines (CSS-drawn) */}
      <motion.svg
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        viewBox={`0 0 ${cellSize} ${cellSize}`}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {/* Diagonal cracks from center */}
        {[0, 45, 90, 135].map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const half = cellSize / 2;
          return (
            <motion.line
              key={deg}
              x1={half}
              y1={half}
              x2={half + Math.cos(rad) * half}
              y2={half + Math.sin(rad) * half}
              stroke="rgba(239, 68, 68, 0.8)"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.15, delay: deg * 0.01 }}
            />
          );
        })}
      </motion.svg>

      {/* Shattering shards */}
      {shards.map((s) => (
        <motion.div
          key={s.id}
          initial={{
            x: 0,
            y: 0,
            rotate: 0,
            scale: 1,
            opacity: 1,
            skewX: 0,
          }}
          animate={{
            x: s.x,
            y: s.y,
            rotate: s.rotation,
            scale: [1, 0.8, 0],
            opacity: [1, 0.8, 0],
            skewX: s.skewX,
          }}
          transition={{
            duration: 0.7,
            delay: s.delay + 0.15, // after crack lines
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
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

      {/* Dust particles after shatter */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const dist = 40 + Math.random() * 60;
        return (
          <motion.div
            key={`dust-${i}`}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0.8 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist,
              scale: [0, 1, 0.3],
              opacity: [0, 0.6, 0],
            }}
            transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
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
        );
      })}
    </div>
  );
}
