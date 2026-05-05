const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = 2627;

// Resolve static path correctly whether running as raw node or pkg executable
const STATIC_DIR = process.pkg
  ? path.join(path.dirname(process.execPath), 'client', 'dist')
  : path.join(__dirname, 'client', 'dist');

app.use(express.static(STATIC_DIR));
app.get('*', (req, res) => res.sendFile(path.join(STATIC_DIR, 'index.html')));

// Map: socket.id -> { username, avatarSvg, publicKey, isMaster }
const users = new Map();
let currentRoomId = Date.now().toString();

io.on('connection', (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // Step 1: User joins and shares their Public Key
  socket.on('join_room', (userData) => {
    const existingUser = users.get(socket.id);
    const isFirstUser = existingUser ? existingUser.isMaster : (users.size === 0);
    
    if (!existingUser && isFirstUser) {
      currentRoomId = Date.now().toString() + Math.random().toString(36).substring(7);
    }
    
    users.set(socket.id, {
      socketId: socket.id,
      username: userData.username,
      avatarSvg: userData.avatarSvg,
      publicKey: userData.publicKey, // JWT format
      isMaster: isFirstUser
    });
    
    console.log(`[LOBBY] ${userData.username} joined. Master: ${isFirstUser}`);

    // Tell the user their own state & who else is here
    socket.emit('room_state', { 
      users: Array.from(users.values()), 
      roomId: currentRoomId 
    });

    // Tell others (specifically the Key Master) that a new user appeared
    socket.broadcast.emit('user_joined', {
      socketId: socket.id,
      username: userData.username,
      avatarSvg: userData.avatarSvg,
      publicKey: userData.publicKey,
    });
  });

  // Step 2: The Key Master sends the encrypted Symmetric Room Key payload to the New User
  socket.on('send_room_key', ({ targetSocketId, encryptedRoomKeyPayload }) => {
    socket.to(targetSocketId).emit('receive_room_key', encryptedRoomKeyPayload);
  });

  // Healing request for desynced Peers
  socket.on('request_room_key', (masterId) => {
    // Notify the current master that this user respectfully desperately needs a key drop!
    socket.to(masterId).emit('user_joined', {
      socketId: socket.id,
      ...users.get(socket.id)
    });
  });

  // Step 3: General Message Routing (Payload is pure ciphertext now)
  socket.on('chat_message', (payload) => {
    // payload: { id, senderId, username, avatarSvg, iv, ciphertext, timestamp }
    const user = users.get(socket.id);
    if (!user) return;
    
    // Log ciphertext blob snippet to terminal to prove E2EE works
    console.log(`[SECURE_MSG] Routing: ${payload.ciphertext.substring(0, 15)}... from ${user.username}`);

    io.emit('chat_message', payload);
  });

  // Step 4: Typing Indicators
  socket.on('typing', (isTyping) => {
    const user = users.get(socket.id);
    if (!user) return;
    socket.broadcast.emit('user_typing', { username: user.username, isTyping });
  });

  socket.on('disconnect', () => {
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      console.log(`[-] ${user.username} left.`);
      socket.broadcast.emit('user_left', socket.id);
      users.delete(socket.id);

      // Reassign Key Master if the master left and there are still users!
      // This solves the Open Question you approved: "keep session, just continue"
      if (user.isMaster && users.size > 0) {
        const nextMasterKey = Array.from(users.keys())[0];
        const nextMaster = users.get(nextMasterKey);
        nextMaster.isMaster = true;
        
        io.to(nextMaster.socketId).emit('assign_master');
        console.log(`[LOBBY] Master reassigned to ${nextMaster.username}`);
      }

      // VITAL: Re-emit synchronized room state so nobody loses track of Master!
      io.emit('room_state', { 
        users: Array.from(users.values()), 
        roomId: currentRoomId 
      });
    }
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
  console.log(`🚀 Whisper — Secure Offline Chat is LIVE!`);
  console.log(`=================================================`);
  console.log(`🖥️  Local:          http://localhost:${PORT}`);
  console.log(`🔗 Network Link:   ${serverUrl}`);
  console.log(`\nShare this link or scan the QR code below:\n`);
  qrcode.generate(serverUrl, { small: true });
  console.log(`\nPress Ctrl+C to stop the server.\n`);

  // Auto-open browser after 800ms (gives server a moment to fully bind)
  setTimeout(() => {
    const url = `http://localhost:${PORT}`;
    const cmd = process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
    exec(cmd, (err) => {
      if (err) console.log(`[INFO] Could not auto-open browser. Navigate to: ${url}`);
    });
  }, 800);
});
