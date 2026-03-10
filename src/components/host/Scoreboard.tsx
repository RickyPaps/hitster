'use client';

import { useGameStore } from '@/stores/gameStore';
import { CrownIcon } from '@/components/animations/SVGIcons';

export default function Scoreboard() {
  const { players } = useGameStore();

  const sorted = [...players].sort((a, b) => b.completedRows - a.completedRows || b.score - a.score);

  return (
    <div className="glass-panel-purple rounded-2xl p-5">
      <h3
        className="text-xs font-black uppercase tracking-widest mb-4 text-center"
        style={{ color: 'rgba(255, 0, 127, 0.8)', letterSpacing: '0.2em' }}
      >
        Final Scoreboard
      </h3>
      <div className="space-y-2">
        {sorted.map((p, i) => {
          const isFirst = i === 0;
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{
                background: isFirst
                  ? 'rgba(255, 0, 127, 0.15)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: isFirst
                  ? '1.5px solid rgba(255, 0, 127, 0.4)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              {/* Rank */}
              <span
                className="text-sm font-black w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
                style={{
                  background: isFirst ? '#ff007f' : 'rgba(255, 255, 255, 0.08)',
                  color: isFirst ? 'white' : '#ff007f',
                  boxShadow: isFirst ? '0 4px 12px rgba(255, 0, 127, 0.3)' : 'none',
                }}
              >
                {isFirst ? <CrownIcon size={14} color="white" /> : i + 1}
              </span>

              {/* Name */}
              <span className="font-bold flex-1 text-white truncate">
                {p.name}
              </span>

              {/* Completed lines */}
              <div className="flex gap-1">
                {Array.from({ length: p.completedRows }).map((_, j) => (
                  <div
                    key={j}
                    className="w-3.5 h-3.5 rounded-sm"
                    style={{
                      background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
                      boxShadow: '0 0 6px rgba(217, 70, 239, 0.4)',
                    }}
                  />
                ))}
              </div>

              {/* Score */}
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: isFirst ? '#ff007f' : 'rgba(148, 163, 184, 0.8)' }}
              >
                {p.score.toLocaleString()}
              </span>

              {/* Disconnect indicator */}
              {!p.connected && (
                <span className="text-[10px] font-bold opacity-50" style={{ color: '#ef4444' }}>DC</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
