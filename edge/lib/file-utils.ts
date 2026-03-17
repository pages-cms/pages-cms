/**
 * File utility functions.
 * Pure functions, portable across all runtimes.
 * Direct port from lib/utils/file.ts.
 */

export const serializedTypes = [
  "yaml-frontmatter",
  "json-frontmatter",
  "toml-frontmatter",
  "yaml",
  "json",
  "toml",
];

export const getFileExtension = (path: string): string => {
  const filename = getFileName(path);
  if (filename.startsWith(".") && !filename.includes(".", 1)) return "";
  const extensionMatch = /(?:\.([^.]+))?$/.exec(filename);
  return extensionMatch ? extensionMatch[1] ?? "" : "";
};

export const getFileName = (path: string): string =>
  normalizePath(path).split("/").pop() || "";

export const normalizePath = (path: string): string => {
  const pathSegments = path
    .replace("//", "/")
    .replace(/\/+$/, "")
    .split("/");

  const normalizedPathSegments = pathSegments.reduce(
    (acc: string[], segment: string) => {
      if (segment === "..") {
        if (acc.length === 0 || acc[acc.length - 1] === "..") {
          acc.push(segment);
        } else {
          acc.pop();
        }
      } else if (segment !== "." && segment !== "") {
        acc.push(segment);
      }
      return acc;
    },
    [],
  );

  return normalizedPathSegments.join("/");
};

export const getParentPath = (path: string): string =>
  path === "" || path === "/"
    ? ""
    : path.split("/").slice(0, -1).join("/") || "";
