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
    'year-approx': 'Enter the year (e.g. 2005)',
    album: 'What album is this from?',
  }[category] || 'Enter your guess...';

  const isYear = category === 'year' || category === 'year-approx';

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
        type={isYear ? 'tel' : 'text'}
        inputMode={isYear ? 'numeric' : 'text'}
        pattern={isYear ? '[0-9]*' : undefined}
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        onFocus={(e) => {
          // Ensure input is visible above the keyboard overlay
          setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus
        className="w-full py-3.5 px-5 rounded-xl text-center text-lg font-medium disabled:opacity-50 neon-input"
        style={{
          background: 'rgba(20, 12, 50, 0.85)',
          color: '#e2e8f0',
          border: '1.5px solid rgba(217, 70, 239, 0.4)',
          boxShadow: '0 0 8px rgba(217, 70, 239, 0.1)',
        }}
      />
      <motion.button
        whileTap={{ scale: 0.95 }}
        type="submit"
        disabled={disabled || !guess.trim()}
        className="w-full py-3.5 rounded-xl font-bold text-white text-lg uppercase tracking-wider disabled:opacity-40 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #d946ef, #8b5cf6)',
          boxShadow: '0 0 15px rgba(217, 70, 239, 0.4), 0 0 30px rgba(139, 92, 246, 0.2)',
        }}
      >
        Submit Guess
      </motion.button>
    </form>
  );
}
