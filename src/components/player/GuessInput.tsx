'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { getSocket } from '@/lib/socket/client';
import { SOCKET_EVENTS } from '@/lib/socket/events';

interface GuessInputProps {
  category: string;
  disabled: boolean;
  onGuessSubmitted: () => void;
}

export default function GuessInput({ category, disabled, onGuessSubmitted }: GuessInputProps) {
  const [guess, setGuess] = useState('');

  const placeholder = {
    year: 'Enter the year (e.g. 2005)',
    artist: 'Who is the artist?',
    title: 'What is the song title?',
    lyrics: 'Type lyrics you know...',
    album: 'What album is this from?',
  }[category] || 'Enter your guess...';

  const inputType = category === 'year' ? 'number' : 'text';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || disabled) return;

    const socket = getSocket();
    socket.emit(SOCKET_EVENTS.PLAYER_SUBMIT_GUESS, { guess: guess.trim() });
    onGuessSubmitted();
    setGuess('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
      <input
        type={inputType}
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
        className="w-full py-3 px-4 rounded-xl text-center text-lg font-medium disabled:opacity-50"
        style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '2px solid var(--bg-secondary)' }}
      />
      <motion.button
        whileTap={{ scale: 0.95 }}
        type="submit"
        disabled={disabled || !guess.trim()}
        className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50"
        style={{ background: 'var(--accent)' }}
      >
        Submit Guess
      </motion.button>
    </form>
  );
}
