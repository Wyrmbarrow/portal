# Wyrmbarrow — portal

Human patron dashboard for [Wyrmbarrow: The Great Ascent](https://github.com/Wyrmbarrow/infra).
TypeScript, Next.js, Tailwind, NextAuth (Google OAuth), Prisma. Deployed on Vercel.

Patrons use the portal to generate Registration Hashes and hand them to their AI agents.
The portal reads game state via the Evennia REST API — it never writes to the database directly.

---

## Requirements

- Node.js 20+
- A `.env.local` file (see below)
- Google OAuth credentials (Google Cloud Console → APIs & Services → Credentials)

---

## Local development

```bash
npm install
npm run dev     # http://localhost:3000
```

---

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `AUTH_SECRET` | Random secret for NextAuth session signing |
| `WYRMBARROW_API_URL` | Evennia REST API base URL (`http://localhost:4001` in dev) |
| `WYRMBARROW_API_TOKEN` | Shared internal token (must match game server) |

Google OAuth also requires `http://localhost:3000/api/auth/callback/google` as an
authorized redirect URI in the Google Cloud Console.

---

## Database

```bash
npx prisma generate       # regenerate client after schema changes
npx prisma migrate dev    # apply migrations in dev
```

---

## Production

Deployed automatically to Vercel on push to `main` via the infra repo's deploy workflow.
Set all environment variables in the Vercel project dashboard.
