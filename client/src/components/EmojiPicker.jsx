import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// iOS emoji categories with native Unicode emojis
const EMOJI_CATEGORIES = [
  {
    id: 'recent',
    icon: '🕐',
    label: 'Recent',
    emojis: [],
  },
  {
    id: 'smileys',
    icon: '😀',
    label: 'Smileys & People',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇',
      '🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝',
      '🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄',
      '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧',
      '🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','😟',
      '🙁','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭',
      '😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈',
      '👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖','😺','😸',
      '😹','😻','😼','😽','🙀','😿','😾',
      '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙',
      '👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏',
      '🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶',
      '👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👁️','👀','👅','👄',
    ],
  },
  {
    id: 'nature',
    icon: '🌿',
    label: 'Animals & Nature',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁',
      '🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆',
      '🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞',
      '🐜','🪲','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙',
      '🦑','🦐','🦞','🦀','🐡','🐟','🐠','🐬','🐳','🐋','🦈','🦭','🐊',
      '🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘',
      '🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🦮',
      '🐕‍🦺','🐩','🦴','🐈','🐈‍⬛','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️',
      '🌸','🌺','🌻','🌹','🥀','🌷','🌱','🌿','🍀','🍁','🍂','🍃','🌾',
      '🪴','🎋','🎍','🌵','🌴','🌲','🌳','🌑','🌒','🌓','🌔','🌕','⭐',
      '🌟','💫','✨','⚡','☄️','💥','🔥','🌈','☀️','🌤️','⛅','🌦️','🌧️',
      '⛈️','🌩️','🌨️','❄️','🌬️','💨','🌪️','🌫️','🌊','🌁',
    ],
  },
  {
    id: 'food',
    icon: '🍔',
    label: 'Food & Drink',
    emojis: [
      '🍎','🍊','🍋','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝',
      '🍅','🍆','🥑','🫒','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫛','🧄',
      '🧅','🥔','🍠','🫘','🥜','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥚',
      '🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫔',
      '🌮','🌯','🥙','🧆','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠',
      '🦪','🍣','🍤','🥟','🥠','🥡','🍦','🍧','🍨','🍩','🍪','🎂',
      '🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵',
      '🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾',
    ],
  },
  {
    id: 'activity',
    icon: '⚽',
    label: 'Activity',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸',
      '🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋',
      '🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸',
      '⛹️','🤺','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇',
      '🥈','🥉','🏅','🎖️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨',
      '🎬','🎤','🎧','🎼','🎵','🎶','🎷','🪗','🎸','🎹','🎺','🎻','🪕',
      '🥁','🪘','🎮','🕹️','🎲','♟️',
    ],
  },
  {
    id: 'travel',
    icon: '✈️',
    label: 'Travel & Places',
    emojis: [
      '🚗','🚕','🚙','🛻','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛵','🏍️',
      '🚲','🛴','🛺','🚁','🛸','🚀','✈️','🛩️','🪂','💺','🚂','🚆','🚇',
      '🚈','🚉','🚊','🚝','🚞','🚋','🚃','🚟','🚠','🚡','🚢','⛵','🛥️',
      '🚤','⛴️','🛳️','🚧','⛽','🏗️','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤',
      '🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽',
      '⛪','🕌','🛕','🕍','⛩️','🕋','🗾','⛰️','🏔️','🗻','🌋','🗺️','🌐',
      '🗿','🧭','🏕️','🏖️','🏜️','🏝️','🏞️','🌅','🌄','🌠','🎇',
    ],
  },
  {
    id: 'objects',
    icon: '💡',
    label: 'Objects',
    emojis: [
      '💌','🪧','📦','📫','📬','📭','📮','✏️','✒️','🖊️','🖋️','📝',
      '📁','📂','🗂️','📅','📆','🗒️','🗓️','📇','📈','📉','📊','📋','📌',
      '📍','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️','🔨','🪓',
      '⛏️','⚒️','🛠️','🗡️','⚔️','🔫','🪃','🛡️','🪚','🔧','🪛','🔩','⚙️',
      '🪤','🪣','💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','💾',
      '💿','📀','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️',
      '🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌚','⏳','⌛','📡','🔋','🪫','🔌',
      '💊','💉','🩸','🩹','🩺','🔬','🔭','🩻','🪬','🧬','🧫','🧪','🌡️',
      '🛋️','🪑','🚽','🪠','🚿','🛁','🪒','🧼','🪥','🪮','🪟','🪞','🧺',
      '🧹','🧻','🪣','🧴','🧷','🧽','🧯','🪤','🛒','🚪','🪜','🧸','🪆',
      '💎','💍','👑','👒','🎩','🪖','⛑️','📿','💄','👜','👝','🎒',
    ],
  },
  {
    id: 'symbols',
    icon: '❤️',
    label: 'Symbols',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹',
      '❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️',
      '✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍',
      '♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳',
      '🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵',
      '🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛',
      '🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕','🔇',
      '🔈','🔉','🔊','📢','📣','🔔','🔕','🎵','🎶','💹','🏧','🚮','🚰',
      '♿','🚹','🚺','🚻','🚼','🚾','⚠️','🚸','⛔','🚫','🚳','🚭','🚯',
      '🚱','🚷','📵','🔞','☢️','☣️','⬆️','↗️','➡️','↘️','⬇️','↙️','⬅️',
      '↖️','↕️','↔️','↩️','↪️','⤴️','⤵️','🔃','🔄','🔙','🔚','🔛','🔜',
      '🔝','🛐','⚛️','🕉️','✝️','☪️','🕍','☮️','🏳️','🏴','🏁','🚩','🏳️‍🌈',
      '#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣',
      '🔟','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓','ℹ️',
      '🆔','Ⓜ️','🆕','🆖','🅾️','🆗','🅿️','🆘','🆙','🆚','🈳','🈴','🈵',
    ],
  },
];

