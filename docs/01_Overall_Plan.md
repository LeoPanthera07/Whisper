# Overall Plan and Execution Strategy

## 1. Product Overview
The objective is to build a highly secure, offline-first chat application designed for proximity-based communication. The application relies on Local Area Network (LAN) / Wi-Fi Hotspots instead of internet connectivity, prioritizing privacy, security, and anonymity. 

### Core Use Case
Users in close proximity (e.g., a library, classroom, or public transport) where internet is unavailable or untrusted, or where absolute privacy is required. One user acts as the "Host" by turning on their mobile hotspot. Other users connect to the hotspot and access a locally-hosted web application to join a secure chatroom.

***

## 2. Platform Strategy
To meet the requirement of starting with an "easy platform" that scales easily to Windows, Android, iOS, and macOS later:
**The initial platform will be a Local Progressive Web Application (PWA).**
- **Why?** It requires ZERO installation for the clients. Users just connect to the host's Wi-Fi, scan a QR code, and their native web browser opens the chat app. 
- **Future Scaling:** Because it will be built with web technologies, scaling to desktop and mobile will involve wrapping the code into **Capacitor** (for iOS/Android) and **Electron/Tauri** (for Windows/macOS).

***

## 3. Technology Stack (100% Free & Open Source)

### A. Frontend (Client Application)
- **Framework:** React.js (via Vite) - Lightweight, component-based, and easy to build complex UIs.
- **Styling:** Tailwind CSS - For modern, highly-responsive UI, dark mode support out-of-the-box.
- **Animations:** Framer Motion - To add modern micro-animations (bouncing avatars, sliding chat bubbles) giving it a premium Kahoot-style feel.
- **Avatars:** Pre-packaged SVG avatar builder or an offline avatar library (like `dicebear` bundled locally). This guarantees it works without internet.

### B. Backend (Host Signaling Server)
- **Runtime:** Node.js - Extremely fast for I/O and networking.
- **WebSockets:** Socket.io - For real-time, bi-directional event-based communication between clients.
- **Web Server:** Express.js - To serve the React frontend assets over the local IP.
- **Data Storage:** SQLite or In-Memory Maps - No persistent database is strictly necessary since everything is session-based, but an in-memory database will maintain room states.

### C. Security Layer (The Core)
- **Web Crypto API:** We will use the built-in browser cryptography API so no external heavy libraries are needed.
- **Encryption Flow:**
  - **ECDH (Elliptic Curve Diffie-Hellman):** For secure key exchange between clients.
  - **AES-GCM (Advanced Encryption Standard):** For symmetric end-to-end encryption of the chat messages.
  - *Note:* The backend server only routes ciphertext. It cannot read the chats, naturally blocking anyone sniffing the Wi-Fi traffic.

***

## 4. Execution Strategy: Layer-by-Layer

### Layer 1: Networking & Foundation
- Setup the Node API to serve the web application and host the Socket.io instance.
- Define a script that automatically identifies the Host's local IPv4 address (e.g., `192.168.43.1`) and generates a connection QR code in the terminal.

### Layer 2: Frontend & Onboarding
- Build the React SPA (Single Page Application).
- Create the Onboarding Screen: Users enter a nickname and randomly generate/select an SVG avatar.
- Connect the frontend to the backend via WebSockets.

### Layer 3: The Security Engine (Crucial)
- Implement asymmetric key pair generation on client initialization.
- Implement the handshake protocol where entering the room shares public keys.
- Write the AES-GCM encryption/decryption wrappers for message payloads.

### Layer 4: Chat UI & Polish
- Build the real-time chat interface displaying incoming messages.
- Add "is typing" indicators.
- Implement UI animations.

### Layer 5: Packaging
- Package the Node backend and React frontend into a single executable `start.bat` / `.sh` or use `pkg` to compile a standalone binary so the Host user doesn't need to learn command line.
