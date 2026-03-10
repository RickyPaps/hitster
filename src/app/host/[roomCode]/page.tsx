'use client';

import dynamic from 'next/dynamic';

// Disable SSR to avoid hydration mismatches — this page requires
// Socket.io, Zustand state, Howler.js, and browser APIs.
const HostPageContent = dynamic(() => import('./HostPageContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-dvh flex items-center justify-center">
      <div
        className="w-10 h-10 border-3 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: 'rgba(139, 92, 246, 0.3)', borderTopColor: 'transparent' }}
      />
    </div>
  ),
});

export default function HostPage() {
  return <HostPageContent />;
}
