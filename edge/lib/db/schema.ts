/**
 * Database schema as SQL DDL for libsql/SQLite.
 * Mirrors the PostgreSQL schema from db/schema.ts but uses SQLite syntax.
 */

export const MIGRATIONS: string[] = [
  // Users table
  `CREATE TABLE IF NOT EXISTS "user" (
    id TEXT NOT NULL PRIMARY KEY,
    github_email TEXT,
    github_name TEXT,
    github_id INTEGER UNIQUE,
    github_username TEXT,
    email TEXT UNIQUE
  )`,

  // Sessions table
  `CREATE TABLE IF NOT EXISTS "session" (
    id TEXT NOT NULL PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    user_id TEXT NOT NULL REFERENCES "user"(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_session_userId ON "session"(user_id)`,

  // GitHub user tokens
  `CREATE TABLE IF NOT EXISTS github_user_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES "user"(id)
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_github_user_token_userId ON github_user_token(user_id)`,

  // GitHub installation tokens
  `CREATE TABLE IF NOT EXISTS github_installation_token (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    installation_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_github_installation_token_installationId ON github_installation_token(installation_id)`,

  // Email login tokens
  `CREATE TABLE IF NOT EXISTS email_login_token (
    token_hash TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  )`,

  // Collaborators
  `CREATE TABLE IF NOT EXISTS collaborator (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    installation_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL,
    repo_id INTEGER,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    branch TEXT,
    email TEXT NOT NULL,
    user_id TEXT REFERENCES "user"(id),
    invited_by TEXT NOT NULL REFERENCES "user"(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_collaborator_owner_repo_email ON collaborator(owner, repo, email)`,
  `CREATE INDEX IF NOT EXISTS idx_collaborator_userId ON collaborator(user_id)`,

  // Config cache
  `CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    branch TEXT NOT NULL,
    sha TEXT NOT NULL,
    version TEXT NOT NULL,
    object TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_config_owner_repo_branch ON config(owner, repo, branch)`,

  // File cache
  `CREATE TABLE IF NOT EXISTS cache_file (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    context TEXT NOT NULL DEFAULT 'collection',
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    branch TEXT NOT NULL,
    parent_path TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT,
    sha TEXT,
    size INTEGER,
    download_url TEXT,
    commit_sha TEXT,
    commit_timestamp INTEGER,
    last_updated INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cache_file_owner_repo_branch_parentPath ON cache_file(owner, repo, branch, parent_path)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_file_owner_repo_branch_path ON cache_file(owner, repo, branch, path)`,

  // Permission cache
  `CREATE TABLE IF NOT EXISTS cache_permission (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    github_id INTEGER NOT NULL,
    owner TEXT NOT NULL,
    repo TEXT NOT NULL,
    last_updated INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_permission_githubId_owner_repo ON cache_permission(github_id, owner, repo)`,
];
