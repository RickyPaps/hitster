'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface TrailerPlayerProps {
  videoId: string;
  autoPlay?: boolean;
  showControls?: boolean;
  /** Start time in seconds into the trailer (randomized per round for variety) */
  startAt?: number;
  /** Clip duration in seconds (default 30s to match Spotify previews) */
  clipDuration?: number;
}

export default function TrailerPlayer({
  videoId,
  autoPlay = true,
  showControls = true,
  startAt = 0,
  clipDuration = 30,
}: TrailerPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Build the YouTube embed URL
  // enablejsapi=1 allows postMessage control
  // We start at the given offset and autoplay if requested
  const embedUrl = `https://www.youtube.com/embed/${videoId}?` +
    new URLSearchParams({
      autoplay: autoPlay ? '1' : '0',
      start: String(Math.floor(startAt)),
      enablejsapi: '1',
      modestbranding: '1',
      rel: '0',          // don't show related videos
      controls: '0',     // hide YouTube controls (we provide our own)
      showinfo: '0',
      fs: '0',           // no fullscreen button
      iv_load_policy: '3', // hide annotations
      disablekb: '1',    // disable keyboard controls (prevent seeking to answer)
      mute: '0',
    }).toString();

  // Listen for YouTube iframe API messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.event === 'onReady') {
          setLoaded(true);
        }
        if (data.event === 'onStateChange') {
          // YouTube states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering
          setPlaying(data.info === 1);
        }
      } catch {
        // not a JSON message from YouTube
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Auto-stop after clipDuration seconds
  useEffect(() => {
    if (playing && clipDuration > 0) {
      timerRef.current = setTimeout(() => {
        postCommand('pauseVideo');
        setPlaying(false);
      }, clipDuration * 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, clipDuration]);

  // Fallback: mark as loaded after a short delay (iframe onReady isn't always reliable)
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const postCommand = useCallback((func: string) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func }),
      'https://www.youtube.com'
    );
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      postCommand('pauseVideo');
    } else {
      postCommand('playVideo');
    }
  }, [playing, postCommand]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Video container with cinematic aspect ratio */}
      <motion.div
        animate={playing ? { boxShadow: ['0 0 20px rgba(255,0,128,0.3)', '0 0 40px rgba(255,0,128,0.5)', '0 0 20px rgba(255,0,128,0.3)'] } : {}}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ aspectRatio: '16/9', background: '#000' }}
      >
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={{ border: 'none' }}
        />
      </motion.div>

      {showControls && (
        <button
          onClick={togglePlay}
          className="py-2 px-6 rounded-full font-bold text-sm transition-all"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      )}

      {!loaded && (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading trailer...</p>
      )}
    </div>
  );
}
