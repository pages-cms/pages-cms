# Pages CMS

[Pages CMS](https://pagescms.org) is an Open Source Content Management System for GitHub. It is particularly well suited for static site generators (e.g. Jekyll, Next.js, VuePress, Hugo).

It offers a user-friendly interaface to edit the content of your website or app directly on GitHub.

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

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpages-cms%2Fpages-cms%2Ftree%2Fnext&env=CRYPTO_KEY,GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET&project-name=pages-cms&repository-name=pages-cms&redirect-url=https%3A%2F%2Fpagescms.org)

1. **Create a GitHub OAuth app**: go to [your Developer Settings](https://github.com/settings/developers) and [create a New OAuth App](https://github.com/settings/applications/new) (or alternatively create one for one of your organizations) with the following settings:
    - **Application name**: `Pages CMS`
    - **Homepage URL**: `https://pagescms.org`
    - **Authorization callback URL**: `https://example.com` (we'll get back to this later on).
2. **Create the Vercel project**: you can use the deploy button above or fork this repo and [deploy it yourself](https://vercel.com/docs/deployments/overview). You will need to define a few environment variables:
  - `CRYPTO_KEY`: a random base64 string. You can generate one with the following command: `openssl rand -base64 32`.
  - `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`: as provided by GitHub when you created the OAuth app.
3. **Create a database and connect it**: go to the "Storage" tab in your Vercel project, create a [Postgres database](https://vercel.com/docs/storage/vercel-postgres) and connect it.
4. **Pull the repo locally and install dependencies**: git clone the repository you forked in step 2, then run `npm install`.
5. **Create the tables**: [link your project](https://vercel.com/docs/cli/project-linking) with `vercel link`, then run `vercel env pull .env.local`, which should copy all the environment variables from your Vercel project into the `.env.local` file. Now run `npx drizzle-kit migrate` to create the tables in your Vercel Posgres database.
6. **Update your GitHub OAuth app**: go back to your GitHub Oauth app settings and update the authorization callback URL to be something like `https://example.vercel.app/api/auth/github`, replacing `https://example.vercel.app` with the URL of your Vercel project.
7. **Test it**: go to the URL provided by Vercel for your project and try to log in with your GitHub account.

 ## Development

 TO run the app locally, you'll still need a Vercel database. Follow the steps above ("Deploy on Vercel") and then do the following:

1. **Create a new GitHub Oauth app**: same steps as above, however the authorization callback URL should be `https://localhost:3000`. You can name the app differently (e.g. "Pages CMS (dev)").
2. **Update your environment variables**: update the values of `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in the `.env.local` file with the values you got from new GitHub OAuth app.
3. **Migrate Database** `npx drizzle-kit migrate`
4. **Run it**: `npm run dev`

If you want to use different databases for development, create a new one on Vercel and update the  environment variables in the `.env.local` file.

## License

Everything in this repo is released under the [MIT License](LICENSE).