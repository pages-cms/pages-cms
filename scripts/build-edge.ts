/**
 * Build script for Bunny Edge deployment.
 * Bundles the edge entry point + inlined frontend assets into a single deployable file.
 *
 * Steps:
 * 1. Build the Next.js frontend as a static export (if not already built)
 * 2. Collect all static assets from the export
 * 3. Bundle edge/entry.ts with esbuild, inlining all assets
 * 4. Output bunny-script.ts (single file for Bunny Edge deployment)
 *
 * Usage: deno task build:edge
 */

import type { Plugin } from "esbuild";
import * as esbuild from "esbuild";

// --- Configuration ---

const EDGE_ENTRY = "./edge/entry.ts";
const DIST_DIR = "./dist";
const OUTPUT_FILE = "./bunny-script.ts";
const NEXT_EXPORT_DIR = "./out"; // Next.js static export output
const BUNNY_MAX_SCRIPT_SIZE = 10_000_000; // 10MB limit

// --- Step 1: Collect frontend static assets ---

/** Content type mapping for common file extensions */
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
  ".webmanifest": "application/manifest+json",
};

const getContentType = (path: string): string => {
  const ext = path.slice(path.lastIndexOf("."));
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
};

/** Check if a file is a text/utf-8 type that can be inlined as a string */
const isTextType = (contentType: string): boolean =>
  contentType.includes("text/") ||
  contentType.includes("javascript") ||
  contentType.includes("json") ||
  contentType.includes("xml") ||
  contentType.includes("svg") ||
  contentType.includes("manifest");

/** Recursively walk a directory and collect all files */
const walkDir = (dir: string, prefix = ""): Array<{ path: string; fullPath: string }> => {
  const results: Array<{ path: string; fullPath: string }> = [];

  try {
    for (const entry of Deno.readDirSync(dir)) {
      const fullPath = `${dir}/${entry.name}`;
      const relativePath = prefix ? `${prefix}/${entry.name}` : `/${entry.name}`;

      if (entry.isDirectory) {
        results.push(...walkDir(fullPath, relativePath));
      } else if (entry.isFile) {
        results.push({ path: relativePath, fullPath });
      }
    }
  } catch {
    // Directory doesn't exist — that's OK, assets will be empty
  }

  return results;
};

/** Collect all static assets from the Next.js export directory */
const collectAssets = (): Record<string, { content: string; contentType: string }> => {
  const assets: Record<string, { content: string; contentType: string }> = {};
  const files = walkDir(NEXT_EXPORT_DIR);

  console.log(`Found ${files.length} static files in ${NEXT_EXPORT_DIR}/`);

  for (const file of files) {
    const contentType = getContentType(file.path);

    if (isTextType(contentType)) {
      // Text files — read as UTF-8 string
      const content = Deno.readTextFileSync(file.fullPath);
      assets[file.path] = { content, contentType };
    } else {
      // Binary files — base64 encode
      const bytes = Deno.readFileSync(file.fullPath);
      const base64 = btoa(String.fromCharCode(...bytes));
      assets[file.path] = {
        content: `__BASE64__${base64}`,
        contentType,
      };
    }
  }

  return assets;
};

// --- Step 2: esbuild plugins ---

/**
 * Plugin to inline static assets into the edge bundle.
 * Replaces the STATIC_ASSETS import in routes/index.ts with pre-read content.
 */
