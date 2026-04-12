import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Onboarding from './components/Onboarding';
import ChatRoom from './components/ChatRoom';

const socket = io();

export default function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleJoin = (userData) => {
    setCurrentUser(userData);
    setIsJoined(true);
    socket.emit('join_room', userData);
  };

  return (
    <div className="relative min-h-screen overflow-hidden dark:bg-slate-900 bg-gray-50 text-gray-900 dark:text-gray-100 transition-colors duration-300 font-sans">
      {/* Abstract Background Blobs for Glassmorphism Accent */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 dark:bg-blue-600/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-500/20 dark:bg-purple-600/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '12s' }}></div>
      
      {isJoined ? (
        <ChatRoom socket={socket} currentUser={currentUser} />
      ) : (
        <Onboarding onJoin={handleJoin} />
      )}
    </div>
  );
}
