'use client';

import { useGameStore } from '@/stores/gameStore';
import type { Player } from '@/types/game';

export default function Scoreboard() {
  const { players } = useGameStore();

  const sorted = [...players].sort((a, b) => b.completedRows - a.completedRows || b.score - a.score);

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bg-card)' }}>
      <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>SCOREBOARD</h3>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-lg px-3 py-2"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <span className="text-sm font-bold w-5" style={{ color: 'var(--text-secondary)' }}>{i + 1}</span>
            <span className="font-medium flex-1">{p.name}</span>
            <div className="flex gap-1">
              {Array.from({ length: p.completedRows }).map((_, j) => (
                <div key={j} className="w-3 h-3 rounded-sm" style={{ background: 'var(--success)' }} />
              ))}
            </div>
            <span className={`text-xs font-medium ${p.connected ? '' : 'opacity-50'}`}>
              {p.connected ? '' : 'DC'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
