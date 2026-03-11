'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { connectSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { useGameStore } from '@/stores/gameStore';
import DiscoBackground from '@/components/home/DiscoBackground';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'menu' | 'join'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setConnection = useGameStore((s) => s.setConnection);
  const setBingoCard = useGameStore((s) => s.setBingoCard);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const joinFormRef = useRef<HTMLDivElement>(null);

  // Entrance animation (title + subtitle only — runs once)
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      if (titleRef.current) gsap.set(titleRef.current, { opacity: 1, y: 0, scale: 1 });
      if (subtitleRef.current) gsap.set(subtitleRef.current, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      if (titleRef.current) {
        tl.fromTo(
          titleRef.current,
          { opacity: 0, scale: 0.7, y: -30 },
          { opacity: 1, scale: 1, y: 0, duration: 0.8 }
        );
      }
      if (subtitleRef.current) {
        tl.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5 },
          '-=0.3'
        );
      }
    });

    return () => ctx.revert();
  }, []);

  // Animate menu buttons / join form whenever mode switches
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = mode === 'menu' ? buttonsRef.current : joinFormRef.current;
    if (!target) return;

    if (prefersReduced) {
      gsap.set(target.children, { opacity: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      target.children,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'power2.out' }
    );
  }, [mode]);

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const socket = await connectSocket();
      socket.emit(SOCKET_EVENTS.HOST_CREATE_ROOM, (data: { roomCode: string; hostId: string }) => {
        setConnection(data.roomCode, data.hostId, 'Host', true);
        router.push(`/host/${data.roomCode}`);
      });
    } catch {
      setError('Could not connect to server');
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      setError('Please enter both a room code and your name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const socket = await connectSocket();
      socket.emit(
        SOCKET_EVENTS.PLAYER_JOIN_ROOM,
        { roomCode: roomCode.toUpperCase(), playerName: playerName.trim() },
        (result: { success: boolean; error?: string; player?: any }) => {
          if (result.success) {
            setConnection(roomCode.toUpperCase(), socket.id!, playerName.trim(), false);
            if (result.player?.bingoCard) {
              setBingoCard(result.player.bingoCard);
            }
            router.push(`/play/${roomCode.toUpperCase()}`);
          } else {
            setError(result.error || 'Failed to join room');
            setLoading(false);
          }
        }
      );
    } catch {
      setError('Could not connect to server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 relative">
      <DiscoBackground />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Title */}
        <div className="text-center mb-10">
          <h1
            ref={titleRef}
            className="chrome-text text-7xl sm:text-8xl md:text-9xl leading-tight mb-3"
            style={{ fontFamily: 'var(--font-display)', opacity: 0 }}
          >
            HITSTER
          </h1>
          <p
            ref={subtitleRef}
            className="text-lg sm:text-xl font-medium tracking-wide"
            style={{
              background: 'linear-gradient(90deg, var(--neon-pink), var(--neon-cyan))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              opacity: 0,
            }}
          >
            The Bingo Party Game
          </p>
        </div>

        {/* Menu buttons */}
        {mode === 'menu' ? (
          <div ref={buttonsRef} className="flex flex-col gap-4 w-full max-w-xs">
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
                boxShadow:
                  '0 0 20px rgba(184, 41, 255, 0.4), 0 0 40px rgba(255, 45, 149, 0.2)',
              }}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 border-2 cursor-pointer disabled:opacity-50"
              style={{
                borderColor: 'var(--neon-cyan)',
                color: 'var(--neon-cyan)',
                background: 'rgba(0, 240, 255, 0.05)',
                boxShadow:
                  '0 0 15px rgba(0, 240, 255, 0.2), inset 0 0 15px rgba(0, 240, 255, 0.05)',
              }}
            >
              Join Game
            </button>
            {loading && (
              <button
                onClick={() => { setLoading(false); setError(''); }}
                className="text-sm underline cursor-pointer"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            )}
          </div>
        ) : (
          <div ref={joinFormRef} className="flex flex-col gap-4 w-full max-w-xs">
            <input
              type="text"
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              className="neon-input w-full py-3 px-4 rounded-xl text-center text-2xl font-bold tracking-widest uppercase"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'rgba(22, 33, 62, 0.7)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-primary)',
                border: '2px solid rgba(100, 100, 140, 0.3)',
              }}
            />
            <input
              type="text"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              className="neon-input w-full py-3 px-4 rounded-xl text-center text-lg"
              style={{
                background: 'rgba(22, 33, 62, 0.7)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-primary)',
                border: '2px solid rgba(100, 100, 140, 0.3)',
              }}
            />
            {error && (
              <p className="text-center text-sm" style={{ color: 'var(--error)' }}>
                {error}
              </p>
            )}
            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="w-full py-4 px-6 rounded-xl font-bold text-lg text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
                boxShadow:
                  '0 0 20px rgba(184, 41, 255, 0.4), 0 0 40px rgba(255, 45, 149, 0.2)',
              }}
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
            <button
              onClick={() => {
                setMode('menu');
                setError('');
                setLoading(false);
              }}
              className="text-sm underline cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Back
            </button>
          </div>
        )}

        {/* Error for menu mode */}
        {mode === 'menu' && error && (
          <p className="text-center text-sm mt-4" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