const RECENT_STORAGE_KEY = 'whisper_recent_emojis';
const MAX_RECENT = 32;

function getRecentEmojis() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function addRecentEmoji(emoji) {
  const recents = getRecentEmojis();
  const filtered = recents.filter((e) => e !== emoji);
  const updated = [emoji, ...filtered].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
}

const PICKER_W = 348;
const PICKER_H = 380; // approximate height

/**
 * EmojiPicker rendered into a portal so it's never clipped by any parent.
 * Position is calculated from the anchor button's bounding rect.
 *
 * Props:
 *   anchorRef   – ref of the toggle button
 *   isOpen      – boolean
 *   onClose     – callback
 *   onEmojiSelect – callback(emoji: string)
 */
export default function EmojiPicker({ anchorRef, isOpen, onClose, onEmojiSelect }) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [recentEmojis, setRecentEmojis] = useState(getRecentEmojis);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);

  // Recalculate position whenever the picker opens
  const calcPosition = useCallback(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Prefer opening upward above the button
    let top = rect.top - PICKER_H - 10;
    // If not enough room above, open downward
    if (top < 8) top = rect.bottom + 10;
    // Clamp to bottom
    if (top + PICKER_H > vh - 8) top = vh - PICKER_H - 8;

    // Prefer aligning left edge to button left
    let left = rect.left;
    // Clamp so right edge doesn't overflow
    if (left + PICKER_W > vw - 8) left = vw - PICKER_W - 8;
    // Clamp left edge
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => {
    if (isOpen) calcPosition();
  }, [isOpen, calcPosition]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e) => {
      const clickedAnchor = anchorRef?.current?.contains(e.target);
      const clickedPicker = pickerRef.current?.contains(e.target);
      if (!clickedAnchor && !clickedPicker) onClose();
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen, onClose, anchorRef]);

  const handleEmojiClick = (emoji) => {
    onEmojiSelect(emoji);
    addRecentEmoji(emoji);
    setRecentEmojis(getRecentEmojis());
  };

  const categories = EMOJI_CATEGORIES.map((cat) =>
    cat.id === 'recent' ? { ...cat, emojis: recentEmojis } : cat
  ).filter((cat) => cat.id !== 'recent' || recentEmojis.length > 0);

  const activeCat = categories.find((c) => c.id === activeCategory) || categories[0];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: PICKER_W,
            zIndex: 9999,
            background: 'rgba(18, 18, 26, 0.97)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
            overflow: 'hidden',
            userSelect: 'none',
            fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {/* Category Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '10px 10px 8px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              overflowX: 'auto',
            }}
            className="scrollbar-hide"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                title={cat.label}
                style={{
                  flexShrink: 0,
                  fontSize: 20,
                  padding: '6px 8px',
                  borderRadius: 12,
                  border: 'none',
                  background: activeCategory === cat.id ? 'rgba(255,255,255,0.14)' : 'transparent',
                  cursor: 'pointer',
                  opacity: activeCategory === cat.id ? 1 : 0.45,
                  transform: activeCategory === cat.id ? 'scale(1.12)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  lineHeight: 1,
                  fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                }}
              >
                {cat.icon}
              </button>
            ))}
          </div>

          {/* Category Label */}
          <div
            style={{
              padding: '6px 14px 4px',
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'rgba(255,255,255,0.28)',
            }}
          >
            {activeCat?.label}
          </div>

          {/* Emoji Grid */}
          <div
            className="scrollbar-hide"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              padding: '0 6px 10px',
              maxHeight: 264,
              overflowY: 'auto',
            }}
          >
            {(activeCat?.emojis || []).map((emoji, i) => (
              <button
                key={i}
                onClick={() => handleEmojiClick(emoji)}
                style={{
                  fontSize: 22,
                  padding: 6,
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.1s ease, transform 0.1s ease',
                  fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {emoji}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
