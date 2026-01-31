export type Config = {
  owner: string;
  repo: string;
  branch: string;
  sha: string;
  version: string;
  object: Record<string, any>; // Parsed .pages.yml content (includes previewUrl, collections, etc.)
};