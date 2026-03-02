'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';
import { useGameStore } from '@/stores/gameStore';
import RoomCodeDisplay from '@/components/shared/RoomCodeDisplay';
import type { LobbySettings } from '@/types/game';

interface HostLobbyProps {
  onStartGame: () => void;
}

export default function HostLobby({ onStartGame }: HostLobbyProps) {
  const { roomCode, players, settings } = useGameStore();
  const [localSettings, setLocalSettings] = useState<LobbySettings>(settings);

  const updateSetting = <K extends keyof LobbySettings>(key: K, value: LobbySettings[K]) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.HOST_UPDATE_SETTINGS, { [key]: value });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>Room Code</h2>
        <RoomCodeDisplay code={roomCode || ''} large />
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Share this code with players</p>
      </div>

      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Players */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-bold mb-4">Players ({players.length})</h3>
          {players.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Waiting for players to join...</p>
          ) : (
            <div className="space-y-2">
              {players.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 rounded-lg p-3"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--accent)' }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="font-medium">{p.name}</span>
                  <span className={`ml-auto w-2 h-2 rounded-full ${p.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="rounded-2xl p-6" style={{ background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-bold mb-4">Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Timer</label>
              <div className="flex gap-2">
                {([10, 20, 30] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateSetting('timerDuration', t)}
                    className={`flex-1 py-2 rounded-lg font-bold transition-all ${localSettings.timerDuration === t ? 'text-white' : ''}`}
                    style={{
                      background: localSettings.timerDuration === t ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: localSettings.timerDuration === t ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Win Condition</label>
              <div className="flex gap-2">
                {([1, 2, 9] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => updateSetting('winCondition', w)}
                    className="flex-1 py-2 rounded-lg font-bold transition-all"
                    style={{
                      background: localSettings.winCondition === w ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: localSettings.winCondition === w ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {w === 9 ? 'Full' : `${w} Row${w > 1 ? 's' : ''}`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Music Source</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSetting('musicSource', 'curated')}
                  className="flex-1 py-2 rounded-lg font-bold transition-all"
                  style={{
                    background: localSettings.musicSource === 'curated' ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: localSettings.musicSource === 'curated' ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  Curated
                </button>
                <button
                  onClick={() => updateSetting('musicSource', 'playlist')}
                  className="flex-1 py-2 rounded-lg font-bold transition-all"
                  style={{
                    background: localSettings.musicSource === 'playlist' ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: localSettings.musicSource === 'playlist' ? '#fff' : 'var(--text-secondary)',
                  }}
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
                  className="w-full mt-2 py-2 px-3 rounded-lg text-sm"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.drinkOnWrongGuess}
                  onChange={(e) => updateSetting('drinkOnWrongGuess', e.target.checked)}
                  className="accent-purple-500 w-4 h-4"
                />
                <span className="text-sm">Drink on wrong guess</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.drinkOnRowComplete}
                  onChange={(e) => updateSetting('drinkOnRowComplete', e.target.checked)}
                  className="accent-purple-500 w-4 h-4"
                />
                <span className="text-sm">Others drink on row complete</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onStartGame}
        disabled={players.length === 0}
        className="mt-8 py-4 px-12 rounded-xl font-bold text-lg text-white disabled:opacity-50 glow"
        style={{ background: 'var(--accent)' }}
      >
        Start Game
      </motion.button>
    </div>
  );
}
