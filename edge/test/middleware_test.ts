/**
 * Tests for edge/middleware.ts — CSRF protection and security headers
 */

import { assertEquals } from "@std/assert";
import { verifyCsrf, applySecurityHeaders } from "#edge/middleware.ts";

// --- verifyCsrf ---

Deno.test("middleware - allows GET requests without origin", () => {
  const request = new Request("http://localhost/api/test", { method: "GET" });
  assertEquals(verifyCsrf(request), null);
});

Deno.test("middleware - allows HEAD requests without origin", () => {
  const request = new Request("http://localhost/api/test", { method: "HEAD" });
  assertEquals(verifyCsrf(request), null);
});

Deno.test("middleware - blocks POST without origin", () => {
  const request = new Request("http://localhost/api/test", { method: "POST" });
  const result = verifyCsrf(request);
  assertEquals(result?.status, 403);
});

Deno.test("middleware - allows POST with matching origin", () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      origin: "http://localhost",
      host: "localhost",
    },
  });
  assertEquals(verifyCsrf(request), null);
});

Deno.test("middleware - blocks POST with mismatched origin", () => {
  const request = new Request("http://localhost/api/test", {
    method: "POST",
    headers: {
      origin: "http://evil.com",
      host: "localhost",
    },
  });
  const result = verifyCsrf(request);
  assertEquals(result?.status, 403);
});

Deno.test("middleware - exempts webhook endpoints from CSRF", () => {
  const request = new Request("http://localhost/api/webhook/github", {
    method: "POST",
  });
  assertEquals(verifyCsrf(request), null);
});

// --- applySecurityHeaders ---

Deno.test("middleware - adds security headers", () => {
  const original = new Response("test", { status: 200 });
  const result = applySecurityHeaders(original);

  assertEquals(result.headers.get("x-content-type-options"), "nosniff");
  assertEquals(result.headers.get("x-frame-options"), "DENY");
  assertEquals(
    result.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assertEquals(result.status, 200);
});

Deno.test("middleware - preserves original status code", () => {
  const original = new Response("not found", { status: 404 });
  const result = applySecurityHeaders(original);
  assertEquals(result.status, 404);
});

Deno.test("middleware - preserves existing headers", () => {
  const original = new Response("test", {
    headers: { "content-type": "application/json" },
  });
  const result = applySecurityHeaders(original);
  assertEquals(result.headers.get("content-type"), "application/json");
  assertEquals(result.headers.get("x-content-type-options"), "nosniff");
});
