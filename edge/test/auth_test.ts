/**
 * Tests for edge/lib/auth.ts — session management
 */

import {
  assertEquals,
  assertNotEquals,
} from "@std/assert";
import {
  getSessionIdFromRequest,
  createSessionCookie,
  createBlankSessionCookie,
  createGithubAuthUrl,
  generateUserId,
} from "#edge/lib/auth.ts";

// --- getSessionIdFromRequest ---

Deno.test("auth - extracts session ID from cookies", () => {
  const request = new Request("http://localhost/api/test", {
    headers: {
      cookie: "auth_session=abc123; other=value",
    },
  });
  assertEquals(getSessionIdFromRequest(request), "abc123");
});

Deno.test("auth - returns null when no cookie header", () => {
  const request = new Request("http://localhost/api/test");
  assertEquals(getSessionIdFromRequest(request), null);
});

Deno.test("auth - returns null when session cookie missing", () => {
  const request = new Request("http://localhost/api/test", {
    headers: {
      cookie: "other=value; another=thing",
    },
  });
  assertEquals(getSessionIdFromRequest(request), null);
});

Deno.test("auth - handles cookie with equals in value", () => {
  const request = new Request("http://localhost/api/test", {
    headers: {
      cookie: "auth_session=abc=123=def; other=value",
    },
  });
  assertEquals(getSessionIdFromRequest(request), "abc=123=def");
});

// --- createSessionCookie ---

Deno.test("auth - creates session cookie with correct format", () => {
  const cookie = createSessionCookie("test-session-id");

  // Should contain the session name and value
  assertEquals(cookie.includes("auth_session=test-session-id"), true);
  // Should be HttpOnly
  assertEquals(cookie.includes("HttpOnly"), true);
  // Should have SameSite=Lax
  assertEquals(cookie.includes("SameSite=Lax"), true);
  // Should have Path=/
  assertEquals(cookie.includes("Path=/"), true);
});

// --- createBlankSessionCookie ---

Deno.test("auth - creates blank cookie with Max-Age=0", () => {
  const cookie = createBlankSessionCookie();
  assertEquals(cookie.includes("auth_session="), true);
  assertEquals(cookie.includes("Max-Age=0"), true);
});

// --- generateUserId ---

Deno.test("auth - generates unique user IDs", () => {
  const id1 = generateUserId();
  const id2 = generateUserId();

  assertNotEquals(id1, id2);
  // 10 bytes = 20 hex characters
  assertEquals(id1.length, 20);
  assertEquals(id2.length, 20);
  // Should be hex
  assertEquals(/^[0-9a-f]+$/.test(id1), true);
});

// --- createGithubAuthUrl ---

Deno.test("auth - creates GitHub auth URL with correct params", () => {
  Deno.env.set("GITHUB_APP_CLIENT_ID", "test-client-id");

  const { url, state } = createGithubAuthUrl();

  assertEquals(url.includes("github.com/login/oauth/authorize"), true);
  assertEquals(url.includes("client_id=test-client-id"), true);
  assertEquals(url.includes("scope=repo+user%3Aemail"), true);
  assertNotEquals(state, "");
  // State should be hex
  assertEquals(/^[0-9a-f]+$/.test(state), true);

  Deno.env.delete("GITHUB_APP_CLIENT_ID");
});
