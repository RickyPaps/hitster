'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { connectSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { useGameStore } from '@/stores/gameStore';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setConnection = useGameStore((s) => s.setConnection);

  const handleCreateRoom = () => {
    setLoading(true);
    const socket = connectSocket();

    socket.emit(SOCKET_EVENTS.HOST_CREATE_ROOM, (data: { roomCode: string; hostId: string }) => {
      setConnection(data.roomCode, data.hostId, 'Host', true);
      router.push(`/host/${data.roomCode}`);
    });
  };

  const handleJoinRoom = () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setError('Please enter both a room code and your name');
      return;
    }
    setLoading(true);
    setError('');
    const socket = connectSocket();

    socket.emit(
      SOCKET_EVENTS.PLAYER_JOIN_ROOM,
      { roomCode: roomCode.toUpperCase(), playerName: playerName.trim() },
      (result: { success: boolean; error?: string; player?: any }) => {
        if (result.success) {
          setConnection(roomCode.toUpperCase(), socket.id!, playerName.trim(), false);
          router.push(`/play/${roomCode.toUpperCase()}`);
        } else {
          setError(result.error || 'Failed to join room');
          setLoading(false);
        }
      }
    );
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-bold mb-2 glow-text" style={{ color: 'var(--accent)' }}>
          HITSTER
        </h1>
        <p className="text-xl" style={{ color: 'var(--text-secondary)' }}>
          Music Bingo Party Game
        </p>
      </motion.div>

      {mode === 'menu' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 w-full max-w-xs"
        >
          <button
            onClick={handleCreateRoom}
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 glow"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
          <button
            onClick={() => setMode('join')}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 border-2"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'transparent' }}
          >
            Join Game
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 w-full max-w-xs"
        >
          <input
            type="text"
            placeholder="Room Code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-full py-3 px-4 rounded-xl text-center text-2xl font-bold tracking-widest uppercase"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '2px solid var(--bg-secondary)' }}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={20}
            className="w-full py-3 px-4 rounded-xl text-center text-lg"
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '2px solid var(--bg-secondary)' }}
          />
          {error && (
            <p className="text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>
          )}
          <button
            onClick={handleJoinRoom}
            disabled={loading}
            className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 glow"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'Joining...' : 'Join'}
          </button>
          <button
            onClick={() => { setMode('menu'); setError(''); }}
            className="text-sm underline"
            style={{ color: 'var(--text-secondary)' }}
          >
            Back
          </button>
        </motion.div>
      )}
    </div>
  );
}
