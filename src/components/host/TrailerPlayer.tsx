'use client';

import { useEffect, useRef, useState, useCallback } from 'react';


interface TrailerPlayerProps {
  videoId: string;
  autoPlay?: boolean;
  showControls?: boolean;
  /** Start time in seconds into the trailer (randomized per round for variety) */
  startAt?: number;
  /** Clip duration in seconds (default 30s to match Spotify previews) */
  clipDuration?: number;
  /** Called when YouTube reports an error */
  onError?: (errorCode: number) => void;
}

export default function TrailerPlayer({
  videoId,
  autoPlay = true,
  showControls = true,
  startAt = 0,
  clipDuration = 30,
  onError,
}: TrailerPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const subscribedRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const overlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Safe origin for YouTube embed (empty string during SSR, real origin on client)
  const embedOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Reset state when videoId changes
  useEffect(() => {
    setError(null);
    setPlaying(false);
    setHasPlayed(false);
    subscribedRef.current = false;
  }, [videoId]);

  // Build the YouTube embed URL
  const embedUrl = `https://www.youtube.com/embed/${videoId}?` +
    new URLSearchParams({
      autoplay: autoPlay ? '1' : '0',
      start: String(Math.floor(startAt)),
      enablejsapi: '1',
      origin: embedOrigin,
      modestbranding: '1',
      rel: '0',
      controls: '0',
      fs: '0',
      iv_load_policy: '3',
      disablekb: '1',
      mute: '0',
    }).toString();

  // Helper: mark video as playing
  const markPlaying = useCallback(() => {
    setPlaying(true);
    setHasPlayed(true);
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }
  }, []);

  // Subscribe to YouTube events
  const subscribeToYouTube = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win || subscribedRef.current) return;
    subscribedRef.current = true;

    win.postMessage(JSON.stringify({ event: 'listening', id: 1 }), 'https://www.youtube.com');
    win.postMessage(
      JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onStateChange'] }),
      'https://www.youtube.com'
    );
    win.postMessage(
      JSON.stringify({ event: 'command', func: 'addEventListener', args: ['onError'] }),
      'https://www.youtube.com'
    );
  }, []);

  // Listen for YouTube iframe API messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        if (!subscribedRef.current) {
          subscribeToYouTube();
        }

        if (data.event === 'onStateChange') {
          if (data.info === 1) {
            markPlaying();
          } else {
            setPlaying(data.info === 1);
          }
        }

        // Alternative format: { event: 'infoDelivery', info: { playerState: 1 } }
        if (data.event === 'infoDelivery' && data.info?.playerState !== undefined) {
          if (data.info.playerState === 1) {
            markPlaying();
          } else if (data.info.playerState === 0 || data.info.playerState === 2) {
            setPlaying(false);
          }
        }

        if (data.event === 'onError') {
          const code = data.info;
          let msg: string;
          switch (code) {
            case 100:
              msg = 'Video not found or removed';
              break;
            case 101:
            case 150:
              msg = 'Video cannot be embedded';
              break;
            case 2:
              msg = 'Invalid video ID';
              break;
            case 5:
              msg = 'HTML5 player error';
              break;
            default:
              msg = 'Video playback error';
          }
          setError(msg);
          onError?.(code);
        }
      } catch {
        // not a JSON message from YouTube
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onError, subscribeToYouTube, markPlaying]);

  // Backup subscription after iframe loads
  const handleIframeLoad = useCallback(() => {
    setTimeout(() => subscribeToYouTube(), 500);
  }, [subscribeToYouTube]);

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

  // Overlay safety net: if postMessage events never fire (subscription failed),
  // dismiss the loading overlay after 4s so the video (likely already playing behind it)
  // becomes visible. This does NOT set an error — the video was pre-verified at game start.
  useEffect(() => {
    if (!hasPlayed && !error) {
      overlayTimerRef.current = setTimeout(() => {
        setHasPlayed(true);
      }, 4000);
    }
    return () => {
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  }, [videoId]); // only on mount / videoId change — not re-triggered by state changes

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

  // Error fallback UI — only shown for genuine YouTube errors
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-full max-w-5xl rounded-2xl flex flex-col items-center justify-center text-center p-8"
          style={{ aspectRatio: '16/9', background: 'rgba(75, 32, 56, 0.3)', border: '1px solid rgba(255, 0, 128, 0.2)' }}
        >
          <p className="text-4xl mb-3">&#127909;</p>
          <p className="font-bold text-lg text-white">Trailer Unavailable</p>
          <p className="text-sm mt-2 text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Video container with cinematic aspect ratio */}
      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl relative"
        style={{ aspectRatio: '16/9', background: '#000' }}
      >
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen={false}
          style={{ border: 'none' }}
          onLoad={handleIframeLoad}
          onError={() => setError('Failed to load video')}
        />

        {/* Loading overlay — fades out when video plays or after safety-net timeout */}
        <div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
            hasPlayed || error ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <p className="text-4xl mb-3 animate-pulse">&#127902;</p>
          <p className="text-sm text-gray-400">Loading trailer...</p>
        </div>

        {/* Top gradient overlay — hides YouTube title bar */}
        <div
          className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: '18%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 40%, rgba(0,0,0,0.6) 70%, transparent 100%)',
          }}
        />

        {/* Bottom gradient overlay — hides YouTube watermark/logo */}
        <div
          className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
          style={{
            height: '15%',
            background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, transparent 100%)',
          }}
        />
      </div>

      {showControls && (
        <button
          onClick={togglePlay}
          className="py-2 px-6 rounded-full font-bold text-sm transition-all"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
      )}

    </div>
  );
}
