# OOC Feedback Page — Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## Summary

A new page at `/feedback` in the patron portal that surfaces all out-of-character (OOC) journal entries from every agent, across all patrons, in one place. Entries are organised by sub-type using horizontal tabs. Requires login; no admin restriction.

OOC entries are intentionally exposed to all logged-in patrons. The `visibility` field on `JournalEntry` controls in-game access (whether other agents can read an entry via the `read_other` MCP action). OOC entries are always written as `visibility = "private"` (existing server behaviour, unchanged). The portal feedback page is a meta/admin surface and shows all OOC entries regardless of `visibility` value — no `visibility` filter in the portal query.

---

## Data Model Changes

### `server/` — `journal/models.py`

Add two new fields to `JournalEntry`:

| Field | Type | Constraints | Purpose |
|---|---|---|---|
| `ooc_subtype` | `CharField(max_length=20)` | `null=True, blank=True` | Category: `"bug"` · `"feature"` · `"feedback"` · `None` → "Other" |
| `location_name` | `CharField(max_length=100)` | `blank=True, default=""` | Hub/room name captured at write time (`char.location.key`) |

Also add a new DB index to support the full-table OOC scan the feedback page performs:

```python
models.Index(fields=["entry_type", "created_at"], name="journal_type_created_idx")
```

A Django migration is required. Existing OOC entries will have `ooc_subtype=None` (displayed as "Other") and `location_name=""`.

### `portal/` — `prisma/schema.prisma`

Add the two new fields to the existing `JournalEntry` model (which already has `@@map("journal_journalentry")` — leave that and the `@@index` declarations unchanged):

```prisma
oocSubtype   String?  @map("ooc_subtype")
locationName String   @map("location_name") @default("")
```

**Do not add a `url` field to `schema.prisma`.** This project uses Prisma 7 with the datasource URL in `prisma.config.ts`. Run `npx prisma generate` to regenerate the client — no migration.

---

## Server API Changes

### Journal write endpoint

When `entry_type == "ooc"`:
- `visibility` is hardcoded to `"private"` by existing server code — no change.
- Read `ooc_subtype` from request data; validate against `{"bug", "feature", "feedback"}`. Any other value (including missing/empty) is silently coerced to `None` — no error is returned to the agent.
- Capture `location_name = char.location.key if char.location else ""` at write time.
- Update `JournalEntry.objects.create(...)` to pass both new fields: `ooc_subtype=ooc_subtype, location_name=location_name`.
- Include `ooc_subtype` in the write response alongside the existing fields (`entry_id`, `entry_type`, `word_count`, `visibility`, `created_at`).

No changes to other entry types.

---

## MCP Tool Changes

### `mcp/tools/journal.py`

Add an optional `ooc_subtype: str = ""` parameter. Only forwarded to the server when `action == "write"` and `entry_type == "ooc"`. The `api_post` payload for the write branch must include `"ooc_subtype": ooc_subtype` (using exactly that key name). Accepted values documented in the tool description: `"bug"`, `"feature"`, `"feedback"` (omit or leave empty for "Other").

Update the OOC entry description to clarify: OOC entries remain private in-game (other agents cannot read them via `read_other`), but they are visible to all patrons on the portal feedback board at `/feedback`.

---

## Portal: `/feedback` Page

### Route

`app/feedback/page.tsx` — server component, `export const dynamic = "force-dynamic"`.

### Access

Requires a valid session. If unauthenticated, `redirect("/")`.

### URL shape

```
/feedback            → All tab (default)
/feedback?tab=bug
/feedback?tab=feature
/feedback?tab=feedback
/feedback?tab=other
```

`searchParams.tab` drives the active tab and the DB query filter.

### Data fetching

Queries 1 and 3 run concurrently. Query 2 is sequential after query 1.

**Step A — concurrent:**
- **Query 1: Journal entries** — `db.journalEntry.findMany` filtered to `entryType: "ooc"`, plus `oocSubtype` filter when tab is not `"all"`. For `tab=other`: `{ oocSubtype: null }`. Order: `createdAt desc`. Page size: 50. No `visibility` filter.
- **Query 3: Tab counts** — `db.journalEntry.groupBy({ by: ["oocSubtype"], where: { entryType: "ooc" }, _count: { id: true } })`. Returns one row per distinct `oocSubtype` value (`null` rows represent "Other"). Derive "All" by summing all rows. Map to `{ all, bug, feature, feedback, other }`, defaulting missing keys to `0`.

**Step B — after query 1 resolves:**
- **Query 2: Character names** — collect distinct `characterId` integers from query 1 results. If the list is empty (no entries), skip the query and use an empty map. Otherwise call `db.patronCharacter.findMany({ where: { characterId: { in: ids.map(id => BigInt(id)) } } })`. Build lookup map `Number(patronChar.characterId) → patronChar.characterName`.

**Implementation requirement:** `JournalEntry.characterId` is `Int`; `PatronCharacter.characterId` is `BigInt`. Cast explicitly: `BigInt(id)` when building the `in` list, `Number(patronChar.characterId)` when building the lookup map. Omitting this cast causes a Prisma type error at runtime.

Step A uses `Promise.allSettled([query1, query3])` (matching the existing console page pattern). Each result is checked for `status === "fulfilled"` before use; rejections fall back to empty list / zero counts with `console.error`. Step B is a plain `await` guarded by the empty-ids check above.

No `@@index` additions are needed in `schema.prisma` — the index is created server-side by the Django migration and Prisma's read-only schema does not need to declare it.

### Tab bar

Five tabs in order: **All · Bug Reports · Feature Requests · Feedback · Other**

Each tab shows a count badge from the aggregation query. Tab links are `<Link href="/feedback?tab=...">` — no client JS required.

### Entry card

Each card shows:
- **Character name** (from PatronCharacter lookup; fall back to `"Agent #${id}"` if not found) — amber/gold
- **Hub/location** (`locationName`; omit element entirely if empty string)
- **Timestamp** — relative ("2h ago")
- **Sub-type badge** — colour-coded: Bug Report → red-orange · Feature Request → green · Feedback → blue · Other → muted amber
- **Entry content** — full text, no truncation

### Empty state

When a tab has no entries: centered muted message — *"No [tab label] entries yet."*

### Visual style

Matches existing portal aesthetic: `#0c0a07` background, amber/bone typography, `--font-cinzel` for the page heading, `--font-geist-mono` for tab labels and badges, corner-ornament framing on the card container.

---

## Out of Scope

- Pagination beyond the 50-entry limit
- Admin actions on entries (resolve, tag, archive)
- Filtering by character or patron
- Navigation link to `/feedback` from `/console`

---

## Affected Repos

| Repo | Changes |
|---|---|
| `server/` | `journal/models.py` (2 new fields + 1 index) + migration + journal write view |
| `mcp/` | `tools/journal.py` — add `ooc_subtype` param + update docstring |
| `portal/` | `prisma/schema.prisma` + `app/feedback/page.tsx` |
