const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const path = require('path');
const qrcode = require('qrcode-terminal');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

const PORT = 2627;

// Serve the static React build from the client/dist directory
// This provides the PWA effectively
app.use(express.static(path.join(__dirname, 'client/dist')));

// Fallback to index.html for React Router compatibility
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// WebSocket setup
io.on('connection', (socket) => {
  console.log(`[+] New client connected: ${socket.id}`);

  // Basic ping-pong to verify connection layout (Sprint 1)
  socket.on('ping', () => {
    socket.emit('pong', { message: 'Connection established securely to Host!' });
  });

  socket.on('disconnect', () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
  });
});

// Function to get Local Network IP (IPv4)
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      // Note: Focus on Wi-Fi or Ethernet interfaces often named 'Wi-Fi' on Windows
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
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
  console.log(`\n🔗 Access the app on host:   http://localhost:${PORT}`);
  console.log(`🔗 Access across network:    ${serverUrl}\n`);
  
  // Generate the QR Code in the terminal
  console.log(`📱 Scan this QR Code from other devices connected to your Wi-Fi/Hotspot:\n`);
  qrcode.generate(serverUrl, { small: true });
});
