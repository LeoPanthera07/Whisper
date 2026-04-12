# Low-Level Design (LLD)

## 1. Application State & Storage
The application contains No traditional database (SQL/NoSQL) as persistence would pose a risk for a privacy-focused chat app and adds unnecessary bulk. All data resides in memory.

### Host Node.js Server State
```javascript
// A Map storing active users and their metadata
const connectedUsers = new Map();
// Structure Example:
// connectedUsers.set(socket.id, { 
//    username: 'Ghost_492',
//    avatarUrl: 'base64_string_or_svg_content',
//    publicKey: 'exported_jwk_key'
// });
```

### Client React State
Context API / Zustand will manage:
- `userProfile`: Local Name and Avatar.
- `keyPair`: ECDH Public and Private CryptoKeys (Not shared outside CryptoEngine).
- `peerKeys`: Map of other users' socket IDs to their Public Keys.
- `messages`: Array of decrypted message objects.
- `isConnected`: Boolean representing WebSocket connection status.

## 2. API & Event Definitions
Given the real-time nature of the application, communication relies heavily on WebSocket events rather than REST API endpoints.

### 2.1 Connection Events
- `connection`: Fired when a client connects. Server allocates a `socket.id`.
- `disconnect`: Fired on exit. Server broadcasts `user_left` so clients can prune their peer keys.

### 2.2 Handshake Events
- **Client -> Server:** `join_room`
  - Payload: `{ username: string, avatar: string, publicKey: JWK }`
  - Action: Server adds client to `connectedUsers` map.
- **Server -> Client:** `room_state`
  - Payload: `Array<{ socketId, username, avatar, publicKey }>`
  - Action: Client receives the map of all existing users and imports their public keys.
- **Server -> Broadccast (Others):** `user_joined`
  - Payload: `{ socketId, username, avatar, publicKey }`
  - Action: Existing clients append the new user and their public key to local storage.

### 2.3 Messaging Events
- **Client -> Server:** `send_message`
  - Payload: `{ iv: Uint8Array, ciphertext: ArrayBuffer }`
  - Description: The client AES-GCM encrypts the message string using a shared room key or individual peer keys.
- **Server -> Broadcast:** `receive_message`
  - Payload: `{ senderId, iv, ciphertext, timestamp }`
  - Description: The server blindly routes this to all clients. Client verifies sender, decrypts with matching keys, and updates UI.

## 3. Class Design & Modules

### 3.1 CryptoEngine Module (Client Side)
An abstraction layer for the complex Web Crypto API.
- `generateECDHKeys()`: Returns `{ publicKey, privateKey }`.
- `deriveSharedKey(myPrivateKey, peerPublicKey)`: Computes common AES key.
- `encryptMessage(text, sharedKey)`: Returns `{ iv, ciphertext }`.
- `decryptMessage(iv, ciphertext, sharedKey)`: Returns plain `text`.

### 3.2 UIEngine (Components)
Main components constructed using Tailwind & Framer Motion:
1. `<Layout />`: High level flex-container locking the screen height to 100vh (app-like feel).
2. `<OnboardingModal />`: Prompts user on first load for Name/Avatar, generates Crypto Keys in the background.
3. `<ChatStream />`: Scrolling area for messages.
4. `<MessageBubble />`: Component applying conditional logic (align left for peers, align right for self) with smooth fade-in animations.
5. `<TypingIndicator />`: Small animated bouncing dots if another user is typing.

## 4. End-to-End Encryption Flow Detail
Because it's a group chat (many-to-many), standard ECDH gives a pairwise key between two users. For a group chat without heavy overhead:
1. When the absolute *first* user joins, they randomly generate an **AES-GCM Room Key**.
2. When User B joins, User B broadcasts their Public Key.
3. User A uses User B's Public Key to securely encrypt the **Room Key** and sends it directly to User B.
4. User B decrypts the **Room Key**. Now both have the symmetric Room Key. 
5. All future messages are encrypted once with the Room Key and broadcasted.
This ensures O(1) encryption overhead per message rather than encrypting for every single participant individually.
