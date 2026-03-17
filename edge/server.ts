/**
 * Pages CMS - Deno development server entry point.
 * Runs the same request handler as the Bunny Edge Script, but using Deno.serve().
 *
 * Usage: deno task start
 */

import { initDb } from "#edge/lib/db/migrations.ts";
import { handleRequest } from "#edge/routes/index.ts";

const startServer = async (port = 3000): Promise<void> => {
  await initDb();
  console.log(`Pages CMS dev server starting on http://localhost:${port}`);

  Deno.serve({ port }, (request) => handleRequest(request));
};

const port = Number.parseInt(Deno.env.get("PORT") || "3000", 10);
startServer(port);
