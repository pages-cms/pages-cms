/**
 * Tests for edge/lib/crypto.ts — AES-GCM encryption/decryption
 */

import { assertEquals, assertNotEquals } from "@std/assert";

// Generate a test key (32 bytes = 256 bits, base64 encoded)
const generateTestKey = (): string => {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return btoa(String.fromCharCode(...key));
};

Deno.test("crypto - encrypt and decrypt roundtrip", async () => {
  const testKey = generateTestKey();
  Deno.env.set("CRYPTO_KEY", testKey);

  const { encrypt, decrypt } = await import("#edge/lib/crypto.ts");

  const plaintext = "Hello, World! This is a secret message.";
  const { ciphertext, iv } = await encrypt(plaintext);

  // Ciphertext should be different from plaintext
  assertNotEquals(ciphertext, plaintext);

  // IV should be present
  assertNotEquals(iv, "");

  // Decrypt should return original plaintext
  const decrypted = await decrypt(ciphertext, iv);
  assertEquals(decrypted, plaintext);

  Deno.env.delete("CRYPTO_KEY");
});

Deno.test("crypto - different encryptions produce different ciphertexts", async () => {
  const testKey = generateTestKey();
  Deno.env.set("CRYPTO_KEY", testKey);

  // Re-import to pick up new key
  // Since modules are cached, we test with the same import
  const { encrypt } = await import("#edge/lib/crypto.ts");

  const plaintext = "Same message";
  const result1 = await encrypt(plaintext);
  const result2 = await encrypt(plaintext);

  // Different IVs should produce different ciphertexts
  assertNotEquals(result1.iv, result2.iv);
  assertNotEquals(result1.ciphertext, result2.ciphertext);

  Deno.env.delete("CRYPTO_KEY");
});

Deno.test("crypto - handles empty string", async () => {
  const testKey = generateTestKey();
  Deno.env.set("CRYPTO_KEY", testKey);

  const { encrypt, decrypt } = await import("#edge/lib/crypto.ts");

  const { ciphertext, iv } = await encrypt("");
  const decrypted = await decrypt(ciphertext, iv);
  assertEquals(decrypted, "");

  Deno.env.delete("CRYPTO_KEY");
});

Deno.test("crypto - handles unicode", async () => {
  const testKey = generateTestKey();
  Deno.env.set("CRYPTO_KEY", testKey);

  const { encrypt, decrypt } = await import("#edge/lib/crypto.ts");

  const plaintext = "こんにちは世界 🌍 Ñoño";
  const { ciphertext, iv } = await encrypt(plaintext);
  const decrypted = await decrypt(ciphertext, iv);
  assertEquals(decrypted, plaintext);

  Deno.env.delete("CRYPTO_KEY");
});
