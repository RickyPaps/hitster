'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getSocket, disconnectSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { useGameStore } from '@/stores/gameStore';
import type { LobbySettings } from '@/types/game';

interface HostLobbyProps {
  onStartGame: () => void;
  loading?: boolean;
}

const AVATAR_COLORS = [
  'bg-fuchsia-400', 'bg-teal-400', 'bg-indigo-500', 'bg-pink-500',
  'bg-amber-400', 'bg-emerald-400', 'bg-rose-400', 'bg-violet-400',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function HostLobby({ onStartGame, loading }: HostLobbyProps) {
  const router = useRouter();
  const { roomCode, players, settings } = useGameStore();
  const [localSettings, setLocalSettings] = useState<LobbySettings>(settings);

  const handleBack = () => {
    disconnectSocket();
    router.push('/');
  };

  const handleKick = (playerId: string) => {
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_KICK_PLAYER, { playerId });
  };

  const updateSetting = <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_UPDATE_SETTINGS, { [key]: value });
  };

  const formattedCode = roomCode ? roomCode.split('').join(' – ') : '';

  return (
    <div className="min-h-dvh text-white relative overflow-hidden">
      {/* ── Background: dance floor grid + spotlights ── */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute bottom-0 w-full h-[60%] dance-floor-grid" style={{ transform: 'perspective(600px) rotateX(55deg) scale(1.6)', transformOrigin: 'bottom' }} />
        <div className="absolute top-0 left-1/4 w-32 h-full bg-gradient-to-b from-fuchsia-500/50 to-transparent -rotate-45 origin-top blur-xl mix-blend-screen" />
        <div className="absolute top-0 right-1/4 w-32 h-full bg-gradient-to-b from-teal-400/50 to-transparent rotate-45 origin-top blur-xl mix-blend-screen" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 container mx-auto px-4 py-8 min-h-dvh flex flex-col max-w-6xl">
        {/* Header */}
        <header className="text-center mb-10 flex flex-col items-center">
          <h1
            className="text-4xl md:text-6xl mb-3 neon-text-fuchsia uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-display)', color: 'white' }}
          >
            Hitster
          </h1>
          <h2 className="text-lg md:text-xl font-bold text-gray-300 mb-6">
            Music Bingo Party Game
          </h2>

          {/* Lobby code badge */}
          <div className="inline-block bg-teal-950/60 backdrop-blur-md rounded-lg py-3 px-8 neon-box-teal">
            <p className="text-xs text-teal-200 mb-1 font-semibold uppercase tracking-wider">
              Lobby Code
            </p>
            <p
              className="text-2xl neon-text-teal tracking-widest font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'white' }}
            >
              {formattedCode}
            </p>
          </div>
        </header>

        {/* ── Two-column grid ── */}
        <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">

          {/* ── Players Panel ── */}
          <section className="bg-purple-950/40 backdrop-blur-md border border-fuchsia-900/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold neon-text-fuchsia flex items-center gap-2" style={{ color: 'white' }}>
                <span className="text-2xl">👥</span>
                Players Joined
              </h3>
              <span className="bg-fuchsia-500/20 text-fuchsia-300 px-3 py-1 rounded-full text-sm font-bold neon-box-fuchsia">
                {players.length} / 8
              </span>
            </div>

            <div className="space-y-3">
              {players.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`rounded-xl p-4 flex items-center justify-between ${
                    i === 0
                      ? 'bg-fuchsia-500/15 neon-box-fuchsia'
                      : 'bg-fuchsia-950/40 border border-fuchsia-500/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-base font-bold border-2 border-white/80 shrink-0`}>
                      {getInitials(p.name)}
                    </div>
                    <span className="text-lg font-bold">
                      {p.name}
                      {i === 0 && (
                        <span className="text-[0.65rem] text-fuchsia-400 ml-2 uppercase tracking-wider">(Host)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.connected ? (
                      <span className="text-green-400 text-xl">✓</span>
                    ) : (
                      <span className="text-gray-400 text-sm animate-spin inline-block">↻</span>
                    )}
                    {i > 0 && (
                      <button
                        onClick={() => handleKick(p.id)}
                        className="text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/15 rounded-full w-8 h-8 flex items-center justify-center transition-all text-sm cursor-pointer"
                        title={`Remove ${p.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}

              {players.length === 0 && (
                <div className="border-2 border-dashed border-fuchsia-900/50 rounded-xl p-4 flex items-center justify-center text-gray-400">
                  Waiting for players to join...
                </div>
              )}
              {players.length > 0 && players.length < 8 && (
                <div className="border-2 border-dashed border-fuchsia-900/50 rounded-xl p-4 flex items-center justify-center text-gray-500 text-sm">
                  Waiting for more players...
                </div>
              )}
            </div>
          </section>

          {/* ── Settings Panel ── */}
          <section className="space-y-6">
            <div className="bg-purple-950/40 backdrop-blur-md border border-fuchsia-900/50 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold neon-text-fuchsia flex items-center gap-2 mb-6" style={{ color: 'white' }}>
                <span className="text-2xl">⚙</span>
                Game Settings
              </h3>

              <div className="space-y-5">
                {/* Timer Duration */}
                <div>
                  <label className="block text-sm font-semibold text-fuchsia-200 mb-2 uppercase tracking-wider">
                    Timer Duration
                  </label>
                  <div className="flex bg-indigo-950/80 border border-fuchsia-500/40 rounded-lg overflow-hidden">
                    {([10, 20, 30] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => updateSetting('timerDuration', t)}
                        className={`flex-1 py-3 px-4 text-center transition-all font-medium ${
                          localSettings.timerDuration === t
                            ? 'bg-fuchsia-500/30 neon-box-fuchsia text-white font-bold border-0'
                            : 'hover:bg-fuchsia-500/10 text-gray-300'
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Win Condition */}
                <div>
                  <label className="block text-sm font-semibold text-fuchsia-200 mb-2 uppercase tracking-wider">
                    Win Condition
                  </label>
                  <div className="flex bg-indigo-950/80 border border-fuchsia-500/40 rounded-lg overflow-hidden">
                    {([1, 2, 9] as const).map((w) => (
                      <button
                        key={w}
                        onClick={() => updateSetting('winCondition', w)}
                        className={`flex-1 py-3 px-4 text-center transition-all font-medium ${
                          localSettings.winCondition === w
                            ? 'bg-fuchsia-500/30 neon-box-fuchsia text-white font-bold border-0'
                            : 'hover:bg-fuchsia-500/10 text-gray-300'
                        }`}
                      >
                        {w === 9 ? 'Full Card' : `${w} Row${w > 1 ? 's' : ''}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content Mode */}
                <div>
                  <label className="block text-sm font-semibold text-fuchsia-200 mb-2 uppercase tracking-wider">
                    Content
                  </label>
                  <div className="flex bg-indigo-950/80 border border-fuchsia-500/40 rounded-lg overflow-hidden">
                    {(['music', 'movie', 'mixed'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => updateSetting('contentMode', mode)}
                        className={`flex-1 py-3 px-4 text-center transition-all font-medium ${
                          localSettings.contentMode === mode
                            ? 'bg-fuchsia-500/30 neon-box-fuchsia text-white font-bold border-0'
                            : 'hover:bg-fuchsia-500/10 text-gray-300'
                        }`}
                      >
                        {mode === 'music' ? 'Music' : mode === 'movie' ? 'Movies' : 'Mixed'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Music Source */}
                <div>
                  <label className="block text-sm font-semibold text-fuchsia-200 mb-2 uppercase tracking-wider">
                    {localSettings.contentMode === 'movie' ? 'Movie Source' : 'Music Source'}
                  </label>
                  <div className="flex bg-indigo-950/80 border border-fuchsia-500/40 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateSetting('musicSource', 'curated')}
                      className={`flex-1 py-3 px-4 text-center transition-all font-medium ${
                        localSettings.musicSource === 'curated'
                          ? 'bg-fuchsia-500/30 neon-box-fuchsia text-white font-bold border-0'
                          : 'hover:bg-fuchsia-500/10 text-gray-300'
                      }`}
                    >
                      Curated
                    </button>
                    <button
                      onClick={() => updateSetting('musicSource', 'playlist')}
                      className={`flex-1 py-3 px-4 text-center transition-all font-medium ${
                        localSettings.musicSource === 'playlist'
                          ? 'bg-fuchsia-500/30 neon-box-fuchsia text-white font-bold border-0'
                          : 'hover:bg-fuchsia-500/10 text-gray-300'
                      }`}
                    >
                      Spotify
                    </button>
                  </div>
                  {localSettings.musicSource === 'playlist' && (
                    <input
                      type="text"
                      placeholder="Spotify Playlist URL"
                      value={localSettings.playlistUrl}
                      onChange={(e) => updateSetting('playlistUrl', e.target.value)}
                      className="w-full mt-3 py-3 px-4 rounded-lg text-sm bg-indigo-950/80 border border-fuchsia-500/40 text-white placeholder-gray-500 neon-input"
                    />
                  )}
                </div>

                {/* Drink on Wrong Guess */}
                <div className="flex items-center justify-between bg-indigo-950/60 p-4 rounded-lg border border-fuchsia-900/40">
                  <div>
                    <p className="font-semibold text-white">Drink on Wrong Guess</p>
                    <p className="text-sm text-gray-400">Wrong answer = take a sip</p>
                  </div>
                  <button
                    onClick={() => updateSetting('drinkOnWrongGuess', !localSettings.drinkOnWrongGuess)}
                    className={`disco-toggle ${localSettings.drinkOnWrongGuess ? 'active' : ''}`}
                    aria-label="Toggle drink on wrong guess"
                  />
                </div>

                {/* Drink on Row Complete */}
                <div className="flex items-center justify-between bg-indigo-950/60 p-4 rounded-lg border border-fuchsia-900/40">
                  <div>
                    <p className="font-semibold text-white">Drink on Row Complete</p>
                    <p className="text-sm text-gray-400">Others drink when someone completes a row</p>
                  </div>
                  <button
                    onClick={() => updateSetting('drinkOnRowComplete', !localSettings.drinkOnRowComplete)}
                    className={`disco-toggle ${localSettings.drinkOnRowComplete ? 'active' : ''}`}
                    aria-label="Toggle drink on row complete"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Bottom Buttons ── */}
        <div className="mt-auto flex flex-col md:flex-row items-center justify-between gap-4 pb-4">
          <button
            onClick={handleBack}
            className="px-8 py-3 rounded-full text-rose-400 font-bold uppercase tracking-wider neon-box-rose hover:bg-rose-900/30 transition-all w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="text-sm">↩</span>
            Leave Lobby
          </button>

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
            onClick={onStartGame}
            disabled={players.length === 0 || loading}
            className="px-12 py-5 rounded-full bg-fuchsia-500 text-white text-xl uppercase tracking-widest neon-box-fuchsia animate-pulse-glow hover:brightness-110 transition-all w-full md:w-auto disabled:opacity-40 disabled:animate-none cursor-pointer"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {localSettings.contentMode === 'movie' ? 'Loading Movies...' : localSettings.contentMode === 'mixed' ? 'Loading Content...' : 'Loading Songs...'}
              </span>
            ) : (
              'Start Game'
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
