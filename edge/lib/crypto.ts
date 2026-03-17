/**
 * AES-GCM encryption/decryption using Web Crypto API.
 * Portable across Deno, Bunny Edge, and Node.js runtimes.
 * Direct port of lib/crypto.ts without any Node.js dependencies.
 */

import { requireEnv } from "#edge/lib/env.ts";

const importKey = async (base64Key: string): Promise<CryptoKey> => {
  const rawKey = Uint8Array.from(atob(base64Key), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
};

export const encrypt = async (
  text: string,
): Promise<{ ciphertext: string; iv: string }> => {
  const key = await importKey(requireEnv("CRYPTO_KEY"));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(text);

  const encryptedData = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedText,
  );

  return {
    ciphertext: btoa(
      String.fromCharCode(...Array.from(new Uint8Array(encryptedData))),
    ),
    iv: btoa(String.fromCharCode(...Array.from(iv))),
  };
};

export const decrypt = async (
  ciphertext: string,
  iv: string,
): Promise<string> => {
  const key = await importKey(requireEnv("CRYPTO_KEY"));
  const ivArray = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const encryptedDataArray = Uint8Array.from(atob(ciphertext), (c) =>
    c.charCodeAt(0),
  );

  const decryptedData = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivArray },
    key,
    encryptedDataArray,
  );

  return new TextDecoder().decode(decryptedData);
};
