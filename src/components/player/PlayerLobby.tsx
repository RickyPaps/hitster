'use client';

import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import RoomCodeDisplay from '@/components/shared/RoomCodeDisplay';
import BingoCard from './BingoCard';

export default function PlayerLobby() {
  const { roomCode, playerName, players, bingoCard } = useGameStore();

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-xl font-bold mb-1">Welcome, {playerName}!</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
        Room <RoomCodeDisplay code={roomCode || ''} />
      </p>

      <div className="rounded-2xl p-6 mb-6" style={{ background: 'var(--bg-card)' }}>
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>YOUR BINGO CARD</h3>
        <BingoCard cells={bingoCard} />
      </div>

      <div className="mb-4">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {players.length} player{players.length !== 1 ? 's' : ''} in lobby
        </p>
        <div className="flex flex-wrap gap-2 mt-2 justify-center">
          {players.map((p) => (
            <span
              key={p.id}
              className="px-3 py-1 rounded-full text-sm"
              style={{ background: 'var(--bg-secondary)' }}
            >
              {p.name}
            </span>
          ))}
        </div>
      </div>

      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{ color: 'var(--text-secondary)' }}
      >
        Waiting for host to start the game...
      </motion.p>
    </div>
  );
}
