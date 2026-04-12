import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Connect to the same host + port that served this frontend
// socket.io-client gracefully handles this automatically if left blank
const socket = io();

function App() {
  const [status, setStatus] = useState('Connecting to Host...');

  useEffect(() => {
    socket.on('connect', () => {
      setStatus(`Connected to server. Socket ID: ${socket.id}`);
      // Send a test ping back to the server to verify bi-directional messaging
      socket.emit('ping');
    });

    socket.on('pong', (data) => {
      setStatus(`Connected! Server says: ${data.message}`);
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected from server.');
    });

    return () => {
      socket.off('connect');
      socket.off('pong');
      socket.off('disconnect');
    };
  }, []);

  return (
    <div className="container">
      <h1>Offline Chat - Sprint 1 Phase</h1>
      <div className={`status-badge ${status.includes('Connected!') ? 'connected' : 'disconnected'}`}>
        {status}
      </div>
      <p className="subtitle">
        This page was natively served over the LAN/Hotspot. No internet required!
      </p>
    </div>
  );
}

export default App;
