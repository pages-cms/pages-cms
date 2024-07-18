# Pages CMS

[Pages CMS](https://pagescms.org) is an Open Source Content Management System built for static websites (Jekyll, Next.js, VuePress, Hugo, etc).

It allows you to edit your website's content directly on GitHub via a user-friendly interface.

<p align="center">
<img src="https://pagescms.org/media/screenshots/collection-dark@2x.png">
</p>

## Documentation

Go to [pagescms.org/docs](https://pagescms.org/docs).

## Built with

- [Next.js](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [drizzle](https://orm.drizzle.team/)
- [Vercel](https://vercel.com/) (including [Vercel Posgres](https://vercel.com/docs/storage/vercel-postgres))

## Get started

### Use online

The easiest way to get started is to use [the online version of Pages CMS](https://next.pagescms.org). You'll be able to log in with your GitHub account and get the latest version of Pages CMS.

This online version is identical to what's in this repo, but you can also install your own version locally or deploy it (for free) on Vercel following the steps below.

### Deploy on Vercel

1. **Create a GitHub OAuth app**: go to [your Developer Settings](https://github.com/settings/developers) and [create a New OAuth App](https://github.com/settings/applications/new) (or alternatively create one for one of your organizations) with the following settings:
    - **Application name**: `Pages CMS`
    - **Homepage URL**: `https://pagescms.org`
    - **Authorization callback URL**: `https://example.com` (we'll get back to this later on).
2. **Create the Vercel project**: you can use the deploy button below or fork this repo and [deploy it yourself](https://vercel.com/docs/deployments/overview). You will need to define a few environment variables:
  - `CRYPTO_KEY`: a random base64 string. You can generate one with the following command: `openssl rand -base64 32`.
  - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: as provided by GitHub when you created the OAuth app.
  
  [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpages-cms%2Fpages-cms%2Ftree%2Fnext&env=CRYPTO_KEY,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET&project-name=pages-cms&repository-name=pages-cms&redirect-url=https%3A%2F%2Fpagescms.org)
  
3. **Create a database and connect it**: go to the "Storage" tab in your Vercel project, create a [Postgres database](https://vercel.com/docs/storage/vercel-postgres) and connect it.
4. **Pull the repo locally**: git clone
5. **
6. **Update your GitHub OAuth app**: once your Vercel project is created, go back to your GitHub Oauth app settings and update the authorization callback URL to be something like `https://example.vercel.app/api/auth/github`, replacing `https://example.vercel.app` with the URL of your Vercel project.


To get a local version up and running:

1. **Install dependencies**: `npm install`.
1. **Create a GitHub OAuth app**: 0n GitHub, go to [your Developer Settings](https://github.com/settings/developers) and [create a New OAuth App](https://github.com/settings/applications/new) (or alternatively create one for one of your organizations). You can use the following settings for your development environment:
    - Application name: `Pages CMS (dev)`
    - Homepage URL: `https://pagescms.org`
    - Authorization callback URL: `http://localhost:3000/auth/callback`
1. 
1. **Create a file for environment variables**: copy `.env.local.example` into `.env.local` and update the environment variables with the values from your GitHub  `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` with the values you got for your GitHub OAuth app. You shouldn't have to modify `BASE_URL`.
1. **Run it**: `npm run dev`.
1. **Visit [localhost:8788](http://localhost:3000)**.

## License

Everything in this repo is released under the [MIT License](LICENSE).

https://vercel.com/docs/storage/vercel-postgres/quickstart


Pull Postgres environment variables

 need to pull them into your local environment to access your Postgres database.

vercel env pull .env.development.local
npx drizzle-kit push