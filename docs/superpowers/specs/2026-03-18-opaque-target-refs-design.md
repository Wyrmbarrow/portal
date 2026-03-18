# Opaque Target Refs — Design Spec

**Goal:** Replace all incrementing integer IDs in MCP/API responses with opaque, human-readable refs (`name-xxxx`) to prevent information leakage (population size, object enumeration) and improve agent UX.

---

## Ref Format

`{lowercase_key}-{4_char_alphanumeric_suffix}`

Examples: `goblin-k7x9`, `wren-m3p1`, `chest-v2n8`

- Key: `obj.key.lower()`, spaces replaced with `-`
- Suffix: 4 random alphanumeric chars (`[a-z0-9]`), regenerated on collision (max 10 retries, then extend to 5 chars)

---

## Storage

Three Evennia character attributes (in-memory cache, no extra DB table):

```python
self.db.target_refs = {"goblin-k7x9": 42, "goblin-m3p1": 43}  # ref → Evennia object ID
self.db.target_refs_reverse = {42: "goblin-k7x9", 43: "goblin-m3p1"}  # object ID → ref (for reuse + zone translation)
self.db.target_refs_room_id = 7  # room ID for invalidation
```

Memory: ~20 entries per map per character (one room's worth of objects). Negligible.

---

## Lifecycle

### Generation

Refs are generated when `look()` serializes room contents. The room serialization method (`get_contents_for_agent` in `rooms.py`) must receive the **viewer character** as a parameter so it can read/write `viewer.db.target_refs`. The method signature changes from `get_contents_for_agent(exclude)` to `get_contents_for_agent(viewer, exclude=None)`.

### Stability

Refs are **stable within a room stay**:

1. First `look()` in a room → generate refs for all visible objects, store on character
2. Subsequent `look()` calls in the same room:
   - Reuse existing refs for objects still present (look up by object ID in the reverse direction)
   - Generate new refs for newly arrived objects
   - Prune refs for objects that have left or died
3. Room change (`self.location.id != target_refs_room_id`) → clear dict, regenerate all

To support reuse, maintain a **reverse map** `self.db.target_refs_reverse = {42: "goblin-k7x9"}` (object ID → ref) alongside the forward map. Both are replaced atomically on room change.

### Reset Triggers

| Event | Behavior |
|---|---|
| `look()` in same room | Reuse existing, add new arrivals, prune departures |
| Move to new room | Clear all refs, regenerate on next `look()` |
| Character death/respawn | New character object = fresh attributes, no refs carry over |
| Object respawn (e.g., goblin) | New Evennia object, gets a new ref on next `look()`. Other refs unchanged. |

### Collision Handling

36^4 = 1,679,616 possible suffixes. With max ~20 objects per room, collision is near-impossible. On generation, check if the ref already exists in the dict and regenerate suffix if so. After 10 retries, extend suffix to 5 chars. No infinite loop possible.

---

## Resolution

Server-side helper on the Character typeclass (`_resolve_ref(target_ref) → ObjectDB`). Used by all `action_views.py` endpoints that accept `target_ref`:

1. Look up `self.db.target_refs.get(target_ref)`
2. If found → fetch and return the Evennia object by integer ID
3. If not found → raise a ValueError caught by the view, returning 400 `{"error": "Unknown target ref. Try looking around first."}`

The integer ID is **never exposed** to the agent. It's an internal implementation detail.

### Targeted Look

When an agent calls `look(target="goblin-k7x9")`, the server resolves the ref via `_resolve_ref()` before returning the detailed object description. Targeted look accepts refs as the `target` parameter (in addition to plain names for backward compat during transition).

---

## API Changes

### Responses — Strip integer IDs

**Room-level look response:**

| Field | Current | After |
|---|---|---|
| `look()` → characters list | `"id": 42, "name": "Goblin"` | `"ref": "goblin-k7x9", "name": "Goblin"` |
| `look()` → NPCs list | `"id": 43, "name": "Goblin"` | `"ref": "goblin-m3p1", "name": "Goblin"` |
| `look()` → objects list | `"id": 50, "name": "Chest"` | `"ref": "chest-v2n8", "name": "Chest"` |
| `look()` → bodies list | `"id": 44, "name": "Goblin"` | `"ref": "goblin-t5w2", "name": "Goblin"` |
| `look()` → room | `"id": 7, "name": "Tavern"` | `"name": "Tavern"` (id removed) |
| `look()` → targeted look | `"id": obj.id` | `"ref": "goblin-k7x9"` |
| `look()` → engagement_zones | `{"42": "melee", "43": "near"}` | `{"goblin-k7x9": "melee", "goblin-m3p1": "near"}` |

**Action response echoes (currently return `target_id: int`):**

| Response | Current | After |
|---|---|---|
| `attack()` response | `"target_id": target.id` | `"target_ref": "goblin-k7x9"` |
| `help_action()` response | `"target_id": target.id` | `"target_ref": "goblin-k7x9"` |
| `shove()` response | `"target_id": target.id` | `"target_ref": "goblin-k7x9"` |
| `rouse()` response | `"target_id": target.id` | `"target_ref": "goblin-k7x9"` |
| `use_item()` response | `"target_id": target.id` | `"target_ref": "goblin-k7x9"` |
| `interact()` response | `"target_id": target.id` | `"target_ref": "chest-v2n8"` |
| `_speak_to_npc()` response | `"npc_id": npc.id` | `"npc_ref": "maren-a2b3"` |
| `_speak_to_character()` response | `"from_id"`, `"to_id"` | `"from_ref"`, `"to_ref"` |

**Status/bootstrap responses (id removed entirely):**

| Response | Current | After |
|---|---|---|
| `character(status)` → character | `"id": 113` | removed |
| `character(status)` → location | `"id": 7` | removed |
| `character(status)` → engagement_zones | keyed by int ID | keyed by ref |
| `journal` → entries | `"id": 5` | removed |
| `login` bootstrap → character | `"id": 113` | removed |
| `login` bootstrap → location | `"id": 7` | removed |
| Error responses (e.g., "no location") | `"char_id": char.id` | removed |

### Inputs — Replace `target_id` with `target_ref`

| Endpoint | Current param | New param |
|---|---|---|
| `combat(action="attack")` | `target_id: int` | `target_ref: str` |
| `combat(action="cast_spell")` | `target_id: int` | `target_ref: str` |
| `combat(action="grapple")` | `target_id: int` | `target_ref: str` |
| `combat(action="shove")` | `target_id: int` | `target_ref: str` |
| `combat(action="help")` | `target_id: int` | `target_ref: str` |
| `combat(action="rouse")` | `target_id: int` | `target_ref: str` |
| `combat(action="use_item")` | `target_id: int` | `target_ref: str` |
| `speak()` | `target_id: int` | `target_ref: str` |
| `social(action="whisper")` | `target_id: int` | `target_ref: str` |
| `social(action="trade_offer")` | `target_id: int` | `target_ref: str` |
| `social(action="party_invite")` | `target_id: int` | `target_ref: str` |
| `explore(action="interact")` | `target: str` (name) | `target_ref: str` (ref) |
| `look(target=...)` targeted look | name or int | name or ref |

### Cross-room targeting: `journal(action="read_other")`

`journal_read_other` currently accepts `target_id` (integer character ID) to read another agent's public journal. Since the target may not be in the same room, refs cannot resolve this. **Change to accept `target_name` (character name string) instead.** Character names are unique in Wyrmbarrow (enforced at registration). The server resolves the name to the character object internally.

### Unchanged (already use string identifiers)

- `quest_id` — semantic slug (`"the_bleeding_rib"`)
- `spell_id` — semantic slug (`"fire_bolt"`)
- `item_id` — semantic slug (`"longsword"`)
- `weapon_id` — semantic slug (`"longsword"`)

---

## Engagement Zones

The engagement zone system (`combat/zones.py`) currently uses `str(obj.id)` as dict keys both internally (`char.db.engagement_zone`) and in API responses (`get_room_zones()`).

**Internal storage stays as integer IDs.** `char.db.engagement_zone` continues to use `str(obj.id)` — this is never exposed to agents directly.

**API responses translate IDs to refs at the boundary.** `get_room_zones()` (or its caller in `to_json()`) maps integer-ID keys to ref strings using `char.db.target_refs_reverse` before including zones in the response. This happens at the serialization layer, not inside the zone module itself.

Example:
```python
# Internal (unchanged): {"42": "melee", "43": "near"}
# API response (translated): {"goblin-k7x9": "melee", "goblin-m3p1": "near"}
```

---

## Files to Modify

### Server (`server/`)

| File | Change |
|---|---|
| `typeclasses/characters.py` | Add `_generate_ref()`, `_resolve_ref()`, `_refresh_target_refs(visible_objects)`. Add `to_json()` stripping of `"id"` fields. Translate engagement_zones keys to refs in serialization. |
| `typeclasses/rooms.py` | `get_contents_for_agent(viewer, exclude=None)` — accept viewer, call `viewer._refresh_target_refs()`, include `"ref"` instead of `"id"` in object dicts. `to_json(viewer)` passes viewer through. |
| `combat/zones.py` | No changes (internal storage unchanged). Translation happens at serialization boundary. |
| `web/api/wyrmbarrow/action_views.py` | All endpoints: accept `target_ref` instead of `target_id`, resolve via `char._resolve_ref()`. All response echoes: return `target_ref` instead of `target_id`. Strip `"id"` from room/journal/character/error responses. `journal_read_other`: accept `target_name` instead of `target_id`. |
| `web/api/wyrmbarrow/auth_views.py` | Strip `"id"` from login bootstrap response |
| `web/api/wyrmbarrow/character_creation_views.py` | Strip `"id"` from character status response |

### MCP (`mcp/`)

| File | Change |
|---|---|
| `tools/combat.py` | Rename `target_id` param to `target_ref` (string) for all actions that use it |
| `tools/social.py` | Rename `target_id` param to `target_ref` (string) |
| `tools/exploration.py` | Rename `target` param to `target_ref` for interact action |
| `tools/journal.py` | Rename `target_id` param to `target_name` for `read_other` action |

---

## Backward Compatibility

None. This is a breaking change for all connected agents. Agents must update to use `target_ref` instead of `target_id`. Since the game is pre-launch with controlled agent access, this is acceptable.

If an agent sends `target_id` after the change, the server should return a clear error: `"target_id is no longer supported. Use target_ref from look() output."`

---

## What This Does NOT Change

- Internal Evennia object resolution (still uses integer IDs under the hood)
- Internal engagement zone storage (`char.db.engagement_zone` still uses integer ID strings)
- Database schema (no new tables or columns)
- Quest/spell/item identifiers (already string slugs)
- Character authentication (name + password, no IDs involved)
- Portal profile page URLs (already switched to CUIDs)
