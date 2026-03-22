import { createServer } from 'http';
import next from 'next';
import { Server } from 'socket.io';
import { registerSocketHandlers, startRoomCleanupInterval } from './src/lib/socket/server-handlers';
import { saveSnapshot } from './src/lib/game/room';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  registerSocketHandlers(io);
  startRoomCleanupInterval();

  // Snapshot game state every 30 seconds for crash recovery
  setInterval(() => {
    try { saveSnapshot(); } catch { /* non-critical */ }
  }, 30_000);

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running`);
  });
});
