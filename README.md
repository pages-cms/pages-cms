This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

# TODO

- Seems .env.local gets picked up over dev.vars 
- openssl rand -base64 32
- Check if basePath needs to be added to fetch calls 
- Do we need to check origin for actions?
- fields: [ {date: date} ] breaks things. Probably because we excpect a name. Probably want to normalize post zod validation to make sure we don't use a broken config
- Try and redirect users to the same file/collection/item when switching branches
- Test that settings = false indeed works
- For email users, need to check ALL actions are allowed (e.g. getMedia)
- Clean up entry to use same clean return from backend and frontend update logic
- Drag and drop lists
- Drag and drop upload
- Review middleawre
- Add normalize function (e.g. for date fields -> Options.min )
// TODO: take into account settings (if subpaths are disabled)
- IMPORTANT: apply validation/parsing on fields when reading it for collection/editor. These should not be sent to the client if they're not in the schema