const createInlineAssetsPlugin = (
  assets: Record<string, { content: string; contentType: string }>,
): Plugin => ({
  name: "inline-frontend-assets",
  setup(build) {
    // Intercept the routes/index.ts module to inject assets
    build.onLoad({ filter: /routes\/index\.ts$/ }, async (args) => {
      let source = await Deno.readTextFile(args.path);

      // Generate the asset map as JavaScript
      const assetEntries = Object.entries(assets)
        .map(([path, { content, contentType }]) => {
          if (content.startsWith("__BASE64__")) {
            // Binary asset — decode at runtime
            const base64Data = content.slice("__BASE64__".length);
            return `  ${JSON.stringify(path)}: { content: atob(${JSON.stringify(base64Data)}), contentType: ${JSON.stringify(contentType)} }`;
          }
          return `  ${JSON.stringify(path)}: { content: ${JSON.stringify(content)}, contentType: ${JSON.stringify(contentType)} }`;
        })
        .join(",\n");

      const assetsModule = `const __INLINED_ASSETS__ = {\n${assetEntries}\n};\n`;

      // Replace the STATIC_ASSETS declaration with our inlined version
      source = source.replace(
        /export const STATIC_ASSETS:.*=.*(?:__PAGES_CMS_STATIC_ASSETS__|{});?/s,
        `${assetsModule}\nexport const STATIC_ASSETS = __INLINED_ASSETS__;`,
      );

      return { contents: source, loader: "ts" };
    });
  },
});

// --- Deno npm cache resolver (from tickets project) ---

const getDenoNpmCache = (): string => {
  const result = new Deno.Command(Deno.execPath(), {
    args: ["info", "--json"],
    stdout: "piped",
  }).outputSync();
  const info = JSON.parse(new TextDecoder().decode(result.stdout));
  return `${info.npmCache}/registry.npmjs.org`;
};

const NPM_CACHE = getDenoNpmCache();
const CONDITIONS = ["browser", "import", "default"];

const resolveExport = (
  entry: string | Record<string, unknown>,
): string | null => {
  if (typeof entry === "string") return entry;
  for (const cond of CONDITIONS) {
    const val = (entry as Record<string, unknown>)[cond];
    if (val) return resolveExport(val as string | Record<string, unknown>);
  }
  return null;
};

const findPackageDir = (name: string): string => {
  const scopedDir = `${NPM_CACHE}/${name}`;
  for (const entry of Deno.readDirSync(scopedDir)) {
    if (entry.isDirectory) return `${scopedDir}/${entry.name}`;
  }
  throw new Error(`Package ${name} not found in npm cache`);
};

const exists = (path: string): boolean => {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
};

const resolveFile = (path: string): string =>
  [path, `${path}.js`, `${path}.json`, `${path}/index.js`].find(exists) ?? path;

const parseSpecifier = (
  specifier: string,
): { pkgName: string; subpath: string } => {
  const nameSegments = specifier.startsWith("@") ? 2 : 1;
  const idx = specifier.split("/", nameSegments).join("/").length;
  return {
    pkgName: specifier.slice(0, idx === specifier.length ? undefined : idx),
    subpath: idx < specifier.length ? specifier.slice(idx + 1) : "",
  };
};

const resolveViaExports = (
  pkgDir: string,
  pkgJson: Record<string, unknown>,
  subpath: string,
): string | null => {
  const exportsField = pkgJson.exports as Record<string, unknown> | undefined;
  if (!exportsField) return null;
  const key = subpath ? `./${subpath}` : ".";
  const exportEntry =
    exportsField[key] ??
    (!subpath && !("." in exportsField) ? exportsField : undefined);
  if (!exportEntry) return null;
  const resolved = resolveExport(exportEntry as string | Record<string, unknown>);
  return resolved ? resolveFile(`${pkgDir}/${resolved}`) : null;
};

const resolveViaFallback = (
  pkgDir: string,
  pkgJson: Record<string, unknown>,
): string => {
  if (typeof pkgJson.browser === "string") {
    return resolveFile(`${pkgDir}/${pkgJson.browser}`);
  }
  const entry = (pkgJson.module ?? pkgJson.main) as string | undefined;
  if (!entry) return resolveFile(`${pkgDir}/index`);
  if (typeof pkgJson.browser === "object" && pkgJson.browser !== null) {
    const mapped = (pkgJson.browser as Record<string, string>)[entry];
    if (typeof mapped === "string") return resolveFile(`${pkgDir}/${mapped}`);
  }
  return resolveFile(`${pkgDir}/${entry}`);
};

