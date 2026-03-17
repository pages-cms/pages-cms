/**
 * Tests for edge/lib/env.ts — cross-runtime environment variable abstraction
 */

import { assertEquals, assertThrows } from "@std/assert";

// We need to test env.ts in isolation. Since it checks for process.env and Deno.env,
// we can test it directly in Deno where Deno.env is available.

Deno.test("getEnv - returns value from Deno.env", async () => {
  // Set a test env var
  Deno.env.set("TEST_ENV_VAR", "hello");

  const { getEnv } = await import("#edge/lib/env.ts");
  assertEquals(getEnv("TEST_ENV_VAR"), "hello");

  // Cleanup
  Deno.env.delete("TEST_ENV_VAR");
});

Deno.test("getEnv - returns undefined for missing var", async () => {
  const { getEnv } = await import("#edge/lib/env.ts");
  assertEquals(getEnv("NONEXISTENT_TEST_VAR_XYZ"), undefined);
});

Deno.test("requireEnv - returns value when set", async () => {
  Deno.env.set("TEST_REQUIRE_VAR", "world");

  const { requireEnv } = await import("#edge/lib/env.ts");
  assertEquals(requireEnv("TEST_REQUIRE_VAR"), "world");

  Deno.env.delete("TEST_REQUIRE_VAR");
});

Deno.test("requireEnv - throws when not set", async () => {
  const { requireEnv } = await import("#edge/lib/env.ts");
  assertThrows(
    () => requireEnv("NONEXISTENT_REQUIRED_VAR"),
    Error,
    "Required environment variable NONEXISTENT_REQUIRED_VAR is not set",
  );
});
