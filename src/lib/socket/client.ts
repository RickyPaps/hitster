import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    // Don't hardcode a URL — connect to whatever host served the page.
    // This makes it work from localhost AND from phones on the LAN.
    socket = io({
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (s.connected) {
      resolve(s);
      return;
    }

    const timeout = setTimeout(() => {
      s.off('connect', onConnect);
      reject(new Error('Connection timed out'));
    }, 5000);

    const onConnect = () => {
      clearTimeout(timeout);
      resolve(s);
    };

    s.once('connect', onConnect);
    s.connect();
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
