'use client';

import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket } from '@/lib/socket/client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // getSocket() returns the existing socket instance.
    // Connection is established by the page (via connectSocket) before navigating here.
    socketRef.current = getSocket();
  }, []);

  return socketRef.current;
}
