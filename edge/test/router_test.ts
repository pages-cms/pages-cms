/**
 * Tests for edge/router.ts — HTTP pattern-matching router
 */

import { assertEquals } from "@std/assert";
import { createRouter, type RouteHandler } from "#edge/router.ts";

// Helper to create a simple request
const makeRequest = (method: string, url: string): Request =>
  new Request(`http://localhost${url}`, { method });

// --- Basic routing ---

Deno.test("router - matches simple GET route", async () => {
  const handler: RouteHandler = (_req, params) =>
    new Response(JSON.stringify(params), { status: 200 });

  const router = createRouter({
    "GET /api/health": handler,
  });

  const result = await router(makeRequest("GET", "/api/health"), "/api/health", "GET");
  assertEquals(result?.status, 200);
});

Deno.test("router - returns null for unmatched route", async () => {
  const handler: RouteHandler = () => new Response("ok");

  const router = createRouter({
    "GET /api/health": handler,
  });

  const result = await router(makeRequest("GET", "/api/other"), "/api/other", "GET");
  assertEquals(result, null);
});

Deno.test("router - differentiates by method", async () => {
  const getHandler: RouteHandler = () => new Response("GET");
  const postHandler: RouteHandler = () => new Response("POST");

  const router = createRouter({
    "GET /api/item": getHandler,
    "POST /api/item": postHandler,
  });

  const getResult = await router(makeRequest("GET", "/api/item"), "/api/item", "GET");
  assertEquals(await getResult?.text(), "GET");

  const postResult = await router(makeRequest("POST", "/api/item"), "/api/item", "POST");
  assertEquals(await postResult?.text(), "POST");

  const deleteResult = await router(makeRequest("DELETE", "/api/item"), "/api/item", "DELETE");
  assertEquals(deleteResult, null);
});

// --- Path parameters ---

Deno.test("router - extracts single param", async () => {
  const handler: RouteHandler = (_req, params) =>
    new Response(JSON.stringify(params));

  const router = createRouter({
    "GET /api/repos/:owner": handler,
  });

  const result = await router(makeRequest("GET", "/api/repos/octocat"), "/api/repos/octocat", "GET");
  const body = await result?.json();
  assertEquals(body.owner, "octocat");
});

Deno.test("router - extracts multiple params", async () => {
  const handler: RouteHandler = (_req, params) =>
    new Response(JSON.stringify(params));

  const router = createRouter({
    "GET /api/:owner/:repo/:branch/entries/*path": handler,
  });

  const result = await router(
    makeRequest("GET", "/api/octocat/hello-world/main/entries/posts/hello.md"),
    "/api/octocat/hello-world/main/entries/posts/hello.md",
    "GET",
  );
  const body = await result?.json();
  assertEquals(body.owner, "octocat");
  assertEquals(body.repo, "hello-world");
  assertEquals(body.branch, "main");
  assertEquals(body.path, "posts/hello.md");
});

Deno.test("router - handles special characters in params", async () => {
  const handler: RouteHandler = (_req, params) =>
    new Response(JSON.stringify(params));

  const router = createRouter({
    "GET /api/repos/:owner": handler,
  });

  const result = await router(
    makeRequest("GET", "/api/repos/my-org"),
    "/api/repos/my-org",
    "GET",
  );
  const body = await result?.json();
  assertEquals(body.owner, "my-org");
});

// --- Catch-all params ---

Deno.test("router - catch-all param", async () => {
  const handler: RouteHandler = (_req, params) =>
    new Response(JSON.stringify(params));

  const router = createRouter({
    "GET /api/files/*path": handler,
  });

  const result = await router(
    makeRequest("GET", "/api/files/a/b/c.txt"),
    "/api/files/a/b/c.txt",
    "GET",
  );
  const body = await result?.json();
  assertEquals(body.path, "a/b/c.txt");
});

// --- Route priority ---

Deno.test("router - more specific routes match first", async () => {
  const specificHandler: RouteHandler = () => new Response("specific");
  const generalHandler: RouteHandler = () => new Response("general");

  const router = createRouter({
    "GET /api/:owner/:repo/:branch/entries/:path/history": specificHandler,
    "GET /api/:owner/:repo/:branch/entries/:path": generalHandler,
  });

  const historyResult = await router(
    makeRequest("GET", "/api/octocat/repo/main/entries/file.md/history"),
    "/api/octocat/repo/main/entries/file.md/history",
    "GET",
  );
  assertEquals(await historyResult?.text(), "specific");

  const entryResult = await router(
    makeRequest("GET", "/api/octocat/repo/main/entries/file.md"),
    "/api/octocat/repo/main/entries/file.md",
    "GET",
  );
  assertEquals(await entryResult?.text(), "general");
});

// --- Edge cases ---

Deno.test("router - root path", async () => {
  const handler: RouteHandler = () => new Response("root");

  const router = createRouter({
    "GET /": handler,
  });

  const result = await router(makeRequest("GET", "/"), "/", "GET");
  assertEquals(await result?.text(), "root");
});

Deno.test("router - no trailing slash matching", async () => {
  const handler: RouteHandler = () => new Response("ok");

  const router = createRouter({
    "GET /api/health": handler,
  });

  // Trailing slash should NOT match
  const result = await router(makeRequest("GET", "/api/health/"), "/api/health/", "GET");
  assertEquals(result, null);
});
