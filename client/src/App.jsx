import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { generateECDHKeyPair, exportPublicKey } from './utils/CryptoEngine';
import Onboarding from './components/Onboarding';
import ChatRoom from './components/ChatRoom';
import { motion, AnimatePresence } from 'framer-motion';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const socket = io();

export default function App() {
  const [isJoined, setIsJoined] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [myKeys, setMyKeys] = useState(null);
  const [cryptoStatus, setCryptoStatus] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    // Sync Dark Mode
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
     // Re-establish session if refreshed
     const savedSession = sessionStorage.getItem('whisper_session');
     if (savedSession) {
        try {
           const parsed = JSON.parse(savedSession);
           const restoredKeys = {
             publicKey: decodeBase64(parsed.publicKeyBase64),
             privateKey: decodeBase64(parsed.privateKeyBase64)
           };
           setMyKeys(restoredKeys);
           setCurrentUser({
             username: parsed.username,
             avatarSvg: parsed.avatarSvg,
             publicKey: parsed.publicKeyBase64
           });
           setIsJoined(true);
        } catch(e) {
           sessionStorage.removeItem('whisper_session');
        }
     }
  }, []);

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
      
      sessionStorage.setItem('whisper_session', JSON.stringify({
        username: fullUserData.username,
        avatarSvg: fullUserData.avatarSvg,
        publicKeyBase64: exportedPubKey,
        privateKeyBase64: encodeBase64(keyPair.privateKey)
      }));
      // Removed socket.emit('join_room', fullUserData) to fix race condition. 
      // It will now be emitted by ChatRoom.jsx exactly when it is ready to receive room_state.
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden dark:bg-slate-900 bg-gray-50 text-gray-900 dark:text-gray-100 transition-colors duration-500 font-sans">
      {/* Abstract Animated Background Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 dark:bg-blue-600/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/20 dark:bg-emerald-600/20 blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '12s' }}></div>
      
      <AnimatePresence mode="wait">
        {!isJoined ? (
          <Onboarding key="onboarding" onJoin={handleJoin} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
        ) : (
          <ChatRoom key="chatroom" socket={socket} currentUser={currentUser} myKeys={myKeys} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
        )}
      </AnimatePresence>
    </div>
  );
}
