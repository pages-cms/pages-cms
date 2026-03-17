/**
 * Session-based authentication for edge runtimes.
 * Replaces Lucia auth + Next.js cookies with direct session management.
 *
 * Sessions are stored in the database with expiry timestamps.
 * Session IDs are generated using Web Crypto API.
 */

import { execute, queryOne } from "#edge/lib/db/client.ts";
import { getEnv } from "#edge/lib/env.ts";

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface User {
  id: string;
  githubId: number | null;
  githubUsername: string | null;
  githubEmail: string | null;
  githubName: string | null;
  email: string | null;
}

export interface Session {
  id: string;
  expiresAt: number;
  userId: string;
}

/** Generate a random session ID (32 hex characters) */
const generateSessionId = (): string => {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Generate a random user ID (16 hex characters) */
export const generateUserId = (): string => {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/** Extract session ID from request cookies */
export const getSessionIdFromRequest = (request: Request): string | null => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split("=");
    if (name === SESSION_COOKIE_NAME) {
      return valueParts.join("=");
    }
  }
  return null;
};

/** Validate a session and return the user + session, refreshing if near expiry */
export const validateSession = async (
  sessionId: string,
): Promise<{ user: User; session: Session } | null> => {
  const row = await queryOne<{
    id: string;
    expires_at: number;
    user_id: string;
    github_id: number | null;
    github_username: string | null;
    github_email: string | null;
    github_name: string | null;
    email: string | null;
  }>(
    `SELECT s.id, s.expires_at, s.user_id,
            u.github_id, u.github_username, u.github_email, u.github_name, u.email
     FROM "session" s
     JOIN "user" u ON u.id = s.user_id
     WHERE s.id = ?`,
    [sessionId],
  );

  if (!row) return null;
  if (Date.now() > row.expires_at) {
    // Expired — clean up
    await execute(`DELETE FROM "session" WHERE id = ?`, [sessionId]);
    return null;
  }

  // Refresh session if it's within the last 15 days (half of expiry)
  const halfExpiry = SESSION_EXPIRY_MS / 2;
  if (row.expires_at - Date.now() < halfExpiry) {
    const newExpiry = Date.now() + SESSION_EXPIRY_MS;
    await execute(`UPDATE "session" SET expires_at = ? WHERE id = ?`, [
      newExpiry,
      sessionId,
    ]);
    row.expires_at = newExpiry;
  }

  return {
    user: {
      id: row.user_id,
      githubId: row.github_id,
      githubUsername: row.github_username,
      githubEmail: row.github_email,
      githubName: row.github_name,
      email: row.email,
    },
    session: {
      id: row.id,
      expiresAt: row.expires_at,
      userId: row.user_id,
    },
  };
};

/** Get authenticated user from request, or null */
export const getAuth = async (
  request: Request,
): Promise<{ user: User; session: Session } | { user: null; session: null }> => {
  const sessionId = getSessionIdFromRequest(request);
  if (!sessionId) return { user: null, session: null };

  const result = await validateSession(sessionId);
  if (!result) return { user: null, session: null };

  return result;
};

/** Create a new session for a user */
export const createSession = async (userId: string): Promise<Session> => {
  const sessionId = generateSessionId();
  const expiresAt = Date.now() + SESSION_EXPIRY_MS;

  await execute(
    `INSERT INTO "session" (id, expires_at, user_id) VALUES (?, ?, ?)`,
    [sessionId, expiresAt, userId],
  );

  return { id: sessionId, expiresAt, userId };
};

/** Invalidate (delete) a session */
export const invalidateSession = async (sessionId: string): Promise<void> => {
  await execute(`DELETE FROM "session" WHERE id = ?`, [sessionId]);
};

/** Create Set-Cookie header for a session */
export const createSessionCookie = (sessionId: string): string => {
  const secure = getEnv("NODE_ENV") === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_EXPIRY_MS / 1000}${secure}`;
};

/** Create Set-Cookie header to clear the session */
export const createBlankSessionCookie = (): string => {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
};

/** GitHub OAuth helper — create authorization URL */
export const createGithubAuthUrl = (): { url: string; state: string } => {
  const clientId = getEnv("GITHUB_APP_CLIENT_ID");
  if (!clientId) throw new Error("GITHUB_APP_CLIENT_ID not set");

  const state = generateSessionId();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: "repo user:email",
    state,
  });

  return {
    url: `https://github.com/login/oauth/authorize?${params}`,
    state,
  };
};

/** GitHub OAuth helper — exchange code for access token */
export const exchangeGithubCode = async (
  code: string,
): Promise<string> => {
  const clientId = getEnv("GITHUB_APP_CLIENT_ID");
  const clientSecret = getEnv("GITHUB_APP_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials not set");
  }

  const response = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    },
  );

  const data = await response.json();
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  return data.access_token;
};
