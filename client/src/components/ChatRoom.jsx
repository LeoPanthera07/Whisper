import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Moon, Sun, ShieldCheck, ShieldAlert, Key, Zap, Smile, CornerDownLeft, X } from 'lucide-react';
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
import EmojiPicker from './EmojiPicker';

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
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, username, text }
  const emojiAnchorRef = useRef(null);

  const [cryptoStatus, setCryptoStatus] = useState('Waiting for Secure Connection...');
  const roomKeyRef = useRef(null);
  const isMasterRef = useRef(false);
  const onlineUsersRef = useRef([]);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Keep ref synced
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

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
        text: plaintext,
        replyTo: msgPayload.replyTo || null,
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
    const currentReply = replyTo;
    setInputText('');
    setReplyTo(null);
    
    try {
      const { iv, ciphertext } = await encryptMessage(textToSend, roomKeyRef.current);
      socket.emit('chat_message', {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        senderId: socket.id,
        username: currentUser.username,
        avatarSvg: currentUser.avatarSvg,
        timestamp: Date.now(),
        replyTo: currentReply,
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

  const handleEmojiSelect = useCallback((emoji) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.timestamp).toDateString();
    if (!groups.length || groups[groups.length - 1].dateKey !== dateKey) {
      groups.push({ dateKey, label: formatDate(msg.timestamp), messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
    return groups;
  }, []);

  // UI States
  const isSecure = cryptoStatus.includes('E2EE Secured');

  return (
    <motion.div 
       initial={{ opacity: 0 }} 
       animate={{ opacity: 1 }} 
       className="fixed inset-0 flex flex-col w-[100dvw] h-[100dvh] z-[999] bg-gray-50 dark:bg-slate-900 border-none m-0 p-0"
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
            <h2 className="font-bold text-lg dark:text-white tracking-tight">{currentUser.username}</h2>
            <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online • {onlineUsers.length} in room
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors backdrop-blur-md">
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-700" />}
          </button>
          <div className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wide border shadow-sm transition-all duration-500 ${
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
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-hide z-10 relative">
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

        {/* Grouped Message Stream */}
        {groupedMessages.map((group) => (
          <div key={group.dateKey} className="mb-2">
            {/* Date separator */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-white/5">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-white/10" />
            </div>

            <div className="space-y-3">
              {group.messages.map((msg) => {
                const isMe = msg.senderId === socket.id;
                const emojiOnly = isSingleEmojiMessage(msg.text);

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    key={msg.id}
                    className={`group flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[82%] md:max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>

                      {/* Row: bubble + reply button */}
                      <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

                        {/* Reply button — plain button, CSS group-hover (no framer inline opacity override) */}
                        <button
                          onClick={() => setReplyTo({ id: msg.id, username: msg.username, text: msg.text })}
                          className="opacity-0 group-hover:opacity-100 transition-all duration-150 p-1.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:scale-110 flex-shrink-0 mb-2 cursor-pointer"
                          title="Reply"
                          type="button"
                        >
                          <CornerDownLeft size={14} />
                        </button>

                        {/* ── EMOJI-ONLY: large floating emoji, no bubble ── */}
                        {emojiOnly ? (
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && (
                              <p className="text-[11px] font-bold mb-1 px-1 tracking-wide"
                                style={{ color: stringToColor(msg.username) }}>
                                {msg.username}
                              </p>
                            )}
                            <div
                              className="leading-none select-none"
                              style={{
                              fontSize: 44,
                                fontFamily: 'Inter, "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                                lineHeight: 1.1,
                              }}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[10px] font-medium tabular-nums mt-1 px-1 text-gray-400 dark:text-gray-500">
                              {formatTime(msg.timestamp)}
                            </span>
                          </div>
                        ) : (
                        /* ── NORMAL BUBBLE ── */
                        <div
                          className={`relative px-4 pt-3 pb-2.5 rounded-[22px] shadow-md backdrop-blur-sm ${
                            isMe
                              ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-[6px] shadow-[0_4px_20px_rgba(79,70,229,0.28)]'
                              : 'bg-white/90 dark:bg-slate-800/90 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-tl-[6px]'
                          }`}
                        >
                          {/* Sender name — only for others' messages */}
                          {!isMe && (
                            <p
                              className="text-[11px] font-bold mb-1.5 tracking-wide"
                              style={{ color: stringToColor(msg.username) }}
                            >
                              {msg.username}
                            </p>
                          )}

                          {/* Reply Quote */}
                          {msg.replyTo && (
                            <div className={`mb-2 pl-2.5 border-l-2 rounded-sm ${
                              isMe
                                ? 'border-white/40 bg-white/10'
                                : 'border-indigo-400/60 bg-gray-100/70 dark:bg-white/5'
                            } py-1 pr-2 rounded-r-lg`}>
                              <p className={`text-[10px] font-semibold mb-0.5 ${
                                isMe ? 'text-white/70' : ''
                              }`}
                                style={!isMe ? { color: stringToColor(msg.replyTo.username) } : {}}
                              >
                                {msg.replyTo.username}
                              </p>
                              <p className={`text-[12px] truncate ${
                                isMe ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'
                              }`}
                                style={{ fontFamily: 'Inter, "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}
                              >
                                {msg.replyTo.text}
                              </p>
                            </div>
                          )}

                          {/* Message text */}
                          <p
                            className="break-words leading-relaxed text-[15px] font-normal"
                            style={{ fontFamily: 'Inter, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}
                          >
                            {msg.text}
                          </p>

                          {/* Timestamp inside bubble */}
                          <div className={`flex items-center justify-end gap-1 mt-1.5 ${isMe ? 'opacity-60' : 'opacity-40'}`}>
                            <span className="text-[10px] font-medium tabular-nums">
                              {formatTime(msg.timestamp)}
                            </span>
                            {isMe && (
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M1 12.5l4.5-4.5 3 3L14 4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}

        <AnimatePresence>
          {typingUsers.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2 mt-3"
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

      {/* Reply Preview Bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="flex-shrink-0 w-full px-4 sm:px-6 py-2 bg-white/90 dark:bg-slate-800/90 border-t border-gray-200 dark:border-white/10 backdrop-blur-xl z-30"
          >
            <div className="max-w-5xl mx-auto flex items-center gap-3">
              <div className="w-0.5 h-8 rounded-full bg-indigo-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold" style={{ color: stringToColor(replyTo.username) }}>
                  {replyTo.username}
                </p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate"
                  style={{ fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}
                >
                  {replyTo.text}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-gray-500 flex-shrink-0 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <footer className="flex-shrink-0 w-full h-[72px] px-4 sm:px-6 flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/10 z-30">
        <form onSubmit={handleSend} className="w-full max-w-5xl mx-auto relative flex items-center">
          {/* Emoji toggle button — ref captured for portal positioning */}
          <button
            ref={emojiAnchorRef}
            type="button"
            onClick={() => setIsEmojiOpen(v => !v)}
            className={`mr-2 p-2.5 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
              isEmojiOpen
                ? 'bg-indigo-500/20 text-indigo-500 dark:text-indigo-400 scale-110'
                : 'text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/10'
            }`}
            title="Emoji"
          >
            <Smile size={22} />
          </button>

          {/* Portal emoji picker — anchored to button above */}
          <EmojiPicker
            anchorRef={emojiAnchorRef}
            isOpen={isEmojiOpen}
            onClose={() => setIsEmojiOpen(false)}
            onEmojiSelect={handleEmojiSelect}
          />

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            disabled={!isSecure}
            placeholder={replyTo ? `Replying to ${replyTo.username}...` : isSecure ? 'Type your encrypted message...' : 'Establishing Secure Handshake...'}
            className="flex-1 glass-input backdrop-blur-2xl bg-white/70 dark:bg-black/40 border border-gray-200 dark:border-gray-700/50 rounded-full px-6 py-4 pr-16 dark:text-white text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 transition-all font-medium focus:ring-2 focus:ring-indigo-500/50 shadow-inner"
            style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", ui-sans-serif, system-ui, sans-serif' }}
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

// Deterministic color from username string (for sender name tinting)
function stringToColor(str) {
  const palette = [
    '#60a5fa', // blue-400
    '#34d399', // emerald-400
    '#f472b6', // pink-400
    '#a78bfa', // violet-400
    '#fb923c', // orange-400
    '#facc15', // yellow-400
    '#2dd4bf', // teal-400
    '#e879f9', // fuchsia-400
    '#f87171', // red-400
    '#4ade80', // green-400
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

// Returns true when the message is only 1–3 emoji characters (no other text)
// Uses Intl.Segmenter for correct grapheme cluster counting (multi-codepoint emoji)
function isSingleEmojiMessage(text) {
  if (!text || text.trim().length === 0) return false;
  const trimmed = text.trim();
  // Quick reject: if any ASCII letter/number/punctuation, it's not emoji-only
  if (/[a-zA-Z0-9.,!?;:'"\-_@#$%^&*()[\]{}|<>/\\]/.test(trimmed)) return false;
  try {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = [...segmenter.segment(trimmed)].filter(s => s.segment.trim() !== '');
    if (segments.length === 0 || segments.length > 3) return false;
    // Every segment must be emoji-like (non-ASCII, >0 length)
    const emojiRe = /\p{Extended_Pictographic}/u;
    return segments.every(s => emojiRe.test(s.segment));
  } catch {
    // Fallback for environments without Intl.Segmenter
    return false;
  }
}
