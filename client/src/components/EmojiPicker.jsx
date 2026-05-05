import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

const EMOJI_CATEGORIES = [
  { id: 'recent', icon: '🕐', label: 'Recently Used', emojis: [] },
  {
    id: 'smileys', icon: '😀', label: 'Smileys & People',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇',
      '🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝',
      '🤑','🤗','🫡','🤭','🫢','🫣','🤫','🤔','🫤','🤐','🤨','😐','😑','😶',
      '🫥','😶‍🌫️','😏','😒','🙄','😬','😮‍💨','🤥','🫨','😌','😔','😪','🤤','😴',
      '😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','😵‍💫','🤯','🤠','🥳',
      '🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺',
      '🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩',
      '😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺',
      '👻','👽','👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
      '🫶','👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️',
      '🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎',
      '✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳',
      '💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👁️',
      '👀','🫦','👅','👄','🫂','👣','🧬',
    ],
  },
  {
    id: 'nature', icon: '🌿', label: 'Animals & Nature',
    emojis: [
      '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮',
      '🐷','🐽','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥',
      '🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🫎','🐝','🪱','🐛','🦋','🐌',
      '🐞','🐜','🪲','🦟','🦗','🪳','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕',
      '🐙','🦑','🦐','🦞','🦀','🪸','🐡','🐟','🐠','🐬','🐳','🐋','🦈','🦭',
      '🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘',
      '🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🫏','🐕','🦮',
      '🐕‍🦺','🐩','🦴','🐈','🐈‍⬛','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️',
      '🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔',
      '🌸','🌺','🪷','🌻','🌹','🥀','🌷','🪻','🌱','🌿','🍀','🍁','🍂','🍃',
      '🪺','🪹','🍄','🌾','🪴','🎋','🎍','🌵','🌴','🌲','🌳','🌑','🌒','🌓',
      '🌔','🌕','🌖','🌗','🌘','🌙','🌚','🌛','🌜','🌝','🌞','🪐','⭐','🌟',
      '💫','✨','⚡','☄️','💥','🔥','🌈','☀️','🌤️','⛅','🌦️','🌧️','⛈️','🌩️',
      '🌨️','❄️','🌬️','💨','🌪️','🌫️','🌊','🌁','🌀',
    ],
  },
  {
    id: 'food', icon: '🍔', label: 'Food & Drink',
    emojis: [
      '🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍',
      '🥥','🥝','🍅','🫒','🥑','🍆','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫛',
      '🧄','🧅','🥔','🍠','🫘','🥜','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥚',
      '🍳','🧈','🥞','🧇','🥓','🥩','🍗','🍖','🌭','🍔','🍟','🍕','🫔','🌮',
      '🌯','🥙','🧆','🥚','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍣','🍤','🦪',
      '🥟','🥠','🥡','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬',
      '🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🧃','🥤','🧋','🍶','🍺','🍻',
      '🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥢','🫙',
    ],
  },
  {
    id: 'activity', icon: '⚽', label: 'Activity',
    emojis: [
      '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒',
      '🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹',
      '🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🏇',
      '🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️',
      '🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶',
      '🎷','🪗','🎸','🎹','🎺','🎻','🪕','🥁','🪘','🎮','🕹️','🎲','♟️','🎯',
      '🎳','🎰','🧩','🪄','🪅','🎭','🖼️','🎠','🎡','🎢','🎪',
    ],
  },
  {
    id: 'travel', icon: '✈️', label: 'Travel & Places',
    emojis: [
      '🚗','🚕','🚙','🛻','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛵','🏍️','🚲',
      '🛴','🛺','🚁','🛸','🚀','✈️','🛩️','🪂','💺','🚂','🚆','🚇','🚈','🚉',
      '🚊','🚝','🚞','🚋','🚃','🚟','🚠','🚡','🚢','⛵','🛥️','🚤','⛴️','🛳️',
      '⛽','🚧','🛤️','🛣️','🗺️','🧭','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️','🏝️',
      '🏞️','🏟️','🏛️','🏗️','🧱','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦',
      '🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕',
      '🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','🌌',
      '🌠','🎇','🎆','🗾','🌐','🗿',
    ],
  },
  {
    id: 'objects', icon: '💡', label: 'Objects',
    emojis: [
      '⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','💾','💿','📀','📼',
      '📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🧭','⏱️',
      '⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','🪔','🧯',
      '🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛',
      '🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🗜️','🪤','🔗','⛓️','🧲','🪝',
      '🔫','💣','🪃','🏹','🛡️','🪖','⛑️','🪬','💊','💉','🩸','🩹','🩺','🩻',
      '🔬','🔭','🧬','🧫','🧪','🌡️','🧹','🪣','🧺','🧻','🪠','🧼','🫧','🪥',
      '🧽','🧴','🪒','🧷','🧲','🪟','🛋️','🪑','🚽','🚿','🛁','📦','📫','📬',
      '📭','📮','🗳️','📝','📋','📁','📂','🗂️','🗒️','🗓️','📆','📅','📇','📈',
      '📉','📊','📌','📍','✂️','🗃️','🗄️','🗑️','🔒','🔓','🔏','🔐','🔑','🗝️',
      '🔨','🪓','🗡️','⚔️','🛡️','🧲','💌','📧','📩','📤','📥','📦','📨','📯',
      '📣','📢','🔔','🔕','🎵','🎶','📻','🎷','🎸','🎹','🎺','🎻','🥁',
    ],
  },
  {
    id: 'symbols', icon: '❤️', label: 'Symbols & Flags',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️',
      '💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','✡️','🔯',
      '🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑',
      '♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️',
      '✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑',
      '🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🔞','📵','🔕',
      '🔇','🔈','🔉','🔊','📢','📣','🔔','🔕','🎵','🎶','⬆️','↗️','➡️','↘️',
      '⬇️','↙️','⬅️','↖️','↕️','↔️','↩️','↪️','⤴️','⤵️','🔃','🔄','🔙','🔚',
      '🔛','🔜','🔝','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣',
      '8️⃣','9️⃣','🔟','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓',
      'ℹ️','🆔','Ⓜ️','🆕','🆖','🅾️','🆗','🅿️','🆘','🆙','🆚',
      '🏳️','🏴','🏁','🚩','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️',
      '✅','☑️','✔️','❎','🔱','⚜️','🔰','♻️','✳️','❇️','💠','🆗','🔵','🟤',
      '⚫','⚪','🟣','🔴','🟠','🟡','🟢','🔷','🔶','🔹','🔸','🔺','🔻','💲',
      '©️','®️','™️','〰️','➰','➿','🔚','🔛','🔜','🔝','🔙',
    ],
  },
];

