# Pages CMS

[Pages CMS](https://pagescms.org) is an Open Source Content Management System for GitHub. It is particularly well suited for static site generators (e.g. Jekyll, Next.js, VuePress, Hugo).

It offers a user-friendly interface to edit the content of your website or app directly on GitHub.

<a href="https://demo.pagescms.org" target="_blank">
<picture>
<source media="(prefers-color-scheme: dark)" srcset="https://pagescms.org/media/screenshots/nextjs-edit-with-bg-dark@2x.png">
<source media="(prefers-color-scheme: light)" srcset="https://pagescms.org/media/screenshots/nextjs-edit-with-bg-light@2x.png">
<img src="https://pagescms.org/media/screenshots/nextjs-edit-with-bg-light@2x.png">
</picture>
</a>

*[Watch the demo ▶](https://demo.pagescms.org)*

## Documentation

Go to [pagescms.org/docs](https://pagescms.org/docs).

## Community chat

[Join the Discord server](https://pagescms.org/chat) to get help with Pages CMS, share feedback, and connect with other users building with the platform.

## Built with

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [drizzle](https://orm.drizzle.team/)
- [Vercel](https://vercel.com/)
- [Supabase](https://supabase.tech/)
- [Resend](https://resend.com/)

## Use online

The easiest way to get started is to use [the online version of Pages CMS](https://app.pagescms.org). You'll be able to log in with your GitHub account and get the latest version of Pages CMS.

This online version is identical to what's in this repo, but you can also install your own version locally or deploy it (for free) on Vercel following the steps below.

## Install and Deploy

### Create a GitHub App

Whether you're installing Pages CMS locally or deploying it online, you will need a GitHub App.

You can either create it under your personal account (https://github.com/settings/apps) or under one of your organizations (`https://github.com/organizations/<org-name>/settings/apps`).

You will need to fill in the following information:

- **GitHub App name**: use "Pages CMS" or whatever you think is appropriate (e.g. "Pages CMS (dev)").
- **Homepage URL**: whatever you want, https://pagescms.org will do.
- **Identifying and authorizing users**:
    - Callback URL: the URL for `/api/auth/github`:
        - `http://localhost:3000/api/auth/github` for development,
        - something like `https://my-vercel-url.vercel.app/api/auth/github` (or whatever custom domain you're using) if you're deploying on Vercel.
    - Expire user authorization tokens: no.
    - Request user authorization (OAuth) during installation: yes.
    - Enable Device Flow: no.
- **Post installation**:
    - Setup URL (optional): leave empty.
    - Redirect on update: no.
- **Webhook**:
    - Active: yes.
    - Webhook URL: the (public) URL for `/api/webhook/github`:
        - for development, you'll need to use something like [ngrok](https://ngrok.com/). You'll end up with something like `https://your-unique-subdomain.ngrok-free.app/api/webhook/github`.
        - something like `https://my-vercel-url.vercel.app/api/webhook/github` (or whatever custom domain you're using) if you're deploying on Vercel.
    - Secret: generate a random string (for example with `openssl rand -base64 32` on MacOS/Linux)
- **Permissions**:
    - Repository permissions:
        - Administration: Read & Write
        - Contents: Read & Write
        - Metadata: Read only
    - Organization permissions: nothing.
    - Account permissions: nothing.
- **Subscribe to events**:
    - Installation target
    - Repository
    - Push
    - Delete
- **Where can this GitHub App be installed?**: you'll want to select "Any account" unless you intend to only use Pages CMS on the account this GitHub App is created under.

### Environment variables

Variable | Comments
--- | ---
`BASE_URL` | Recommended outside Vercel. Set it to the public URL for the app (e.g. `https://cms.example.com`). For Cloudflare Workers, set this explicitly.
`DATABASE_URL` | The direct PostgreSQL URL used for local development and Drizzle migrations (e.g. `postgresql://user:password@example.com:6543`). If you're using [Supabase](https://supabase.com), use the direct connection string or local pooler string for migrations. Cloudflare runtime traffic should go through Hyperdrive instead of using this directly.
`CRYPTO_KEY` | Used to encrypt/decrypt GitHub tokens in the database. On MacOS/Linux*, you can use `openssl rand -base64 32`.
`GITHUB_APP_ID` | GitHub App ID from your GitHub App details page.
`GITHUB_APP_NAME` | Machine name for your GitHub App (e.g. `pages-cms`), should be the slug the URL of your GitHub App details page.
`GITHUB_APP_PRIVATE_KEY` | PEM file you can download upong creation of the GitHub App.
`GITHUB_APP_WEBHOOK_SECRET` | The secret you picked for your webhook. This is used to ensure the request is coming from GitHub.
`GITHUB_APP_CLIENT_ID` | GitHub App Client ID from your GitHub App details page.
`GITHUB_APP_CLIENT_SECRET` | GitHub App Client Secret you generate on theGitHub App details page.
`RESEND_FROM_EMAIL` | The sender for authentication emails. Must be a verified domain in your Resend account and follow the format `email@example.com` or `Name <email@example.com>`.
`RESEND_API_KEY` | You'll get that when you create a (free) [Resend](https://resend.com) account to handle emails.
`FILE_CACHE_TTL` | **OPTIONAL**. Time to live (in minutes) for file cache (collections and media folders). Defaults to 1440 (1 day). Set to "-1" to prevent the cache from ever expiring, or "0" if you want no cache.
`PERMISSION_CACHE_TTL` | **OPTIONAL**. Time to live (in minutes) for the permission cache, which controls access to file cache. Defaults to 60. Set to "0" if you want to always check permissions against the GitHub API.
`CRON_SECRET` | Secret token used to secure the access of the cron API endpoint.

### Local development

We assume you've already created the GitHub App and have a running tunnel for the GitHub App Webhook (using [ngrok](https://ngrok.com/) for example):

1. **Install the dependencies**: `npm install`
2. **Start local PostgreSQL**: `npm run db:docker:up`
3. **Update your environment variables**: create a local `.env` file and set `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/pages_cms` plus the rest of the required values.
4. **Create the database**: `npm run db:migrate`
5. **Run it**: `npm run dev`

The default local Hyperdrive target in `wrangler.jsonc` also points to `postgresql://postgres:postgres@127.0.0.1:5432/pages_cms`, so local Worker development and Drizzle migrations use the same Docker database.

### Deploy on Cloudflare Workers + Supabase Postgres

1. **Create a PostgreSQL database**: Supabase is a good fit for this project.
2. **Keep `DATABASE_URL` for local development and migrations**: `npm run db:migrate` still runs outside Cloudflare.
3. **Create Hyperdrive bindings**: create one per environment and attach them in `wrangler.jsonc` under `env.staging.hyperdrive` and `env.production.hyperdrive`.
4. **Set Cloudflare secrets**: at minimum `BASE_URL`, `CRYPTO_KEY`, `GITHUB_APP_ID`, `GITHUB_APP_NAME`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_WEBHOOK_SECRET`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `CRON_SECRET`.
5. **Generate Worker types**: run `npm run cf:typegen` after updating `wrangler.jsonc`.
6. **Deploy**: use `npm run deploy:staging` or `npm run deploy`.
7. **Point your custom domain**: add a `routes` entry in `wrangler.jsonc` or configure the route in the Cloudflare dashboard, then set `BASE_URL` to that hostname.

Example Hyperdrive commands:

```bash
npx wrangler hyperdrive create pages-cms-staging --connection-string="postgresql://..."
npx wrangler hyperdrive create pages-cms-production --connection-string="postgresql://..."
```

For local Worker development, `env.staging.hyperdrive[0].localConnectionString` is set to `postgresql://postgres:postgres@127.0.0.1:5432/pages_cms`. Start Docker with `npm run db:docker:up`, then use `vinext dev` or `wrangler dev --env staging`.

### Deploy on Vercel

1. **Create a PostgreSQL database**: I recommend using [Supabase](https://supabase.com), but any PostgreSQL database will do.
2. **Deploy to Vercel**: at this stage you have 2 choices:
    1. **Create a fork**: fork the `pages-cms/pages-cms` repo in your account and deploy that fork. This will allow you to get updates. **Make sure you define all of the environment variables listed above**.
    2. **Use the deploy button**:
    
        [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpages-cms%2Fpages-cms%2Ftree%2Fmain&project-name=pages-cms&repository-name=pages-cms&redirect-url=https%3A%2F%2Fpagescms.org&env=CRYPTO_KEY,GITHUB_APP_ID,GITHUB_APP_NAME,GITHUB_APP_PRIVATE_KEY,GITHUB_APP_WEBHOOK_SECRET,GITHUB_APP_CLIENT_ID,GITHUB_APP_CLIENT_SECRET,RESEND_API_KEY,DATABASE_URL)

3. **Update your GitHub OAuth app**: you'll probably need to go back to your GitHub App settings to update some of the settings once you have the Vercel URL (e.g. "Callback URL" and "Webhook URL").

### Self-host

There are [plenty of other options](https://nextjs.org/docs/app/building-your-application/deploying#self-hosting): Fly.io, Digital Ocean, Render, SST, etc.

## License

Everything in this repo is released under the [MIT License](LICENSE).
