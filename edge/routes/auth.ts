/**
 * Authentication routes for edge runtimes.
 * Ports app/api/auth/github/route.ts and lib/actions/auth.ts
 */

import {
  getAuth,
  createSession,
  invalidateSession,
  createSessionCookie,
  createBlankSessionCookie,
  createGithubAuthUrl,
  exchangeGithubCode,
  generateUserId,
  getSessionIdFromRequest,
} from "#edge/lib/auth.ts";
import { encrypt } from "#edge/lib/crypto.ts";
import { execute, queryOne } from "#edge/lib/db/client.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/auth/github — GitHub OAuth callback handler
 * Exchanges code for token, creates/updates user, creates session
 */
export const handleGithubCallback: RouteHandler = async (request) => {
  try {
    const { session: existingSession } = await getAuth(request);
    if (existingSession) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/" },
      });
    }

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // Get stored state from cookie
    const cookieHeader = request.headers.get("cookie") ?? "";
    const stateCookie = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("github_oauth_state="));
    const storedState = stateCookie?.split("=")[1] ?? null;

    if (!code || !state || !storedState || state !== storedState) {
      return new Response(null, { status: 400 });
    }

    const accessToken = await exchangeGithubCode(code);

    // Get GitHub user info
    const githubUserResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "pages-cms-edge",
      },
    });
    const githubUser = await githubUserResponse.json();

    const { ciphertext, iv } = await encrypt(accessToken);

    // Check for existing user
    const existingUser = await queryOne<{ id: string }>(
      `SELECT id FROM "user" WHERE github_id = ?`,
      [Number(githubUser.id)],
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      await execute(
        `UPDATE github_user_token SET ciphertext = ?, iv = ? WHERE user_id = ?`,
        [ciphertext, iv, userId],
      );
    } else {
      userId = generateUserId();
      await execute(
        `INSERT INTO "user" (id, github_id, github_username, github_email, github_name) VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          Number(githubUser.id),
          githubUser.login,
          githubUser.email,
          githubUser.name,
        ],
      );
      await execute(
        `INSERT INTO github_user_token (ciphertext, iv, user_id) VALUES (?, ?, ?)`,
        [ciphertext, iv, userId],
      );
    }

    const session = await createSession(userId);

    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": createSessionCookie(session.id),
      },
    });
  } catch (error) {
    console.error("GitHub auth error:", error);
    return new Response(null, { status: 500 });
  }
};

/**
 * GET /api/auth/signin — Redirect to GitHub OAuth
 */
export const handleGithubSignIn: RouteHandler = async () => {
  const { url, state } = createGithubAuthUrl();

  const headers = new Headers();
  headers.set("Location", url);
  headers.set(
    "Set-Cookie",
    `github_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`,
  );

  return new Response(null, { status: 302, headers });
};

/**
 * POST /api/auth/signout — Sign out
 */
export const handleSignOut: RouteHandler = async (request) => {
  const sessionId = getSessionIdFromRequest(request);
  if (sessionId) {
    await invalidateSession(sessionId);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": createBlankSessionCookie(),
    },
  });
};
