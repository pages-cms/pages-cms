export interface Repo {
  owner: string;
  repo: string;
  branches?: string[];
  defaultBranch?: string;
  isPrivate: boolean;
};