const resolveNpmSpecifier = (specifier: string): string | null => {
  const { pkgName, subpath } = parseSpecifier(specifier);
  let pkgDir: string;
  try {
    pkgDir = findPackageDir(pkgName);
  } catch {
    return null;
  }
  const pkgJson = JSON.parse(Deno.readTextFileSync(`${pkgDir}/package.json`));
  const fromExports = resolveViaExports(pkgDir, pkgJson, subpath);
  if (fromExports) return fromExports;
  return subpath ? null : resolveViaFallback(pkgDir, pkgJson);
};

// Platform-specific entry points for edge
const EDGE_SUBPATHS: Record<string, string> = {
  "@libsql/client": "/web",
  "@bunny.net/edgescript-sdk": "/esm-bunny/lib.mjs",
};

const denoNpmResolverPlugin: Plugin = {
  name: "deno-npm-resolver",
  setup(build) {
    for (const [pkg, subpath] of Object.entries(EDGE_SUBPATHS)) {
      const filter = new RegExp(
        `^${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      );
      build.onResolve({ filter }, () => {
        const resolved = resolveNpmSpecifier(`${pkg}${subpath}`);
        return resolved ? { path: resolved } : undefined;
      });
    }

    build.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith("node:")) return undefined;
      const resolved = resolveNpmSpecifier(args.path);
      return resolved ? { path: resolved } : undefined;
    });
  },
};

// --- Node.js globals banner ---

import { builtinModules } from "node:module";

const nodeExternals = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
];

const NODEJS_GLOBALS_BANNER = `import * as process from "node:process";
import { Buffer } from "node:buffer";
globalThis.process ??= process;
globalThis.Buffer ??= Buffer;
globalThis.global ??= globalThis;
`;

// --- Build ---

console.log("=== Pages CMS Edge Build ===");
console.log("");

// Collect frontend assets (from Next.js static export)
let assets: Record<string, { content: string; contentType: string }> = {};
try {
  Deno.statSync(NEXT_EXPORT_DIR);
  console.log(`Collecting frontend assets from ${NEXT_EXPORT_DIR}/...`);
  assets = collectAssets();
  console.log(`Collected ${Object.keys(assets).length} assets`);
} catch {
  console.log(
    `No frontend export found at ${NEXT_EXPORT_DIR}/ — building API-only bundle.`,
  );
  console.log(
    "To include the frontend, run: npm run build (with 'output: export' in next.config.mjs)",
  );
}

console.log("");
console.log("Bundling edge script...");

await esbuild.build({
  entryPoints: [EDGE_ENTRY],
  outdir: DIST_DIR,
  platform: "browser",
  format: "esm",
  minify: true,
  bundle: true,
  external: nodeExternals,
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [
    denoNpmResolverPlugin,
    createInlineAssetsPlugin(assets),
  ],
  banner: { js: NODEJS_GLOBALS_BANNER },
});

// Read output and check size
const content = await Deno.readTextFile(`${DIST_DIR}/entry.js`);

if (content.length > BUNNY_MAX_SCRIPT_SIZE) {
  console.error(
    `\nBundle size ${content.length} bytes exceeds Bunny's ${BUNNY_MAX_SCRIPT_SIZE} byte limit!`,
  );
  console.error("Consider reducing frontend assets or splitting the deployment.");
  Deno.exit(1);
}

await Deno.writeTextFile(OUTPUT_FILE, content);

console.log(`\nBuild complete: ${OUTPUT_FILE} (${(content.length / 1024).toFixed(1)} KB)`);

if (Object.keys(assets).length > 0) {
  console.log(`  Frontend: ${Object.keys(assets).length} assets inlined`);
} else {
  console.log("  Frontend: not included (API-only)");
}

console.log(`  Limit: ${(BUNNY_MAX_SCRIPT_SIZE / 1_000_000).toFixed(0)} MB`);

esbuild.stop();
