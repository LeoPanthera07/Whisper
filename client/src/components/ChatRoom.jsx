import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, Shield, Moon, Sun, LogOut } from 'lucide-react';

export default function ChatRoom({ socket, currentUser, onDisconnect }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Apply dark mode initially
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    // Socket Listeners
    socket.on('room_state', (users) => {
      setOnlineUsers(users);
    });

    socket.on('user_joined', (user) => {
      setOnlineUsers((prev) => [...prev, user]);
      // Optional: Add a system message locally
    });

    socket.on('user_left', (socketId) => {
      setOnlineUsers((prev) => prev.filter(u => u.socketId !== socketId));
    });

    socket.on('chat_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('room_state');
      socket.off('user_joined');
      socket.off('user_left');
      socket.off('chat_message');
    };
  }, [socket]);

  // Auto-scroll logic
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    socket.emit('chat_message', inputText.trim());
    setInputText('');
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Helper to format time
  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen w-full relative z-10">
      {/* Header */}
      <header className="glass-panel px-6 py-4 flex items-center justify-between border-b dark:border-white/10 z-20 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-green-500 bg-gray-800"
               dangerouslySetInnerHTML={{ __html: currentUser.avatarSvg }} />
          <div>
            <h2 className="font-bold text-lg dark:text-white leading-tight">{currentUser.username}</h2>
            <div className="flex items-center gap-1 text-xs text-green-500 font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Online • {onlineUsers.length} in room
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-full glass-input hover:bg-white/20 dark:hover:bg-black/50 transition-colors">
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-700" />}
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold uppercase tracking-wide">
            <Shield size={14} /> Unencrypted (Sprint 2)
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* System Welcome Message */}
        <div className="flex justify-center w-full my-6">
          <div className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-sm">
            Welcome to the LAN lobby. Connections are P2P over Wi-Fi.
          </div>
        </div>

        {/* Message Stream */}
        {messages.map((msg) => {
          const isMe = msg.senderId === socket.id;
          
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div 
                  className="w-10 h-10 rounded-full flex-shrink-0 border border-black/10 dark:border-white/10 bg-gray-800"
                  // Render the SVG
                  dangerouslySetInnerHTML={{ __html: msg.avatarSvg }}
                />
                
                {/* Bubble */}
                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[11px] mb-1 font-semibold dark:text-gray-400 text-gray-500 pl-1 pr-1">
                    {msg.username} • {formatTime(msg.timestamp)}
                  </span>
                  
                  <div className={`px-4 py-3 rounded-2xl shadow-sm relative ${
                    isMe 
                      ? 'bg-blue-600 dark:bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-tl-none'
                  }`}>
                    <p className="break-words leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-4" />
      </main>

      {/* Input Area */}
      <footer className="p-4 sm:p-6 glass-panel border-t dark:border-white/10 z-20">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message securely..."
            className="w-full glass-input rounded-full px-6 py-4 pr-16 dark:text-white dark:placeholder-gray-400 transition-all font-medium"
            autoComplete="off"
            autoFocus
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="absolute right-2 p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md group"
          >
            <Send size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </form>
      </footer>
    </div>
  );
}
