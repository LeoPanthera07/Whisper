import React, { useState, useEffect } from 'react';
import { createAvatar } from '@dicebear/core';
import { bottts } from '@dicebear/collection';
import { Shuffle, ArrowRight } from 'lucide-react';

export default function Onboarding({ onJoin }) {
  const [nickname, setNickname] = useState('');
  const [avatarSvg, setAvatarSvg] = useState('');

  useEffect(() => {
    generateAvatar(nickname || 'random_bot');
  }, [nickname]);

  const generateAvatar = (seed) => {
    const avatar = createAvatar(bottts, {
      seed: seed,
      size: 128,
      scale: 90,
      backgroundColor: ['1e293b', '0f172a', '334155'], // Dark Slate variations
    });
    setAvatarSvg(avatar.toString());
  };

  const handleRandomize = () => {
    const randomString = Math.random().toString(36).substring(7);
    generateAvatar(randomString);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim().length >= 2) {
      onJoin({ username: nickname.trim(), avatarSvg });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 relative z-10 w-full">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl flex flex-col items-center animate-fade-in-up">
        <h1 className="text-3xl font-extrabold mb-2 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          SneakChat
        </h1>
        <p className="text-sm dark:text-gray-400 text-gray-500 mb-8 text-center">
          Secure, offline local network chat.
        </p>

        {/* Avatar Preview */}
        <div className="relative mb-6 group cursor-pointer" onClick={handleRandomize}>
          <div 
            className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/20 shadow-lg bg-gray-800 transition-transform duration-300 group-hover:scale-105"
            dangerouslySetInnerHTML={{ __html: avatarSvg }}
          />
          <button 
            type="button"
            className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 text-xs rounded-full shadow-lg hover:bg-blue-500 transition-colors"
            title="Randomize Avatar"
          >
            <Shuffle size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-6">
            <label className="block text-xs font-bold mb-2 uppercase tracking-wider dark:text-gray-300 text-gray-600">
              Choose Nickname
            </label>
            <input 
              type="text" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. MasterChief"
              className="glass-input w-full px-4 py-3 rounded-xl text-lg font-medium transition-all"
              autoFocus
              maxLength={20}
            />
          </div>
          <button 
            type="submit" 
            disabled={nickname.trim().length < 2}
            className="w-full flex justify-center items-center gap-2 py-4 px-6 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl shadow-lg transition-all"
          >
            Enter Lobby <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
