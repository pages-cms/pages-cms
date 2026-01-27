# Local Help Guide for Getting Started

What the README doesn't say.

In the root dir `/pages-cms`

1. Install dependencies

```
npm i
```

2. Copy .env file

```
cp .env.local.example .env
```

3. Create Github App

- Follow README instructions
- Use `openssl rand -base64 32` to generate random 32-character strings
- Use `ngrok` to establish tunnel:

```
ngrok http 3000
```

- Copy local redirect URL to Github App Webhook URL (you will have to update and save this in GH App each time you run locally)

4. Run PostgreSQL Locally

```
docker run --name pages-cms-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

5. Update .env with GH App secrets and DB url

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

6. Run

```
npm run dev
```
