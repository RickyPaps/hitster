'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/stores/gameStore';
import BingoCard from './BingoCard';

const WAITING_MSGS = [
  'Waiting for host to start the game...',
  'Get ready to rock...',
  'Warming up the playlist...',
  'Preparing the disco ball...',
  'Shuffling the tracks...',
  'Almost party time...',
];

const AVATAR_COLORS = [
  'bg-fuchsia-400', 'bg-teal-400', 'bg-indigo-500', 'bg-pink-500',
  'bg-amber-400', 'bg-emerald-400', 'bg-rose-400', 'bg-violet-400',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function PlayerLobby() {
  const { roomCode, playerName, players, bingoCard } = useGameStore();
  const [waitIdx, setWaitIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWaitIdx((i) => (i + 1) % WAITING_MSGS.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-dvh text-white relative overflow-hidden">
      {/* Background: dance floor grid + spotlights */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div
          className="absolute bottom-0 w-full h-[50%] dance-floor-grid"
          style={{ transform: 'perspective(600px) rotateX(55deg) scale(1.6)', transformOrigin: 'bottom' }}
        />
        <div className="absolute top-0 left-1/4 w-24 h-full bg-gradient-to-b from-fuchsia-500/40 to-transparent -rotate-45 origin-top blur-xl mix-blend-screen" />
        <div className="absolute top-0 right-1/4 w-24 h-full bg-gradient-to-b from-teal-400/40 to-transparent rotate-45 origin-top blur-xl mix-blend-screen" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center min-h-dvh px-5 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1
            className="text-2xl neon-text-fuchsia uppercase tracking-widest mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'white' }}
          >
            Hitster
          </h1>
          <p className="text-sm text-cyan-300/60">
            Welcome, <span className="font-bold text-fuchsia-300">{playerName}</span>
          </p>
        </div>

        {/* Room code badge */}
        <div className="inline-block bg-teal-950/50 backdrop-blur-md rounded-lg py-2.5 px-6 neon-box-teal mb-6">
          <p className="text-[10px] text-teal-200 mb-0.5 font-semibold uppercase tracking-wider">
            Room Code
          </p>
          <p
            className="text-lg neon-text-teal tracking-widest font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'white' }}
          >
            {roomCode ? roomCode.split('').join(' \u2013 ') : ''}
          </p>
        </div>

        {/* Bingo Card */}
        <div className="bg-purple-950/30 backdrop-blur-md border border-fuchsia-900/40 rounded-2xl p-5 mb-6 w-full max-w-[380px]">
          <h3
            className="text-[11px] font-bold uppercase tracking-widest text-center mb-4"
            style={{ color: 'rgba(217, 70, 239, 0.8)' }}
          >
            Your Bingo Card
          </h3>
          <div className="flex justify-center">
            <BingoCard cells={bingoCard} />
          </div>
        </div>

        {/* Players list */}
        <div className="w-full max-w-[380px] mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: 'rgba(217, 70, 239, 0.8)' }}
            >
              Players in Lobby
            </h3>
            <span className="bg-fuchsia-500/20 text-fuchsia-300 px-2.5 py-0.5 rounded-full text-xs font-bold">
              {players.length}
            </span>
          </div>
          <div className="space-y-2">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl py-2.5 px-3.5 flex items-center gap-3"
                style={{
                  background: p.name === playerName
                    ? 'rgba(217, 70, 239, 0.12)'
                    : 'rgba(30, 20, 60, 0.6)',
                  border: p.name === playerName
                    ? '1.5px solid rgba(217, 70, 239, 0.4)'
                    : '1px solid rgba(100, 80, 140, 0.2)',
                }}
              >
                <div className={`w-8 h-8 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-xs font-bold border border-white/60 shrink-0`}>
                  {getInitials(p.name)}
                </div>
                <span className="text-sm font-semibold">
                  {p.name}
                  {p.name === playerName && (
                    <span className="text-[10px] text-fuchsia-400 ml-1.5">(You)</span>
                  )}
                </span>
                {p.connected && (
                  <span className="ml-auto text-green-400 text-sm">{'\u2713'}</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Waiting message */}
        <motion.p
          key={waitIdx}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="text-sm font-medium"
          style={{ color: 'rgba(217, 70, 239, 0.6)' }}
        >
          {WAITING_MSGS[waitIdx]}
        </motion.p>
      </div>
    </div>
  );
}
