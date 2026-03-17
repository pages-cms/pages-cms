/**
 * Main route dispatch for the edge runtime.
 * All API routes and frontend serving in a single handler.
 *
 * Pattern follows the tickets project: O(1) prefix dispatch with lazy loading.
 */

import { createRouter, type RouteHandler } from "#edge/router.ts";
import { verifyCsrf, applySecurityHeaders } from "#edge/middleware.ts";

// Import route handlers
import { handleGithubCallback, handleGithubSignIn, handleSignOut } from "#edge/routes/auth.ts";
import { handleWebhook } from "#edge/routes/webhook.ts";
import { handleGetRepos } from "#edge/routes/repos.ts";
import { handleGetEntry } from "#edge/routes/entries.ts";
import { handleSaveFile, handleDeleteFile } from "#edge/routes/files.ts";
import { handleGetCollection } from "#edge/routes/collections.ts";
import { handleGetMedia } from "#edge/routes/media.ts";
import { handleCreateBranch } from "#edge/routes/branches.ts";
import { handleGetHistory } from "#edge/routes/history.ts";
import { handleRenameFile } from "#edge/routes/rename.ts";
import { handleGetCollaborators } from "#edge/routes/collaborators.ts";
import { handleCron } from "#edge/routes/cron.ts";

// --- API Router ---

const apiRouter = createRouter({
  // Auth
  "GET /api/auth/github": handleGithubCallback,
  "GET /api/auth/signin": handleGithubSignIn,
  "POST /api/auth/signout": handleSignOut,

  // Webhook
  "POST /api/webhook/github": handleWebhook,

  // Repos
  "GET /api/repos/:owner": handleGetRepos,

  // Collaborators
  "GET /api/collaborators/:owner/:repo": handleGetCollaborators,

  // Cron
  "GET /api/cron": handleCron,

  // Entries (file content)
  "GET /api/:owner/:repo/:branch/entries/:path/history": handleGetHistory,
  "GET /api/:owner/:repo/:branch/entries/:path": handleGetEntry,

  // Files (CRUD)
  "POST /api/:owner/:repo/:branch/files/:path/rename": handleRenameFile,
  "POST /api/:owner/:repo/:branch/files/:path": handleSaveFile,
  "DELETE /api/:owner/:repo/:branch/files/:path": handleDeleteFile,

  // Collections
  "GET /api/:owner/:repo/:branch/collections/:name": handleGetCollection,

  // Media
  "GET /api/:owner/:repo/:branch/media/:name/:path": handleGetMedia,

  // Branches
  "POST /api/:owner/:repo/:branch/branches": handleCreateBranch,
});

// --- Frontend static asset serving ---

/**
 * These functions will be replaced at build time by the inline-assets esbuild plugin.
 * During development, they serve from the filesystem.
 * At build time, the static assets (Next.js export) are inlined into the bundle.
 */

/** Serve the frontend SPA shell (index.html) */
const serveFrontendHtml = (): Response => {
  // This is replaced by the build-edge.ts inline-assets plugin with the actual HTML
  // During development, return a placeholder
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pages CMS</title>
  <style>body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
  .msg { text-align: center; } .msg h1 { font-size: 1.5rem; } .msg p { color: #666; }</style>
</head>
<body>
  <div class="msg">
    <h1>Pages CMS (Edge)</h1>
    <p>Frontend assets not yet built. Run <code>npm run build &amp;&amp; deno task build:edge</code> to build the full bundle.</p>
    <p><a href="/api/auth/signin">Sign in with GitHub</a></p>
  </div>
</body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
};

// Static asset map — populated at build time by the inline-assets plugin
// During development, this is empty and assets are served from .next/static
// deno-lint-ignore no-explicit-any
export const STATIC_ASSETS: Record<string, { content: string; contentType: string }> = (globalThis as any).__PAGES_CMS_STATIC_ASSETS__ ?? {};

/** Serve a static asset from the inlined asset map */
const serveStaticAsset = (path: string): Response | null => {
  const asset = STATIC_ASSETS[path];
  if (!asset) return null;

  return new Response(asset.content, {
    headers: {
      "content-type": asset.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
};

// --- Main request handler ---

/**
 * Handle all incoming requests — API routes and frontend serving.
 * This is the single entry point for the Bunny Edge Script.
 */
export const handleRequest = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // --- CSRF check (non-GET, non-webhook) ---
  const csrfResponse = verifyCsrf(request);
  if (csrfResponse) return csrfResponse;

  // --- Handle CORS preflight ---
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": request.headers.get("origin") ?? "*",
        "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
        "access-control-allow-headers": "Content-Type, Authorization",
        "access-control-max-age": "86400",
      },
    });
  }

  // --- API routes ---
  if (path.startsWith("/api/")) {
    const response = await apiRouter(request, path, method);
    if (response) return applySecurityHeaders(response);
    return applySecurityHeaders(
      Response.json({ status: "error", message: "Not found" }, { status: 404 }),
    );
  }

  // --- Static assets (built Next.js frontend) ---
  // Try exact path match first
  const staticResponse = serveStaticAsset(path);
  if (staticResponse) return staticResponse;

  // Try with .html extension (Next.js static export convention)
  const htmlResponse = serveStaticAsset(`${path}.html`);
  if (htmlResponse) return htmlResponse;

  // Try index.html for directory paths
  const indexPath = path.endsWith("/") ? `${path}index.html` : `${path}/index.html`;
  const indexResponse = serveStaticAsset(indexPath);
  if (indexResponse) return indexResponse;

  // --- Next.js _next/static assets ---
  if (path.startsWith("/_next/")) {
    const nextAsset = serveStaticAsset(path);
    if (nextAsset) return nextAsset;
  }

  // --- SPA fallback: serve the main HTML shell ---
  // For any non-API, non-asset path, serve the frontend
  if (method === "GET") {
    // Try to serve the root index.html or the SPA shell
    const rootIndex = serveStaticAsset("/index.html");
    if (rootIndex) return rootIndex;
    return serveFrontendHtml();
  }

  return applySecurityHeaders(
    new Response("Not Found", { status: 404 }),
  );
};
