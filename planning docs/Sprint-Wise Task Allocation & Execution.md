Building a reliable offline chat application requires a phased approach to isolate networking complexities from UI design. The plan is divided into 5 focused sprints.

## Sprint 1: Local Server Foundations & Scaffolding
**Goal:** Prove the concept by establishing a local server and showing a basic webpage on a connected client device.
- **Task 1.1:** Initialize the Node.js project. Setup `express` and `socket.io`.
- **Task 1.2:** Write the script that dynamically fetches the host's LAN IP address (`os.networkInterfaces`).
- **Task 1.3:** Setup a basic Vite + React project. Configure the Build pipeline so Node can serve the static React files (`app.use(express.static('dist'))`).
- **Task 1.4:** Generate a QR code in the terminal using `qrcode-terminal` library to display the local IP link.
- **Outcome:** The host runs `npm start`, a QR appears in the terminal. The client connects to Wi-Fi, scans it, and sees a blank React landing page.

## Sprint 2: Core Chat Mechanics (Unencrypted)
**Goal:** Implement basic real-time messaging and the onboarding flow without any complex cryptography.
- **Task 2.1:** Build the generic React layout frame, Tailwind CSS configuration, and basic theme (Dark Mode by default).
- **Task 2.2:** Build the Onboarding Screen logic. Have users input a name and generate an avatar (using DiceBear core library locally or raw SVG permutations).
- **Task 2.3:** Implement Socket.io connectivity in React. Emit `join_room` upon onboarding completion.
- **Task 2.4:** Build the Chat Interface (Message input, message stream). Emit and receive plaintext messages just to verify real-time LAN communication works.
- **Outcome:** Users can join, see each other's avatars, and chat in plaintext. 

## Sprint 3: The Security & E2EE Layer
**Goal:** Overhaul the data transmission pipeline to use entirely encrypted packets.
- **Task 3.1:** Create `CryptoEngine.js` abstraction wrapper around `window.crypto.subtle`. Implement `ECDH` Key generation upon app load.
- **Task 3.2:** Modify the authentication handshake. Emitting `join_room` now includes sending the Public Key. Server tracks and broadcasts keys.
- **Task 3.3:** Implement the **Room Key Distribution Protocol**. The first user generates the master symmetric Room Key. When others join, the first user encrypts the Room Key utilizing the new user's Public Key, sending it over a secure side-channel message.
- **Task 3.4:** Map message sending events to encrypt data using the Room Key. Map receive events to decrypt data.
- **Outcome:** Terminal logs should show absolute gibberish binary payloads traversing the websocket. UI shows plaintext chat.

## Sprint 4: Premium UI Polish & Animations
**Goal:** Take the app from functional to highly polished and "wow" inducing.
- **Task 4.1:** Integrate `framer-motion` for React. Animate the Onboarding modal sliding out.
- **Task 4.2:** Animate Chat Bubbles popping in from the bottom. 
- **Task 4.3:** Add UI enhancements: "User is typing..." indicators, timestamps, and read receipts.
- **Task 4.4:** Refine the Avatar layout and UI color palette (e.g., using subtle glassmorphism and vibrant gradients).
- **Task 4.5:** Implement auto-scroll to bottom behavior in the chat window when new messages arrive.
- **Outcome:** The application looks comparable to modern platforms like Discord or WhatsApp Web.

## Sprint 5: Packaging & Distribution
**Goal:** Make it dead simple for non-technical users to host the localized chatroom.
- **Task 5.1:** Strip out all developer dependencies and optimize React build.
- **Task 5.2:** Use the `pkg` library to compile the Node.js source code + React static files into a single standalone Executable (`.exe` for Windows, `.mac` for macOS).
- **Task 5.3:** Create documentation for future scaling to Android via Capacitor (building an `.apk` that runs the local web-layer and auto-starts the hotspot if permissions disabled).
- **Outcome:** Deliverable is a single executable file. A user double clicks it, turns on their hotspot, and the terminal opens showing the QR code. All done!