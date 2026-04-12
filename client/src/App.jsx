import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { generateECDHKeyPair, exportPublicKey } from './utils/CryptoEngine';
import Onboarding from './components/Onboarding';
import ChatRoom from './components/ChatRoom';
import { motion, AnimatePresence } from 'framer-motion';

const socket = io();

export default function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myKeys, setMyKeys] = useState(null);
  const [cryptoStatus, setCryptoStatus] = useState('');

  const handleJoin = async (userData) => {
    setCryptoStatus('Generating ECDH Keys...');
    try {
      // 1. Generate local Asymmetric key pair
      const keyPair = await generateECDHKeyPair();
      const exportedPubKey = await exportPublicKey(keyPair.publicKey);
      
      setMyKeys(keyPair);
      
      const fullUserData = {
        ...userData,
        publicKey: exportedPubKey
      };

      setCurrentUser(fullUserData);
      setIsJoined(true);
      // Removed socket.emit('join_room', fullUserData) to fix race condition. 
      // It will now be emitted by ChatRoom.jsx exactly when it is ready to receive room_state.
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden dark:bg-slate-900 bg-gray-50 text-gray-900 dark:text-gray-100 transition-colors duration-500 font-sans">
      {/* Abstract Animated Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 dark:bg-blue-600/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 dark:bg-emerald-600/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '12s' }}></div>
      
      <AnimatePresence mode="wait">
        {!isJoined ? (
          <motion.div key="onboarding" exit={{ opacity: 0, y: -20, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <Onboarding onJoin={handleJoin} />
            {cryptoStatus && <div className="absolute bottom-10 w-full text-center text-xs text-gray-400 font-bold tracking-widest uppercase">{cryptoStatus}</div>}
          </motion.div>
        ) : (
          <motion.div key="chatroom" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
             <ChatRoom socket={socket} currentUser={currentUser} myKeys={myKeys} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
