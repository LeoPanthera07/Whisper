const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const os         = require('os');
const path       = require('path');
const { exec }   = require('child_process');
const qrcode     = require('qrcode-terminal');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = 2627;

// ─── Static file serving ────────────────────────────────────────────────────
// When bundled with pkg we serve from the embedded base64 asset map.
// In dev (plain node) we serve from the filesystem as normal.

const MIME = {
  '.html' : 'text/html; charset=utf-8',
  '.css'  : 'text/css; charset=utf-8',
  '.js'   : 'application/javascript; charset=utf-8',
  '.json' : 'application/json',
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.jpeg' : 'image/jpeg',
  '.svg'  : 'image/svg+xml',
  '.ico'  : 'image/x-icon',
  '.woff' : 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf'  : 'font/ttf',
  '.webp' : 'image/webp',
};

if (process.pkg) {
  // ── Packaged exe: serve everything from embedded-assets.js ──────────────
  const ASSETS = require('./embedded-assets');

  app.get('*', (req, res) => {
    const urlPath = req.path === '/' ? '/index.html' : req.path;
    const data    = ASSETS[urlPath];

    if (data) {
      const ext  = path.extname(urlPath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      return res.send(Buffer.from(data, 'base64'));
    }

    // SPA fallback — serve index.html for any unknown route
    res.setHeader('Content-Type', MIME['.html']);
    return res.send(Buffer.from(ASSETS['/index.html'], 'base64'));
  });

} else {
  // ── Development: serve from filesystem ──────────────────────────────────
  const DIST = path.join(__dirname, 'client', 'dist');
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

// ─── Socket.io / Chat logic ──────────────────────────────────────────────────

const users = new Map();
let currentRoomId = Date.now().toString();

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  socket.on('join_room', (userData) => {
    const existingUser = users.get(socket.id);
    const isFirstUser  = existingUser ? existingUser.isMaster : (users.size === 0);

    if (!existingUser && isFirstUser) {
      currentRoomId = Date.now().toString() + Math.random().toString(36).substring(7);
    }

    users.set(socket.id, {
      socketId  : socket.id,
      username  : userData.username,
      avatarSvg : userData.avatarSvg,
      publicKey : userData.publicKey,
      isMaster  : isFirstUser,
    });

    console.log(`[LOBBY] ${userData.username} joined. Master: ${isFirstUser}`);

    socket.emit('room_state', { users: Array.from(users.values()), roomId: currentRoomId });
    socket.broadcast.emit('user_joined', {
      socketId  : socket.id,
      username  : userData.username,
      avatarSvg : userData.avatarSvg,
      publicKey : userData.publicKey,
    });
  });

  socket.on('send_room_key', ({ targetSocketId, encryptedRoomKeyPayload }) => {
    socket.to(targetSocketId).emit('receive_room_key', encryptedRoomKeyPayload);
  });

  socket.on('request_room_key', (masterId) => {
    socket.to(masterId).emit('user_joined', { socketId: socket.id, ...users.get(socket.id) });
  });

  socket.on('chat_message', (payload) => {
    const user = users.get(socket.id);
    if (!user) return;
    console.log(`[SECURE_MSG] ${user.username}: ${payload.ciphertext.substring(0, 15)}...`);
    io.emit('chat_message', payload);
  });

  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.broadcast.emit('user_typing', { username: user.username, isTyping });
  });

  socket.on('disconnect', () => {
    if (!users.has(socket.id)) return;
    const user = users.get(socket.id);
    console.log(`[-] ${user.username} left.`);
    socket.broadcast.emit('user_left', socket.id);
    users.delete(socket.id);

    if (user.isMaster && users.size > 0) {
      const nextKey    = Array.from(users.keys())[0];
      const nextMaster = users.get(nextKey);
      nextMaster.isMaster = true;
      io.to(nextMaster.socketId).emit('assign_master');
      console.log(`[LOBBY] Master reassigned to ${nextMaster.username}`);
    }

    io.emit('room_state', { users: Array.from(users.values()), roomId: currentRoomId });
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

const getLocalIP = () => {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
};

const hostIP    = getLocalIP();
const serverUrl = `http://${hostIP}:${PORT}`;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n=================================================');
  console.log('🚀 Whisper — Secure Offline Chat is LIVE!');
  console.log('=================================================');
  console.log(`🖥️  Local:         http://localhost:${PORT}`);
  console.log(`🔗 Network Link:  ${serverUrl}`);
  console.log('\nScan the QR below to join from another device:\n');
  qrcode.generate(serverUrl, { small: true });
  console.log('\nPress Ctrl+C to stop.\n');

  // Auto-open browser after server fully binds
  setTimeout(() => {
    const url = `http://localhost:${PORT}`;
    const cmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, (err) => {
      if (err) console.log(`[INFO] Open your browser at: ${url}`);
    });
  }, 800);
});
