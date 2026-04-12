const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = 2627;

// Serve the static React build
app.use(express.static(path.join(__dirname, 'client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// In-memory Room State (Sprint 2 / Unencrypted layer)
// Map of socket.id -> { username, avatarSvg }
const users = new Map();

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // Handshake listener: When a user finishes Onboarding
  socket.on('join_room', (userData) => {
    // Save to our memory map
    users.set(socket.id, {
      ...userData,
      socketId: socket.id
    });
    
    console.log(`[LOBBY] ${userData.username} joined.`);

    // Tell the new user about ALL existing users
    socket.emit('room_state', Array.from(users.values()));

    // Broadcast to everyone else that a new user joined
    socket.broadcast.emit('user_joined', {
      socketId: socket.id,
      ...userData
    });
  });

  // Chat message listener
  socket.on('chat_message', (msgContent) => {
    const user = users.get(socket.id);
    if (!user) return; // Ignore if user hasn't joined formally

    const messagePayload = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      senderId: socket.id,
      username: user.username,
      avatarSvg: user.avatarSvg,
      text: msgContent,
      timestamp: Date.now()
    };

    // Broadcast message back to ALL clients (including sender)
    io.emit('chat_message', messagePayload);
  });

  socket.on('disconnect', () => {
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      console.log(`[-] ${user.username} left.`);
      
      // Notify lobby
      socket.broadcast.emit('user_left', socket.id);
      users.delete(socket.id);
    }
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
};

const hostIP = getLocalIP();
const serverUrl = `http://${hostIP}:${PORT}`;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Offline Chat Server is ACTIVE!`);
  console.log(`=================================================`);
  console.log(`\n🔗 Host Localhost:   http://localhost:${PORT}`);
  console.log(`🔗 Network Link:     ${serverUrl}\n`);
  
  console.log(`📱 Scan this QR Code from other devices:\n`);
  qrcode.generate(serverUrl, { small: true });
});
