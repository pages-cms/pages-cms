/**
 * GitHub token management for edge runtimes.
 * Replaces lib/token.ts (which uses React cache + Drizzle ORM).
 * Manages both user OAuth tokens and GitHub App installation tokens.
 */

import { encrypt, decrypt } from "#edge/lib/crypto.ts";
import { execute, queryOne, queryAll } from "#edge/lib/db/client.ts";
import { getAuth, type User } from "#edge/lib/auth.ts";
import { requireEnv, getEnv } from "#edge/lib/env.ts";

/** Get an appropriate token for a user (GitHub user token or installation token) */
export const getToken = async (
  user: User,
  owner: string,
  repo: string,
): Promise<string> => {
  if (user.githubId) return getUserToken(user.id);

  // Collaborator — check permissions and use installation token
  const permission = await queryOne<{ id: number }>(
    `SELECT id FROM collaborator WHERE lower(owner) = lower(?) AND lower(repo) = lower(?)`,
    [owner, repo],
  );
  if (!permission) {
    throw new Error(`You do not have permission to access "${owner}/${repo}".`);
  }

  return getInstallationToken(owner, repo);
};

/** Get the GitHub App installation token for a repository */
export const getInstallationToken = async (
  owner: string,
  repo: string,
): Promise<string> => {
  const appId = requireEnv("GITHUB_APP_ID");
  const privateKey = requireEnv("GITHUB_APP_PRIVATE_KEY");

  // Get installation ID via GitHub API
  const jwt = await createAppJwt(appId, privateKey);
  const installResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/installation`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "pages-cms-edge",
      },
    },
  );

  if (!installResponse.ok) {
    throw new Error(
      `Installation not found for "${owner}/${repo}": ${installResponse.status}`,
    );
  }

  const installation = await installResponse.json();
  const installationId = installation.id;

  // Check for cached token
  const cached = await queryOne<{
    id: number;
    ciphertext: string;
    iv: string;
    expires_at: number;
  }>(
    `SELECT id, ciphertext, iv, expires_at FROM github_installation_token WHERE installation_id = ?`,
    [installationId],
  );

  if (cached && Date.now() < cached.expires_at - 60_000) {
    const token = await decrypt(cached.ciphertext, cached.iv);
    return token;
  }

  // Create new installation access token
  const tokenResponse = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "pages-cms-edge",
      },
    },
  );

  if (!tokenResponse.ok) {
    throw new Error(
      `Failed to create installation token: ${tokenResponse.status}`,
    );
  }

  const tokenData = await tokenResponse.json();
  const { ciphertext, iv } = await encrypt(tokenData.token);
  const expiresAt = new Date(tokenData.expires_at).getTime();

  if (cached) {
    await execute(
      `UPDATE github_installation_token SET ciphertext = ?, iv = ?, expires_at = ? WHERE id = ?`,
      [ciphertext, iv, expiresAt, cached.id],
    );
  } else {
    await execute(
      `INSERT INTO github_installation_token (ciphertext, iv, installation_id, expires_at) VALUES (?, ?, ?, ?)`,
      [ciphertext, iv, installationId, expiresAt],
    );
  }

  return tokenData.token;
};

/** Get a user's stored GitHub OAuth token */
export const getUserToken = async (userId: string): Promise<string> => {
  const tokenData = await queryOne<{ ciphertext: string; iv: string }>(
    `SELECT ciphertext, iv FROM github_user_token WHERE user_id = ?`,
    [userId],
  );

  if (!tokenData) throw new Error(`Token not found for user ${userId}.`);

  const token = await decrypt(tokenData.ciphertext, tokenData.iv);
  return token;
};

/**
 * Create a JWT for GitHub App authentication.
 * Uses Web Crypto API (RS256).
 */
const createAppJwt = async (
  appId: string,
  privateKeyPem: string,
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60,
    exp: now + 10 * 60,
    iss: appId,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );

  const encodedSignature = base64UrlEncodeBytes(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
};

const importPrivateKey = async (pem: string): Promise<CryptoKey> => {
  const pemContents = pem
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, "")
    .replace(/-----END RSA PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  // Try PKCS#8 first, fall back to PKCS#1
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch {
    // PKCS#1 format — wrap in PKCS#8 envelope
    const pkcs8 = wrapPkcs1InPkcs8(binaryDer);
    return crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
};

/** Wrap a PKCS#1 RSA private key in a PKCS#8 envelope */
const wrapPkcs1InPkcs8 = (pkcs1: Uint8Array): Uint8Array => {
  // PKCS#8 header for RSA keys
  const header = new Uint8Array([
    0x30, 0x82, 0x00, 0x00, // SEQUENCE (length placeholder)
    0x02, 0x01, 0x00, // INTEGER 0
    0x30, 0x0d, // SEQUENCE
    0x06, 0x09, // OID
    0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // rsaEncryption
    0x05, 0x00, // NULL
    0x04, 0x82, 0x00, 0x00, // OCTET STRING (length placeholder)
  ]);

  const totalLen = header.length - 4 + pkcs1.length;
  const octetLen = pkcs1.length;

  const result = new Uint8Array(4 + totalLen);
  result.set(header);
  result.set(pkcs1, header.length);

  // Fix up lengths
  result[2] = (totalLen >> 8) & 0xff;
  result[3] = totalLen & 0xff;
  result[header.length - 2] = (octetLen >> 8) & 0xff;
  result[header.length - 1] = octetLen & 0xff;

  return result;
};

const base64UrlEncode = (str: string): string =>
  btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const base64UrlEncodeBytes = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
