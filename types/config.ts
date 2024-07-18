export type Config = {
  owner: string;
  repo: string;
  branch: string;
  sha: string;
  version: string;
  file: string;
  object: Record<string, any>;
};