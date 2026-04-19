<!-- generated-by: gsd-doc-writer -->
# Configuration

Bullshit Bingo is a Cloudflare Workers + Durable Objects application. There are no traditional environment variables — all runtime configuration is expressed through `wrangler.jsonc` bindings and in-code constants. Identity and preferences are persisted client-side only (no server-side session store).

---

## Environment Variables

This project has **no `.env` file and no `process.env` usage**. The Cloudflare Workers runtime does not use Node.js environment variables. Configuration is provided through Wrangler bindings declared in `wrangler.jsonc`.

If you add secrets in a future phase (e.g., a signing key), they would be set via:

```bash
wrangler secret put SECRET_NAME
```

<!-- VERIFY: Secret names and any future environment variable requirements added post-initial-build -->

---

## Config File Format

All runtime binding configuration lives in `wrangler.jsonc` at the project root.

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "bs-bingo",
  "main": "src/worker.ts",
  "compatibility_date": "2026-04-01",
  "compatibility_flags": ["nodejs_als"],
  "assets": { "binding": "ASSETS", "directory": ".svelte-kit/cloudflare" },
  "durable_objects": {
    "bindings": [
      { "name": "GameRoom", "class_name": "GameRoom" }
    ]
  },
  "migrations": [
    { "tag": "v1", "new_sqlite_classes": ["GameRoom"] }
  ]
}
```

| Key | Description |
|-----|-------------|
| `name` | Cloudflare Workers project name (`bs-bingo`) |
| `main` | Entry point served to the Workers runtime |
| `compatibility_date` | Workers runtime feature flag date |
| `compatibility_flags` | `nodejs_als` enables Node.js AsyncLocalStorage in the runtime |
| `assets.binding` | Binding name for the static SvelteKit output (`ASSETS`) |
| `assets.directory` | Build output directory served as static assets |
| `durable_objects.bindings` | Registers `GameRoom` Durable Object class under the binding name `GameRoom` |
| `migrations` | SQLite-backed DO migration tag; required to activate `new_sqlite_classes` |

---

## Required vs Optional Settings

### Required (deployment will not function without these)

| Setting | Where | Effect if missing |
|---------|-------|-------------------|
| `GameRoom` DO binding | `wrangler.jsonc` | Worker cannot route WebSocket connections; all room creation and gameplay fails |
| `ASSETS` binding | `wrangler.jsonc` | Static SvelteKit UI is not served |
| `compatibility_date` | `wrangler.jsonc` | Wrangler refuses to deploy without a date |

### Optional / Defaulted

No optional environment variables exist at this time. All application-level defaults are hard-coded constants (see [In-Code Constants](#in-code-constants) below).

---

## In-Code Constants

These values control game behaviour and are defined directly in source. Changing them requires a redeploy.

| Constant | File | Default | Description |
|----------|------|---------|-------------|
| `MIN_WORDS_TO_START` | `src/lib/protocol/messages.ts` | `5` | Minimum word-pool size before the host can start a game |
| `MAX_WORDS` | `party/game-room.ts` | `200` | Maximum words allowed in the pool per room |
| `IDLE_TTL_MS` | `party/game-room.ts` | `1_800_000` (30 min) | Milliseconds before an idle room is reaped |
| `SLOT_HOLD_MS` | `party/game-room.ts` | `45_000` (45 s) | Grace window for a disconnected player to reconnect before their slot is released |
| `DEFAULT_GRID_SIZE` | `src/lib/stores/room.svelte.ts` | `3` | Fallback grid size used client-side before the server confirms board dimensions |

### Grid tier thresholds (`src/lib/util/gridTier.ts`)

| Grid | Words required |
|------|---------------|
| 3×3  | 5 (minimum to start) |
| 4×4  | 12 |
| 5×5  | 21 |

### Room code alphabet (`src/lib/util/roomCode.ts`)

Room codes are 6 characters drawn from a visually unambiguous alphabet that excludes `0`, `O`, `1`, `I`, `L`:

```
ABCDEFGHJKMNPQRSTUVWXYZ23456789
```

---

## Client-Side Storage

No server-side session store exists. All player identity and preferences are persisted in the browser.

| Key | Storage | Shape | Description |
|-----|---------|-------|-------------|
| `bsbingo_player_{code}` | `sessionStorage` | `{ playerId: string, displayName: string }` | Per-room player identity (nanoid ID + chosen display name). Cleared when the tab closes. |
| `theme` | `localStorage` | `"sfw"` \| `"nsfw"` | UI content mode. Defaults to `"sfw"` on first visit and when an invalid value is stored. |

---

## Starter Word Packs

Three built-in word packs are available in the lobby. They are defined server-side only in `src/lib/util/starterPacks.ts` and are never bundled into the client.

| Pack ID | Words |
|---------|-------|
| `corporate-classics` | 18 words (e.g., "Circle back", "Low-hanging fruit") |
| `agile` | 17 words (e.g., "Sprint", "Story points", "Retrospective") |
| `it-jargon` | 18 words (e.g., "Tech debt", "Microservices", "Observability") |

---

## Per-Environment Overrides

There are no `.env.development` or `.env.production` files. The two runtime environments differ only in the Workers host used by the WebSocket client:

- **Local dev** (`wrangler dev`): PartySocket connects to `localhost:8787` (inferred from `window.location.host`).
- **Production** (`wrangler deploy`): PartySocket connects to the Cloudflare Workers hostname (same inference — no code change needed).

<!-- VERIFY: Production Workers hostname / custom domain if one is configured in the Cloudflare dashboard -->
