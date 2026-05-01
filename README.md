# 🔒 Whisper — Secure Offline LAN Chat

> Encrypted, real-time chat over your local Wi-Fi. No internet required.

---

## ⚡ Quick Start (New Device Setup)

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18 or newer | https://nodejs.org |
| **npm** | comes with Node | — |

Verify: `node -v` and `npm -v`

---

### 1 — Install dependencies (run both)

```bash
# Root — server dependencies
npm install

# Client — React/Vite dependencies
cd client
npm install
cd ..
```

---

### 2 — Build the client UI

```bash
cd client
npm run build
cd ..
```

> The Node server serves the built output from `client/dist/`. This step is required once after cloning, and again whenever you edit `client/src/`.

---

### 3 — Start the server

```bash
npm run dev
```

Output will show the local IP and a QR code:

```
🚀 Offline Chat Server is SECURELY ACTIVE!
🔗 Network Link:     http://192.168.x.x:2627
```

---

### 4 — Connect

| Who | URL |
|-----|-----|
| Same device | `http://localhost:2627` |
| Other devices (same Wi-Fi/hotspot) | `http://<IP shown>:2627` or scan the QR code |

---

## 🗂️ Project Structure

```
OfflineChatApp - Whisper/
├── server.js           ← Node.js + Socket.io backend
├── package.json
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── ChatRoom.jsx      ← Chat UI (bubbles, reply, emoji)
    │   │   ├── EmojiPicker.jsx   ← iOS-style emoji picker
    │   │   └── Onboarding.jsx    ← Join / avatar screen
    │   ├── utils/
    │   │   └── CryptoEngine.js   ← ECDH + AES-GCM E2EE
    │   ├── App.jsx
    │   └── index.css
    ├── dist/                     ← Built output (auto-generated)
    └── package.json
```

---

## 🔁 After Editing the UI

```bash
cd client && npm run build && cd ..
npm run dev   # restart server
```

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot find module 'express'` | `npm install` in root folder |
| Blank page | Run `cd client && npm run build` |
| Other devices can't reach the server | Allow port **2627** in your OS firewall |
| "Establishing Secure Handshake…" stuck | Hard-refresh all devices |
| Font looks like system default | Internet needed on first load for Google Fonts (Poppins) |

---

## 🔒 Security

All messages are end-to-end encrypted with **ECDH key exchange + AES-GCM**. The server only ever routes ciphertext — it never sees your plaintext messages.
