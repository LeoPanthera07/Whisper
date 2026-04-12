import React, { useState, useEffect, useRef } from 'react';
import { Send, Moon, Sun, ShieldCheck, ShieldAlert, Key, Zap } from 'lucide-react';
import { 
  deriveSharedKey, 
  generateRoomKey, 
  exportSymmetricKey, 
  importSymmetricKey, 
  importPublicKey, 
  encryptMessage, 
  decryptMessage 
} from '../utils/CryptoEngine';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatRoom({ socket, currentUser, myKeys, isDarkMode, toggleTheme }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(`whisper_chat_history`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  const [cryptoStatus, setCryptoStatus] = useState('Waiting for Secure Connection...');
  const roomKeyRef = useRef(null);
  const isMasterRef = useRef(false);
  const onlineUsersRef = useRef([]);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);

  // Keep ref synced
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

  // isDarkMode effect moved to App.jsx

  useEffect(() => {
    localStorage.setItem(`whisper_chat_history`, JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // 1. Send join_room immediately upon mounting so we don't miss room_state
    socket.emit('join_room', currentUser);

    socket.on('room_state', async (payload) => {
      // payload supports either array (old) or object (new) for transition safety
      const usersList = Array.isArray(payload) ? payload : payload.users;
      const roomId = Array.isArray(payload) ? null : payload.roomId;

      setOnlineUsers(usersList);

      if (roomId) {
        const savedRoomId = localStorage.getItem('whisper_room_id');
        if (savedRoomId !== roomId) {
          setMessages([]);
          localStorage.setItem('whisper_room_id', roomId);
          localStorage.removeItem('whisper_chat_history');
        }
      }

      const me = usersList.find(u => u.socketId === socket.id);
      if (me && me.isMaster && !roomKeyRef.current) {
        isMasterRef.current = true;
        setCryptoStatus('Key Master: Generating Symmetric Room Key...');
        const newRoomKey = await generateRoomKey();
        roomKeyRef.current = newRoomKey;
        setCryptoStatus('E2EE Secured (Master)');
      }
    });

    socket.on('user_joined', async (user) => {
      setOnlineUsers(prev => {
         const exists = prev.find(u => u.socketId === user.socketId);
         if (exists) return prev;
         return [...prev, user];
      });

      if (isMasterRef.current) {
         // Wait up to 2 seconds for RoomKey to finish generating if race condition occurred
         let attempts = 0;
         while (!roomKeyRef.current && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
         }
         
         if (!roomKeyRef.current) return;

        try {
          const peerPublicKey = await importPublicKey(user.publicKey);
          const sharedSecret = await deriveSharedKey(myKeys.privateKey, peerPublicKey);
          const base64RoomKey = await exportSymmetricKey(roomKeyRef.current);
          const encryptedRoomKeyPayload = await encryptMessage(base64RoomKey, sharedSecret);
          
          socket.emit('send_room_key', { 
            targetSocketId: user.socketId, 
            encryptedRoomKeyPayload 
          });
        } catch(e) {
          console.error("Failed to distribute key:", e);
        }
      }
    });

    socket.on('receive_room_key', async (payload) => {
      setCryptoStatus('Decrypting Received Room Key...');
      try {
        // Wait slightly if room_state hasn't populated onlineUsers yet
        let master = onlineUsersRef.current.find(u => u.isMaster);
        if (!master) {
          await new Promise(r => setTimeout(r, 500));
          master = onlineUsersRef.current.find(u => u.isMaster);
        }
        if (!master) throw new Error("No master found to decrypt key against.");
        
        const masterPubKey = await importPublicKey(master.publicKey);
        const sharedSecret = await deriveSharedKey(myKeys.privateKey, masterPubKey);
        const base64RoomKey = await decryptMessage(payload.iv, payload.ciphertext, sharedSecret);
        
        if (base64RoomKey.includes("Unreadable")) throw new Error("Decryption failed");
        
        const symmetricRoomKey = await importSymmetricKey(base64RoomKey);
        roomKeyRef.current = symmetricRoomKey;
        setCryptoStatus('E2EE Secured (Peer)');
      } catch (err) {
        console.error("Crypto Handshake failed, requesting key heal...", err);
        setCryptoStatus('E2EE Keys Error - Retrying...');
        // Auto-heal by politely asking the Master for a fresh key relay
        let master = onlineUsersRef.current.find(u => u.isMaster);
        if (master) {
           setTimeout(() => socket.emit('request_room_key', master.socketId), 1000);
        }
      }
    });

    socket.on('assign_master', async () => {
      isMasterRef.current = true;
      if (roomKeyRef.current) {
        setCryptoStatus('E2EE Secured (Master)');
      } else {
        setCryptoStatus('Key Master: Generating Symmetric... ');
        roomKeyRef.current = await generateRoomKey();
        setCryptoStatus('E2EE Secured (Master)');
      }
    });

    socket.on('user_left', (socketId) => {
      setOnlineUsers((prev) => prev.filter(u => u.socketId !== socketId));
    });

    socket.on('chat_message', async (msgPayload) => {
      // Ignore if no key
      if (!roomKeyRef.current) return;

      const plaintext = await decryptMessage(msgPayload.iv, msgPayload.ciphertext, roomKeyRef.current);
      
      const decryptedMsg = {
        id: msgPayload.id,
        senderId: msgPayload.senderId,
        username: msgPayload.username,
        avatarSvg: msgPayload.avatarSvg,
        timestamp: msgPayload.timestamp,
        text: plaintext
      };
      
      setMessages(prev => [...prev, decryptedMsg]);
    });

    socket.on('user_typing', ({ username, isTyping }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        if (isTyping) next.add(username);
        else next.delete(username);
        return next;
      });
    });

    return () => {
      socket.off('room_state');
      socket.off('user_joined');
      socket.off('receive_room_key');
      socket.off('assign_master');
      socket.off('user_left');
      socket.off('chat_message');
      socket.off('user_typing');
    };
  }, [socket, myKeys.privateKey]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !roomKeyRef.current) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socket.emit('typing', false);

    const textToSend = inputText.trim();
    setInputText('');
    
    try {
      const { iv, ciphertext } = await encryptMessage(textToSend, roomKeyRef.current);
      socket.emit('chat_message', {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        senderId: socket.id,
        username: currentUser.username,
        avatarSvg: currentUser.avatarSvg,
        timestamp: Date.now(),
        iv,
        ciphertext
      });
    } catch(err) {
      console.error("Encryption error:", err);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!roomKeyRef.current) return;

    socket.emit('typing', true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 1500);
  };

  // toggleTheme passed from props!

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // UI States
  const isSecure = cryptoStatus.includes('E2EE Secured');

  return (
    <motion.div 
       initial={{ opacity: 0 }} 
       animate={{ opacity: 1 }} 
       className="fixed inset-0 flex flex-col w-[100dvw] h-[100dvh] z-[999] bg-gray-50 dark:bg-slate-900 border-none m-0 p-0 font-sans"
    >
      {/* Header */}
      <header className="h-20 w-full px-4 sm:px-8 flex items-center justify-between border-b border-gray-200/50 dark:border-white/10 shadow-sm flex-shrink-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className="w-12 h-12 rounded-full border-2 border-emerald-500 bg-white shadow-[0_0_15px_rgba(16,185,129,0.3)] flex-shrink-0 flex justify-center items-center [&>svg]:w-full [&>svg]:h-full"
            style={{ clipPath: 'circle(50% at 50% 50%)' }}
            dangerouslySetInnerHTML={{ __html: currentUser.avatarSvg }} 
          />
          <div>
            <h2 className="font-extrabold text-lg dark:text-white tracking-tight">{currentUser.username}</h2>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online • {onlineUsers.length} in room
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors backdrop-blur-md">
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-700" />}
          </button>
          <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide border shadow-sm transition-all duration-500 ${
            isSecure 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
          }`}>
            {isSecure ? <ShieldCheck size={16} /> : <Key size={16} className="animate-pulse" />} 
            {cryptoStatus}
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide z-10 relative">
        {/* System Messages */}
        <AnimatePresence>
          {!isSecure && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex justify-center w-full my-4"
            >
              <div className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 px-5 py-2 rounded-full text-xs font-bold backdrop-blur-xl flex items-center gap-2 shadow-lg">
                <ShieldAlert size={14} /> Key Exchange in Progress...
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message Stream */}
        {messages.map((msg) => {
          const isMe = msg.senderId === socket.id;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              key={msg.id} 
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                {/* Avatar */}
                <div 
                  className="w-10 h-10 rounded-full flex-shrink-0 border border-black/10 dark:border-white/10 bg-white shadow-sm flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  style={{ clipPath: 'circle(50% at 50% 50%)' }}
                  dangerouslySetInnerHTML={{ __html: msg.avatarSvg }}
                />
                
                {/* Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] mb-1 font-bold uppercase tracking-wider dark:text-gray-400 text-gray-500 px-1">
                    {msg.username} <span className="opacity-50 mx-1">•</span> {formatTime(msg.timestamp)}
                  </span>
                  
                  <div className={`px-5 py-4 rounded-3xl shadow-md relative backdrop-blur-sm ${
                    isMe 
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm shadow-[0_4px_20px_rgba(79,70,229,0.3)]' 
                      : 'bg-white/90 dark:bg-slate-800/90 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-tl-sm'
                  }`}>
                    <p className="break-words leading-relaxed text-[15px] font-medium">{msg.text}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2"
            >
              <div className="flex gap-1 items-center bg-gray-200 dark:bg-slate-800/80 px-3 py-2 rounded-full shadow-sm border border-gray-300 dark:border-white/5">
                 <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                 <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                 <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
              </div>
              {Array.from(typingUsers).join(', ')} typing...
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-6" />
      </main>

      {/* Input Area */}
      <footer className="h-20 w-full px-4 sm:px-6 flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 flex-shrink-0 z-30">
        <form onSubmit={handleSend} className="w-full max-w-5xl mx-auto relative flex items-center group">
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            disabled={!isSecure}
            placeholder={isSecure ? "Type your encrypted message..." : "Establishing Secure Handshake..."}
            className="w-full glass-input backdrop-blur-2xl bg-white/70 dark:bg-black/40 border border-gray-200 dark:border-gray-700/50 rounded-full px-6 py-4 pr-16 dark:text-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 transition-all font-medium focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
            autoComplete="off"
            autoFocus
          />
          <AnimatePresence>
            {inputText.trim() && isSecure && (
              <motion.button 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                type="submit"
                className="absolute right-2 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)] flex items-center justify-center"
              >
                <Zap size={18} className="fill-white" />
              </motion.button>
            )}
            {(!inputText.trim() || !isSecure) && (
              <button 
                type="button"
                disabled
                className="absolute right-2 p-3 bg-gray-200 dark:bg-gray-800 text-gray-400 rounded-full opacity-50 cursor-not-allowed transition-all flex items-center justify-center"
              >
                <Send size={18} />
              </button>
            )}
          </AnimatePresence>
        </form>
      </footer>
    </motion.div>
  );
}
