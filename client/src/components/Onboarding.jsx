import React, { useState, useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import { Shuffle, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Onboarding({ onJoin, isDarkMode, toggleTheme }) {
  const [nickname, setNickname] = useState('');
  const [avatarSvg, setAvatarSvg] = useState('');
  const [seed, setSeed] = useState('random_bot');

  useEffect(() => {
    const avatar = createAvatar(notionists, {
      seed: seed,
      size: 128
      // Removed backgroundColor explicitly to enable transparency
    });
    setAvatarSvg(avatar.toString());
  }, [seed]);

  const handleRandomize = () => {
    setSeed(Math.random().toString(36).substring(7));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim().length >= 2) {
      onJoin({ username: nickname.trim(), avatarSvg });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative z-10 w-full">
      {/* Theme Toggle Button */}
      <div className="absolute top-6 right-6 z-50">
        <button onClick={toggleTheme} className="p-2 sm:p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors backdrop-blur-md">
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
          )}
        </button>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-panel w-full max-w-md p-8 rounded-3xl flex flex-col items-center shadow-2xl"
      >
        <motion.div
           initial={{ opacity:0 }}
           animate={{ opacity:1 }}
           transition={{ delay: 0.3 }}
           className="flex items-center gap-3 mb-2"
        >
          <ShieldCheck className="text-green-400" size={32} />
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 pb-1">
            Whisper
          </h1>
        </motion.div>
        
        <p className="text-sm dark:text-gray-400 text-gray-500 mb-8 text-center font-medium">
          Encrypted LAN Lobby. Zero Internet.
        </p>

        {/* Avatar Area */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative mb-8 cursor-pointer group" 
          onClick={handleRandomize}
        >
          <div 
            className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-xl bg-white [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: avatarSvg }}
          />

          <button 
            type="button"
            className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-500 transition-colors z-10"
            title="Randomize"
          >
            <Shuffle size={16} />
          </button>
        </motion.div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-6">
            <label className="block text-xs font-bold mb-2 uppercase tracking-wider dark:text-gray-300 text-gray-600">
              Identity Alias
            </label>
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setSeed(e.target.value || 'random_bot');
              }}
              placeholder="e.g. Cipher"
              className="glass-input w-full px-4 py-3 rounded-xl text-lg font-medium transition-all shadow-inner"
              autoFocus
              maxLength={20}
            />
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit" 
            disabled={nickname.trim().length < 2}
            className="w-full flex justify-center items-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:grayscale text-white text-lg font-bold rounded-xl shadow-lg transition-all"
          >
            Generate Keys & Join <ArrowRight size={20} />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
