'use client';

import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import { motion } from 'framer-motion';

interface SongPlayerProps {
  previewUrl: string | null;
  albumArt?: string;
  autoPlay?: boolean;
  showControls?: boolean;
}

export default function SongPlayer({ previewUrl, albumArt, autoPlay = true, showControls = true }: SongPlayerProps) {
  const howlRef = useRef<Howl | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!previewUrl) return;

    howlRef.current = new Howl({
      src: [previewUrl],
      html5: true,
      volume: 0.7,
      onload: () => setLoaded(true),
      onplay: () => setPlaying(true),
      onpause: () => setPlaying(false),
      onend: () => setPlaying(false),
      onloaderror: (_id, err) => console.error('Audio load error:', err),
    });

    if (autoPlay) {
      howlRef.current.play();
    }

    return () => {
      howlRef.current?.unload();
    };
  }, [previewUrl, autoPlay]);

  const togglePlay = () => {
    if (!howlRef.current) return;
    if (playing) {
      howlRef.current.pause();
    } else {
      howlRef.current.play();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {albumArt && (
        <motion.div
          animate={playing ? { scale: [1, 1.02, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-48 h-48 rounded-2xl overflow-hidden shadow-2xl"
        >
          <img src={albumArt} alt="Album art" className="w-full h-full object-cover" />
        </motion.div>
      )}
      {showControls && (
        <button
          onClick={togglePlay}
          disabled={!previewUrl}
          className="py-2 px-6 rounded-full font-bold text-sm transition-all disabled:opacity-30"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {!previewUrl ? 'No Audio' : playing ? 'Pause' : 'Play'}
        </button>
      )}
      {!loaded && previewUrl && (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading audio...</p>
      )}
    </div>
  );
}
