# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pages CMS is an open-source Content Management System for GitHub, designed for static site generators (Jekyll, Next.js, Hugo, Astro, etc.). It provides a user-friendly web interface to edit content directly on GitHub repositories.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM with PostgreSQL, Lucia for authentication, Octokit for GitHub API.

## Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production (auto-runs db:migrate)
npm run lint             # Run ESLint
npm run db:generate      # Generate Drizzle migrations after schema changes
npm run db:migrate       # Apply pending migrations
npm run db:clear-cache   # Clear file/permission cache from database
```

For development, you need a GitHub App configured and a tunnel (e.g., ngrok) for webhooks.

## Architecture

### Directory Structure

- **`/app`** - Next.js App Router
  - `/(auth)/` - Authentication pages (sign-in flows)
  - `/(main)/` - Main application UI
  - `/api/` - REST API routes
    - `/api/auth/` - OAuth and email auth
    - `/api/webhook/github/` - GitHub webhook handler
    - `/api/[owner]/[repo]/[branch]/` - Content management endpoints (entries, files, collections, media)

- **`/lib`** - Core business logic
  - `auth.ts` - Lucia authentication setup
  - `githubApp.ts` - GitHub App configuration
  - `githubCache.ts` - GitHub API caching layer
  - `config.ts` - CMS configuration parsing
  - `configSchema.ts` - Zod schema for config validation
  - `crypto.ts` - Token encryption (AES)

- **`/db`** - Database layer (Drizzle ORM)
  - `schema.ts` - Table definitions (users, sessions, tokens, collaborators, config, cache)
  - `/migrations/` - SQL migrations

- **`/fields`** - Extensible field type system
  - `/core/` - Built-in types (string, text, date, image, rich-text, code, select, etc.)
  - `/custom/` - User-defined field types
  - `registry.ts` - Dynamic field component loading via webpack require.context

- **`/components`** - React components
  - `/ui/` - shadcn/ui components
  - `/collection/`, `/entry/`, `/file/`, `/media/`, `/repo/` - Feature components

### Field Type System

Fields are dynamically registered from `/fields/core` and `/fields/custom`. Each field can export:

- `schema` - Zod validation schema
- `read`/`write` - Format conversion functions
- `EditComponent`/`ViewComponent` - React components
- `defaultValue` - Default value for new entries

To create a custom field, add a folder in `/fields/custom/` with an `index.ts` exporting these.

### Configuration-Driven CMS

Repositories define their CMS structure via `.pages.yml` (or YAML/TOML variants). The schema in `lib/configSchema.ts` validates:

- `media` - Media folder configuration
- `content` - Collections and file definitions with fields
- `components` - Reusable field groups

### Authentication Flow

- GitHub OAuth via Arctic library
- Email magic links via Resend
- Sessions managed by Lucia with Drizzle adapter
- GitHub tokens encrypted at rest using AES

### Caching Strategy

- File contents cached in `cache_file` table with configurable TTL
- Permissions cached in `cache_permission` table
- Cron endpoint (`/api/cron`) clears expired cache entries

## Contributing

- Submit PRs against `development` branch, not `main`
- `main` is production (app.pagescms.org)
- `development` is staging (dev.pagescms.org)
- Use `feature/name` or `issue/123-description` branch naming
