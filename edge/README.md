# Pages CMS — Bunny Edge Scripts Deployment

This directory contains the edge runtime version of Pages CMS, designed to run
on [Bunny Edge Scripting](https://docs.bunny.net/docs/edge-scripting-overview)
(Deno 2.x based).

## Architecture

The entire application — API routes and frontend — is bundled into a single
JavaScript file (`bunny-script.ts`) that runs on Bunny's edge network.

```
edge/
├── entry.ts              # Bunny Edge Script entry point (BunnySDK.net.http.serve)
├── server.ts             # Deno development server (Deno.serve)
├── router.ts             # HTTP pattern-matching router
├── middleware.ts          # CSRF protection, security headers
├── routes/
│   ├── index.ts          # Route dispatch (API + frontend serving)
│   ├── auth.ts           # GitHub OAuth
│   ├── webhook.ts        # GitHub webhooks
│   ├── repos.ts          # Repository listing
│   ├── entries.ts        # File content reading
│   ├── files.ts          # File CRUD
│   ├── collections.ts    # Collection listing
│   ├── media.ts          # Media files
│   ├── branches.ts       # Branch management
│   ├── history.ts        # File history
│   ├── rename.ts         # File renaming
│   ├── collaborators.ts  # Collaborator management
│   └── cron.ts           # Cache cleanup
└── lib/
    ├── env.ts            # Cross-runtime env vars (Deno + Bunny)
    ├── crypto.ts         # AES-GCM encryption (Web Crypto API)
    ├── auth.ts           # Session management (replaces Lucia)
    ├── token.ts          # GitHub token management (user + installation)
    ├── octokit.ts        # Lightweight GitHub API client (replaces octokit npm)
    ├── github-app.ts     # GitHub App helpers
    ├── github-cache.ts   # File/permission caching
    ├── config.ts         # Config management
    ├── file-utils.ts     # File path utilities
    └── db/
        ├── client.ts     # libsql/Turso database client
        ├── schema.ts     # SQLite DDL (replaces Drizzle PostgreSQL schema)
        └── migrations.ts # Migration runner
```

## Key Differences from Next.js Version

| Aspect | Next.js | Edge |
|--------|---------|------|
| Runtime | Node.js (Vercel) | Deno 2.x (Bunny Edge) |
| Database | PostgreSQL (Drizzle ORM) | libsql/Turso (raw SQL) |
| Auth | Lucia + Next.js cookies | Custom session management |
| GitHub API | Octokit npm package | Lightweight fetch-based client |
| Frontend | Server components + SSR | Static export (inlined assets) |
| Deployment | Vercel serverless | Single Bunny Edge Script |

## Development

```bash
# Install Deno dependencies
deno install

# Start the development server
deno task start

# Run type checks
deno task typecheck
```

## Environment Variables

```
DATABASE_URL          # libsql URL (file:// for local, libsql:// for Turso)
DB_TOKEN              # Turso auth token (if using remote DB)
CRYPTO_KEY            # Base64-encoded AES-256 key
GITHUB_APP_ID         # GitHub App ID
GITHUB_APP_PRIVATE_KEY # GitHub App PEM private key
GITHUB_APP_CLIENT_ID  # GitHub OAuth client ID
GITHUB_APP_CLIENT_SECRET # GitHub OAuth client secret
GITHUB_APP_WEBHOOK_SECRET # Webhook HMAC secret
CRON_SECRET           # Bearer token for /api/cron
ALLOWED_DOMAIN        # (Optional) Restrict to specific domain
```

## Building for Bunny Edge

```bash
# 1. Build the Next.js frontend as a static export
BUNNY_BUILD=true npm run build

# 2. Bundle everything into a single edge script
deno task build:edge

# Output: bunny-script.ts (deploy this to Bunny)
```

## Deployment

### Manual
Upload `bunny-script.ts` to Bunny Edge Scripting via the Bunny dashboard.

### CI/CD
The `.github/workflows/bunny-deploy.yml` workflow automatically:
1. Builds the Next.js frontend
2. Bundles the edge script
3. Deploys to Bunny on push to main

Required GitHub Secrets:
- `BUNNY_SCRIPT_ID` — Your Bunny Edge Script ID
- `BUNNY_ACCESS_KEY` — Your Bunny API key
