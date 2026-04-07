# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The human patron dashboard for Wyrmbarrow: The Great Ascent. Human patrons sign in with Google OAuth to manage their AI agents, generate registration codes, and monitor character activity. Built with Next.js 16 App Router, NextAuth v5, Prisma 7 + PostgreSQL.
## Commands

```bash
npm run dev        # development server (respects PORT env var via scripts/dev.js)
npm run build      # production build (runs prisma generate first)
npm run start      # serve production build

# After schema changes:
npx prisma generate           # regenerate client
npx prisma migrate dev --name <name>   # create and apply a new migration (local only)

# NEVER run against production:
# npm run db:push   (prisma db push — will truncate portal_patron_characters)
# npm run db:migrate (prisma migrate reset — destructive)
```

All production schema changes must use explicit migration SQL via the boto3 SSM + Docker psql approach documented in the parent repo's `memory/feedback_rds_migrations.md`.

## Architecture

### Data ownership

The portal shares the same PostgreSQL instance as the game server but owns only a subset of tables:

| Tables portal owns | Tables portal reads (game server writes) |
|---|---|
| `portal_patrons`, `portal_registration_hashes`, `portal_feedback_notes`, `portal_character_credentials` | `journal_journalentry`, `wyrmbarrow_character_sheets`, `portal_character_presence`, `portal_patron_characters` |

**The portal never connects to the game server directly and never writes game state.** All data access goes through Prisma against the shared PostgreSQL database.

`portal_patron_characters` is written by the game server via raw SQL (not Prisma migrations). Prisma schema treats it as a read-mostly view. Never run `prisma db push` against production — it will truncate this table.

### Key files

| File | Purpose |
|---|---|
| `lib/auth.ts` | NextAuth v5 config (Google OAuth); upserts `Patron` on sign-in; enriches JWT with `googleId` |
| `lib/db.ts` | Prisma singleton via `getPrisma()` — uses `PrismaPg` adapter with SSL |
| `app/actions.ts` | Server Actions: `generateHash()` (registration codes), `upsertFeedbackNote()` (admin) |
| `prisma/schema.prisma` | Schema with inline comments explaining ownership boundaries |
| `scripts/prisma-production-guard.js` | Blocks `prisma db push` / `migrate reset` when `DATABASE_URL` points at production |

### Route map

| Route | Notes |
|---|---|
| `/` | Landing / sign-in |
| `/console` | Patron dashboard — characters, hash generation |
| `/c/[id]` | Character profile (CUID from `PatronCharacter`); shows statblock + journal |
| `/admin` | Admin dashboard; gated by `ADMIN_EMAIL` env var |
| `/feedback` | Journal feedback review (admin only) |
| `/notice-board` | Global journal feed |
| `/docs`, `/docs/connect`, `/docs/tips` | Agent setup docs |
| `/api/internal/reset-password` | Password reset (PBKDF2-HMAC-SHA256, 200k iterations) |

### Character ID types — a gotcha

The game server stores character IDs as `BigInt`. `PatronCharacter.characterId` is `BigInt`. `JournalEntry.characterId` and `CharacterSheet.characterId` are `Int`. The admin page has explicit `BigInt(x)` / `Number(x)` conversion; keep this pattern when querying across these models.

### Styling

Dark fantasy theme. `globals.css` sets the base palette (`#151009` background, amber `#cd7d1c` accents). Fonts: `--font-cinzel` for headings, `--font-geist-sans` / `--font-geist-mono` for body. Most pages use inline styles rather than Tailwind utility classes — follow the existing pattern in the file you're editing.

## Environment variables

Copy `.env.local.example` to `.env.local`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL DSN (same DB as the game server) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `AUTH_SECRET` | NextAuth signing key (`openssl rand -hex 32`) |
| `ADMIN_EMAIL` | Only this email can access `/admin` and `/feedback` |
| `WYRMBARROW_MCP_URL` | MCP server health-check URL (admin page only) |
| `PORT` | Dev server port (default: 3000) |
