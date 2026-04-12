import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

/**
 * OfflineChat CryptoEngine: strict End-to-End Encryption (E2EE)
 * Using TweetNaCl to bypass "Web Crypto API" local HTTP restrictions on Android/Windows.
 */

// Utility: Convert ArrayBuffer to Base64 String
export const bufferToBase64 = (buffer) => {
  return encodeBase64(new Uint8Array(buffer));
};

// Utility: Convert Base64 String back to ArrayBuffer
export const base64ToBuffer = (base64) => {
  return decodeBase64(base64).buffer;
};

// 1. Generate an Asymmetric KeyPair (TweetNaCl box)
export const generateECDHKeyPair = async () => {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.secretKey
  };
};

// 2. Export Public Key to Base64
export const exportPublicKey = async (publicKey) => {
  return encodeBase64(publicKey);
};

// 3. Import Peer's Public Key from Base64
export const importPublicKey = async (base64) => {
  return decodeBase64(base64);
};

// 4. Derive Shared Secret (Mock - we just bundle keys for nacl.box natively)
export const deriveSharedKey = async (privateKey, peerPublicKey) => {
  return { privateKey, peerPublicKey };
};

// 5. Generate a Master Room Key (Symmetric) -> nacl.secretbox random
export const generateRoomKey = async () => {
  return nacl.randomBytes(nacl.secretbox.keyLength);
};

export const exportSymmetricKey = async (key) => {
  return encodeBase64(key);
};

export const importSymmetricKey = async (base64) => {
  return decodeBase64(base64);
};

// 6. Encrypt Message payload
export const encryptMessage = async (text, keyData) => {
  const messageBytes = decodeUTF8(text);
  
  // Asymmetric encrypt (Distributing Room Key via Key Master)
  if (keyData.privateKey && keyData.peerPublicKey) {
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const ciphertext = nacl.box(messageBytes, nonce, keyData.peerPublicKey, keyData.privateKey);
    return {
      iv: encodeBase64(nonce),
      ciphertext: encodeBase64(ciphertext)
    };
  } 
  
  // Symmetric encrypt (Chat Message traversing)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const ciphertext = nacl.secretbox(messageBytes, nonce, keyData);
  return {
    iv: encodeBase64(nonce),
    ciphertext: encodeBase64(ciphertext)
  };
};

// 7. Decrypt Message payload
export const decryptMessage = async (ivBase64, ciphertextBase64, keyData) => {
  try {
    const nonce = decodeBase64(ivBase64);
    const ciphertext = decodeBase64(ciphertextBase64);

    if (keyData.privateKey && keyData.peerPublicKey) {
      // Asymmetric Decrypt
      const decryptedBytes = nacl.box.open(ciphertext, nonce, keyData.peerPublicKey, keyData.privateKey);
      if (!decryptedBytes) throw new Error("Box decryption failed. Invalid keys.");
      return encodeUTF8(decryptedBytes);
    } 
    
    // Symmetric Decrypt
    const decryptedBytes = nacl.secretbox.open(ciphertext, nonce, keyData);
    if (!decryptedBytes) throw new Error("Secretbox decryption failed. Incorrect Room Key.");
    return encodeUTF8(decryptedBytes);
    
  } catch (err) {
    console.error("TweetNaCl Decryption Failed:", err);
    return "[Encrypted Message - Unreadable]";
  }
};
