/**
 * Tests for edge/lib/file-utils.ts — file path utility functions
 */

import { assertEquals } from "@std/assert";
import {
  normalizePath,
  getFileName,
  getFileExtension,
  getParentPath,
} from "#edge/lib/file-utils.ts";

// --- normalizePath ---

Deno.test("normalizePath - simple path", () => {
  assertEquals(normalizePath("a/b/c"), "a/b/c");
});

Deno.test("normalizePath - strips trailing slashes", () => {
  assertEquals(normalizePath("a/b/c/"), "a/b/c");
});

Deno.test("normalizePath - strips double slashes", () => {
  assertEquals(normalizePath("a//b/c"), "a/b/c");
});

Deno.test("normalizePath - resolves dot segments", () => {
  assertEquals(normalizePath("a/./b/c"), "a/b/c");
});

Deno.test("normalizePath - resolves parent segments", () => {
  assertEquals(normalizePath("a/b/../c"), "a/c");
});

Deno.test("normalizePath - handles leading dot segments", () => {
  assertEquals(normalizePath("./a/b"), "a/b");
});

Deno.test("normalizePath - empty string", () => {
  assertEquals(normalizePath(""), "");
});

Deno.test("normalizePath - single file", () => {
  assertEquals(normalizePath("file.txt"), "file.txt");
});

Deno.test("normalizePath - complex path", () => {
  assertEquals(normalizePath("./a/b/../c/./d"), "a/c/d");
});

// --- getFileName ---

Deno.test("getFileName - simple path", () => {
  assertEquals(getFileName("a/b/file.txt"), "file.txt");
});

Deno.test("getFileName - root file", () => {
  assertEquals(getFileName("file.txt"), "file.txt");
});

Deno.test("getFileName - path with trailing slash", () => {
  assertEquals(getFileName("a/b/c/"), "c");
});

Deno.test("getFileName - dotfile", () => {
  assertEquals(getFileName(".gitkeep"), ".gitkeep");
});

// --- getFileExtension ---

Deno.test("getFileExtension - regular file", () => {
  assertEquals(getFileExtension("file.txt"), "txt");
});

Deno.test("getFileExtension - nested path", () => {
  assertEquals(getFileExtension("a/b/file.md"), "md");
});

Deno.test("getFileExtension - double extension", () => {
  assertEquals(getFileExtension("file.test.js"), "js");
});

Deno.test("getFileExtension - dotfile without extension", () => {
  assertEquals(getFileExtension(".gitkeep"), "");
});

Deno.test("getFileExtension - no extension", () => {
  assertEquals(getFileExtension("Makefile"), "");
});

Deno.test("getFileExtension - yaml", () => {
  assertEquals(getFileExtension("config.yml"), "yml");
});

// --- getParentPath ---

Deno.test("getParentPath - nested path", () => {
  assertEquals(getParentPath("a/b/c"), "a/b");
});

Deno.test("getParentPath - single level", () => {
  assertEquals(getParentPath("a/b"), "a");
});

Deno.test("getParentPath - root file", () => {
  assertEquals(getParentPath("file.txt"), "");
});

Deno.test("getParentPath - empty string", () => {
  assertEquals(getParentPath(""), "");
});

Deno.test("getParentPath - slash", () => {
  assertEquals(getParentPath("/"), "");
});
