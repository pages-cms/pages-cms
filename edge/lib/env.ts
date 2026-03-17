/**
 * Environment variable abstraction for cross-runtime compatibility.
 * Works in both Deno (local development) and Bunny Edge (production).
 *
 * - Deno: uses Deno.env.get()
 * - Bunny Edge: uses process.env (Node.js compatibility)
 */

declare const Deno:
  | { env: { get(key: string): string | undefined } }
  | undefined;

declare const process: { env: Record<string, string | undefined> } | undefined;

export function getEnv(key: string): string | undefined {
  if (process?.env && key in process.env) {
    return process.env[key];
  }
  if (!Deno) throw new Error("Neither process.env nor Deno.env is available");
  return Deno.env.get(key);
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}
