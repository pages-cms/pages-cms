export type Config = {
  owner: string;
  repo: string;
  branch: string;
  sha: string;
  version: string;
  object: Record<string, any>;
  previewUrl?: string; // Base URL for block previews (e.g., "https://tenant.pages.dev")
};