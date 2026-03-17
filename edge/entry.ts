/**
 * Pages CMS - Bunny Edge Script entry point.
 * Single script serving both the API and the frontend.
 *
 * This is the production entry point. BunnySDK.net.http.serve() registers
 * a request handler that Bunny invokes for each incoming HTTP request.
 */

import * as BunnySDK from "@bunny.net/edgescript-sdk";
import { initDb } from "#edge/lib/db/migrations.ts";
import { handleRequest } from "#edge/routes/index.ts";

let initialized = false;

const initialize = async (): Promise<void> => {
  if (initialized) return;
  await initDb();
  console.log("Pages CMS edge script initialized");
  initialized = true;
};

BunnySDK.net.http.serve(async (request: Request): Promise<Response> => {
  try {
    await initialize();
    return await handleRequest(request);
  } catch (error) {
    console.error("Unhandled request error:", error);
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta http-equiv="refresh" content="2"><title>Temporary Error</title></head><body><h1>Temporary Error</h1><p>Something went wrong. Retrying automatically&hellip;</p></body></html>',
      {
        status: 503,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }
});
