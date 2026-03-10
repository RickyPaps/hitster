'use client';

import dynamic from 'next/dynamic';

// Disable SSR to avoid hydration mismatches — this page requires
// Socket.io, Zustand state, and browser APIs that differ from server render.
const PlayerPageContent = dynamic(() => import('./PlayerPageContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-dvh flex items-center justify-center">
      <div
        className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'rgba(217, 70, 239, 0.3)', borderTopColor: 'transparent' }}
      />
    </div>
  ),
});

export default function PlayerPage() {
  return <PlayerPageContent />;
}