const RECENT_KEY = 'whisper_recent_emojis';
const MAX_RECENT = 36;
const PICKER_W = 440;
const PICKER_H = 420;

function getRecents() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
  catch { return []; }
}
function saveRecent(emoji) {
  const list = [emoji, ...getRecents().filter(e => e !== emoji)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export default function EmojiPicker({ anchorRef, isOpen, onClose, onEmojiSelect }) {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [recents, setRecents] = useState(getRecents);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);

  const calcPos = useCallback(() => {
    if (!anchorRef?.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    let top = r.top - PICKER_H - 10;
    if (top < 8) top = r.bottom + 10;
    if (top + PICKER_H > vh - 8) top = vh - PICKER_H - 8;
    let left = r.left;
    if (left + PICKER_W > vw - 8) left = vw - PICKER_W - 8;
    if (left < 8) left = 8;
    setPos({ top, left });
  }, [anchorRef]);

  useEffect(() => { if (isOpen) calcPos(); }, [isOpen, calcPos]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (!anchorRef?.current?.contains(e.target) && !pickerRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  const handleSelect = (emoji) => {
    onEmojiSelect(emoji);
    saveRecent(emoji);
    setRecents(getRecents());
  };

  const categories = EMOJI_CATEGORIES
    .map(c => c.id === 'recent' ? { ...c, emojis: recents } : c)
    .filter(c => c.id !== 'recent' || recents.length > 0);

  const activeCat = categories.find(c => c.id === activeCategory) || categories[0];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 480, damping: 32 }}
          style={{
            position: 'fixed', top: pos.top, left: pos.left,
            width: PICKER_W, zIndex: 9999,
            background: 'rgba(15,15,22,0.98)',
            backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
            borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 28px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            overflow: 'hidden', userSelect: 'none',
            fontFamily: 'Inter, ui-sans-serif, sans-serif',
          }}
        >
          {/* Category tabs — grid so all are always visible, no horizontal scroll */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${categories.length}, 1fr)`,
            gap: 2,
            padding: '10px 10px 8px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)} title={cat.label}
                style={{
                  fontSize: 20, padding: '7px 4px', borderRadius: 10,
                  border: 'none', cursor: 'pointer', lineHeight: 1,
                  width: '100%',
                  background: activeCategory === cat.id ? 'rgba(99,102,241,0.25)' : 'transparent',
                  opacity: activeCategory === cat.id ? 1 : 0.42,
                  transform: activeCategory === cat.id ? 'scale(1.12)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                  fontFamily: EMOJI_FONT,
                  outline: activeCategory === cat.id ? '1.5px solid rgba(99,102,241,0.5)' : 'none',
                }}
              >{cat.icon}</button>
            ))}
          </div>

          {/* Label */}
          <div style={{
            padding: '6px 12px 3px', fontSize: 9, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.12em',
            color: 'rgba(255,255,255,0.25)',
          }}>{activeCat?.label}</div>

          {/* Grid */}
          <div className="scrollbar-hide" style={{
            display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)',
            padding: '0 8px 12px', maxHeight: 318, overflowY: 'auto',
          }}>
            {(activeCat?.emojis || []).map((emoji, i) => (
              <button key={i} onClick={() => handleSelect(emoji)}
                style={{
                  fontSize: 22, padding: 7, borderRadius: 10, border: 'none',
                  background: 'transparent', cursor: 'pointer', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.1s, transform 0.08s',
                  fontFamily: EMOJI_FONT,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.86)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1.12)'}
              >{emoji}</button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
