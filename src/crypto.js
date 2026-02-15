/**
 * AES-256-GCM encryption/decryption with PBKDF2 key derivation
 * Supports both JSON (base64) and binary (ArrayBuffer) formats
 */

const ITERATIONS = 250000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ERROR_MSG = 'Onjuist wachtwoord of beschadigd bestand';

// ===== Key derivation =====

async function deriveKey(password, salt, usage) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    [usage]
  );
}

// ===== JSON / base64 format (backwards compatible) =====

/**
 * Encrypt data with AES-256-GCM using WebCrypto API
 * @param {string} jsonString - JSON string to encrypt
 * @param {string} password - User-provided password
 * @returns {Object} - { version, algorithm, salt, iv, data } as base64 strings
 */
export async function encryptData(jsonString, password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt, 'encrypt');

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(jsonString)
  );

  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    data: arrayBufferToBase64(ciphertext)
  };
}

/**
 * Decrypt data encrypted with encryptData
 * @param {Object} encrypted - The encrypted object from encryptData
 * @param {string} password - User-provided password
 * @returns {string} - Decrypted JSON string
 */
export async function decryptData(encrypted, password) {
  const decoder = new TextDecoder();

  const salt = base64ToArrayBuffer(encrypted.salt);
  const iv = base64ToArrayBuffer(encrypted.iv);
  const ciphertext = base64ToArrayBuffer(encrypted.data);

  const key = await deriveKey(password, new Uint8Array(salt), 'decrypt');

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      ciphertext
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error(ERROR_MSG);
  }
}

// ===== Binary format (compact, for .bpv files) =====

/**
 * Encrypt data to a compact binary ArrayBuffer: [salt 16B][iv 12B][ciphertext...]
 * @param {string} data - JSON string to encrypt
 * @param {string} password - User-provided password
 * @returns {ArrayBuffer} - salt + iv + ciphertext concatenated
 */
export async function encryptBinary(data, password) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const key = await deriveKey(password, salt, 'encrypt');

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  // Concatenate: salt (16) + iv (12) + ciphertext
  const result = new Uint8Array(SALT_LENGTH + IV_LENGTH + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(ciphertext), SALT_LENGTH + IV_LENGTH);

  return result.buffer;
}

/**
 * Decrypt a binary ArrayBuffer produced by encryptBinary
 * @param {ArrayBuffer} buffer - The encrypted binary data
 * @param {string} password - User-provided password
 * @returns {string} - Decrypted JSON string
 */
export async function decryptBinary(buffer, password) {
  const decoder = new TextDecoder();
  const bytes = new Uint8Array(buffer);

  if (bytes.byteLength < SALT_LENGTH + IV_LENGTH + 1) {
    throw new Error(ERROR_MSG);
  }

  const salt = bytes.slice(0, SALT_LENGTH);
  const iv = bytes.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = bytes.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(password, salt, 'decrypt');

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return decoder.decode(plaintext);
  } catch {
    throw new Error(ERROR_MSG);
  }
}

// ===== Helpers =====

function arrayBufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
