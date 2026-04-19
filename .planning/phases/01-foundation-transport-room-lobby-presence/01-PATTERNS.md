# Phase 1: Foundation — Transport, Room, Lobby, Presence - Pattern Map

**Mapped:** 2026-04-16
**Files analyzed:** 27 (new files to be created in this phase)
**Analogs found:** 0 / 27 — greenfield project; all patterns sourced from RESEARCH.md seed patterns

> This is a greenfield project. The `bs-bingo/` directory contains only `.planning/` documentation.
> There is no `src/`, no `party/`, no `package.json`, no existing components.
> No codebase analog search was performed — it would yield zero results.
> Every pattern below is a **seed pattern** drawn directly from `01-RESEARCH.md` and `01-UI-SPEC.md`.
> The planner should treat these excerpts as the canonical "copy from" reference for each file.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `wrangler.jsonc` | config | — | none | greenfield |
| `svelte.config.js` | config | — | none | greenfield |
| `vite.config.ts` | config | — | none | greenfield |
| `src/app.d.ts` | config | — | none | greenfield |
| `src/app.css` | config | — | none | greenfield |
| `src/hooks.server.ts` | middleware | request-response | none | greenfield |
| `src/routes/+layout.svelte` | component | — | none | greenfield |
| `src/routes/+layout.ts` | config | — | none | greenfield |
| `src/routes/+page.svelte` | component | request-response | none | greenfield |
| `src/routes/+error.svelte` | component | — | none | greenfield |
| `src/routes/api/rooms/+server.ts` | controller | request-response | none | greenfield |
| `src/routes/api/rooms/[code]/exists/+server.ts` | controller | request-response | none | greenfield |
| `src/routes/join/[code]/+page.svelte` | component | request-response | none | greenfield |
| `src/routes/join/[code]/+page.server.ts` | controller | request-response | none | greenfield |
| `src/routes/room/[code]/+page.svelte` | component | event-driven | none | greenfield |
| `src/routes/room/[code]/+page.server.ts` | controller | request-response | none | greenfield |
| `src/lib/components/Button.svelte` | component | — | none | greenfield |
| `src/lib/components/TextInput.svelte` | component | — | none | greenfield |
| `src/lib/components/Modal.svelte` | component | — | none | greenfield |
| `src/lib/components/Badge.svelte` | component | — | none | greenfield |
| `src/lib/components/PlayerRow.svelte` | component | — | none | greenfield |
| `src/lib/components/Banner.svelte` | component | — | none | greenfield |
| `src/lib/components/ErrorPage.svelte` | component | — | none | greenfield |
| `src/lib/stores/room.svelte.ts` | store | event-driven | none | greenfield |
| `src/lib/protocol/messages.ts` | model | — | none | greenfield |
| `src/lib/util/roomCode.ts` | utility | — | none | greenfield |
| `src/lib/util/playerColor.ts` | utility | — | none | greenfield |
| `src/lib/util/initials.ts` | utility | — | none | greenfield |
| `src/lib/session.ts` | utility | — | none | greenfield |
| `party/game-room.ts` | service | event-driven | none | greenfield |

---

## Pattern Assignments

### `wrangler.jsonc` (config)

**Seed pattern source:** `01-RESEARCH.md` §Code Examples — wrangler.jsonc (authoritative)

**Critical notes:**
- Use `new_sqlite_classes` (NOT `new_classes`) — see RESEARCH.md Pitfall 1
- `static options = { hibernate: true }` requires `new_sqlite_classes` in the migration

**Full pattern to copy:**
```jsonc
{
  "name": "bs-bingo",
  "main": ".svelte-kit/cloudflare/_worker.js",
  "compatibility_date": "2026-04-01",
  "compatibility_flags": ["nodejs_als"],
  "assets": { "binding": "ASSETS", "directory": ".svelte-kit/cloudflare" },
  "durable_objects": {
    "bindings": [
      { "name": "GameRoom", "class_name": "GameRoom" }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["GameRoom"]
    }
  ]
}
```

---

### `vite.config.ts` (config)

**Seed pattern source:** `01-RESEARCH.md` §Code Examples — Tailwind v4 setup

**Pattern to copy:**
```ts
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

---

### `src/app.d.ts` (config)

**Seed pattern source:** `01-RESEARCH.md` §Code Examples — `src/app.d.ts`

**Pattern to copy:**
```ts
import type { DurableObjectNamespace } from "@cloudflare/workers-types";
declare global {
  namespace App {
    interface Platform {
      env: {
        GameRoom: DurableObjectNamespace;
      };
    }
  }
}
export {};
```

---

### `src/app.css` (config)

**Seed pattern source:** `01-RESEARCH.md` §Code Examples — Tailwind v4 setup; `01-UI-SPEC.md` §Color

**Pattern to copy:**
```css
@import "tailwindcss";

@theme {
  --color-bg:           #0F0F14;
  --color-surface:      #1A1A23;
  --color-divider:      #2A2A36;
  --color-accent:       #F5D547;
  --color-destructive:  #F87171;
  --color-ink-primary:  #F5F5F7;
  --color-ink-secondary:#A1A1AA;
  --color-ink-inverse:  #0F0F14;
  --font-sans: "Inter Variable", system-ui, sans-serif;
  --font-display: "Space Grotesk Variable", "Inter Variable", sans-serif;
}
```

**Additional tokens to add per `01-UI-SPEC.md`:**
- `--color-ink-disabled: #52525B` (for disabled Start Game button label)
- `--color-avatar-*` for the 8 player-avatar colors if Tailwind utilities are needed on them

---

### `src/routes/+layout.ts` (config)

**Seed pattern source:** `01-RESEARCH.md` Pitfall 3 — SvelteKit SSR must be disabled

**Pattern to copy:**
```ts
// Disable SSR — app runs as SPA; PartySocket needs browser's WebSocket API
export const ssr = false;
export const prerender = false;
export const csr = true;
```

---

### `src/routes/+layout.svelte` (component)

**Seed pattern source:** `01-RESEARCH.md` §Recommended Project Structure; `01-UI-SPEC.md` §Component Inventory (Banner)

**Role:** Imports `app.css`, renders the `Banner` component slot when the WebSocket is disconnected. The Banner is the only global overlay in Phase 1.

**Pattern:**
```svelte
<script lang="ts">
  import "../app.css";
  import "@fontsource-variable/inter";
  import "@fontsource-variable/space-grotesk";
  import Banner from "$lib/components/Banner.svelte";
</script>

<!-- Banner renders globally; it reads WebSocket status from the room store -->
<Banner />
<slot />
```

---

### `src/routes/api/rooms/+server.ts` (controller, request-response)

**Seed pattern source:** `01-RESEARCH.md` §Code Examples — Create-room endpoint

**Critical notes:**
- Room code MUST be generated server-side (never client-side) — see RESEARCH.md Architectural Responsibility Map
- Include 3-iteration collision check-and-retry loop
- Return `{ code, shareUrl }` JSON

**Pattern to copy:**
```ts
import { json, error } from "@sveltejs/kit";
import { customAlphabet } from "nanoid";
import type { RequestHandler } from "./$types";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const makeCode = customAlphabet(ROOM_CODE_ALPHABET, 6);

export const POST: RequestHandler = async ({ platform, url }) => {
  if (!platform?.env) error(500, "Platform unavailable");
  const env = platform.env;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const stub = env.GameRoom.get(env.GameRoom.idFromName(code));
    const res = await stub.fetch(`https://do/exists`).catch(() => null);
    if (!res || !res.ok) {
      return json({ code, shareUrl: `${url.origin}/join/${code}` });
    }
  }
  error(500, "Could not allocate a room code");
};
```

---

### `src/routes/api/rooms/[code]/exists/+server.ts` (controller, request-response)

**Seed pattern source:** `01-RESEARCH.md` §Code Examples — Room existence check pattern; proxies to the DO's `onRequest`

**Pattern to copy:**
```ts
import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, platform }) => {
  if (!platform?.env) error(500, "Platform unavailable");
  const stub = platform.env.GameRoom.get(
    platform.env.GameRoom.idFromName(params.code)
  );
  const res = await stub.fetch(`https://do/exists`).catch(() => null);
  if (!res || !res.ok) error(404, { message: "Room not found" });
  return res!;
};
```

---

### `src/routes/join/[code]/+page.server.ts` (controller, request-response)

**Seed pattern source:** `01-RESEARCH.md` §Code Examples — Room existence check (for `/join/[code]` load)

**Pattern to copy:**
```ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, platform }) => {
  if (!platform?.env) error(500, "Platform unavailable");
  const stub = platform.env.GameRoom.get(
    platform.env.GameRoom.idFromName(params.code)
  );
  const res = await stub.fetch(`https://do/exists`).catch(() => null);
  if (!res || !res.ok) error(404, { message: "Room not found" });
  return { code: params.code };
};
```

---

### `src/routes/join/[code]/+page.svelte` (component, request-response)

**Seed pattern source:** `01-RESEARCH.md` §Data-flow trace (step 3 — browser navigates to `/room/[code]` after name capture); `01-UI-SPEC.md` §Display name modal

**Role:** Receives `code` from `+page.server.ts` load, pre-fills the join code in state, opens the display-name modal immediately, then on submit stores `{playerId, displayName}` via `session.ts` and calls `goto("/room/{code}")`.

**Key implementation notes:**
- Do NOT instantiate `PartySocket` here — that lives only in `room.svelte.ts`
- Guard `sessionStorage` access behind `if (browser)` from `$app/environment`

---

### `src/routes/room/[code]/+page.server.ts` (controller, request-response)

**Seed pattern source:** Same pattern as `/join/[code]/+page.server.ts` above — ping the DO, throw `error(404)` if dead

**Pattern:** Identical structure to the join load function. Returns `{ code: params.code }` on success.

---

### `src/routes/room/[code]/+page.svelte` (component, event-driven)

**Seed pattern source:** `01-RESEARCH.md` Pattern 3 — `createRoomStore` usage; `01-UI-SPEC.md` §Screen-by-Screen Checklist (Lobby)

**Role:** Lobby screen. Instantiates `createRoomStore(code)` inside `onMount`, subscribes to `state` and `status` rune values, renders the roster, copy buttons, and Start Game button.

**Key implementation notes:**
- Call `createRoomStore(code)` inside `onMount` — never at module level (SSR guard per RESEARCH.md Pitfall 3)
- Display room code with Space Grotesk `font-display` + accent color + `tracking-[0.1em]`
- Clipboard API copy: feature-detect `navigator.clipboard`; fall back gracefully (Pitfall 7)
- Roster: `{#each state.players as player (player.playerId)}` — key by `playerId` for stable DOM
- `Banner` is in the layout; the lobby page passes `status` from the store up or reads it from a shared store

---

### `src/routes/+error.svelte` (component)

**Seed pattern source:** `01-UI-SPEC.md` §Screen-by-Screen Checklist (Error page); `01-RESEARCH.md` §SESS-07

**Role:** SvelteKit's global error page. Reads `$page.error.message`. Renders `ErrorPage` component with the "Room not found" copy and "Create a new game" CTA that links to `/`.

---

### `src/lib/protocol/messages.ts` (model)

**Seed pattern source:** `01-RESEARCH.md` Pattern 6 — Valibot shared protocol

**This is the single source of truth for the wire format. Both `party/game-room.ts` and `room.svelte.ts` import from here.**

**Full pattern to copy:**
```ts
import * as v from "valibot";

export const Player = v.object({
  playerId: v.pipe(v.string(), v.minLength(1)),
  displayName: v.pipe(v.string(), v.minLength(1), v.maxLength(20)),
  isHost: v.boolean(),
  joinedAt: v.number(),
});
export type Player = v.InferOutput<typeof Player>;

export const RoomState = v.object({
  code: v.string(),
  phase: v.literal("lobby"),
  hostId: v.nullable(v.string()),
  players: v.array(Player),
});
export type RoomState = v.InferOutput<typeof RoomState>;

export const ClientMessage = v.variant("type", [
  v.object({
    type: v.literal("hello"),
    playerId: v.pipe(v.string(), v.minLength(1)),
    displayName: v.pipe(v.string(), v.minLength(1), v.maxLength(20)),
  }),
  v.object({ type: v.literal("ping") }),
]);
export type ClientMessage = v.InferOutput<typeof ClientMessage>;

export const ServerMessage = v.variant("type", [
  v.object({ type: v.literal("roomState"), state: RoomState }),
  v.object({ type: v.literal("playerJoined"), player: Player }),
  v.object({ type: v.literal("playerLeft"), playerId: v.string() }),
  v.object({ type: v.literal("error"), code: v.string(), message: v.optional(v.string()) }),
  v.object({ type: v.literal("pong") }),
]);
export type ServerMessage = v.InferOutput<typeof ServerMessage>;
```

---

### `src/lib/stores/room.svelte.ts` (store, event-driven)

**Seed pattern source:** `01-RESEARCH.md` Pattern 3 — Svelte 5 `.svelte.ts` module store wrapping PartySocket

**Critical notes:**
- File MUST use `.svelte.ts` extension so `$state` runes are legal
- Do NOT instantiate `PartySocket` at module top-level — only inside `createRoomStore()`
- The `party` name is `"game-room"` (kebab-cased binding) — see RESEARCH.md Pitfall 6
- Define `PARTY_NAME = "game-room"` as a shared constant (also imported by tests)

**Full pattern to copy:**
```ts
import { PartySocket } from "partysocket";
import * as v from "valibot";
import { ServerMessage, type RoomState } from "$lib/protocol/messages";
import { getOrCreatePlayer } from "$lib/session";

export const PARTY_NAME = "game-room";

export function createRoomStore(code: string) {
  const player = getOrCreatePlayer(code);

  let state = $state<RoomState | null>(null);
  let status = $state<"connecting" | "open" | "reconnecting" | "closed">("connecting");

  const ws = new PartySocket({
    party: PARTY_NAME,
    room: code,
  });

  ws.addEventListener("open", () => {
    status = "open";
    ws.send(JSON.stringify({
      type: "hello",
      playerId: player.playerId,
      displayName: player.displayName,
    }));
  });

  ws.addEventListener("close", () => { status = "reconnecting"; });
  ws.addEventListener("error", () => { status = "reconnecting"; });

  ws.addEventListener("message", (ev) => {
    const parsed = v.safeParse(ServerMessage, JSON.parse(ev.data));
    if (!parsed.success) return;
    const msg = parsed.output;
    switch (msg.type) {
      case "roomState":    state = msg.state; break;
      case "playerJoined": if (state) state.players = [...state.players, msg.player]; break;
      case "playerLeft":   if (state) state.players = state.players.filter(p => p.playerId !== msg.playerId); break;
    }
  });

  return {
    get state() { return state; },
    get status() { return status; },
    disconnect() { ws.close(); },
  };
}
```

---

### `src/lib/session.ts` (utility)

**Seed pattern source:** `01-RESEARCH.md` Pattern 5 — Session identity decoupled from socket

**Critical notes:**
- `getOrCreatePlayer(code)` is the ONLY place a `playerId` is ever minted
- Key format: `bsbingo_player_{code}`
- Phase 5 RESI-01 depends on this `playerId` already being in `sessionStorage`

**Full pattern to copy:**
```ts
import { nanoid } from "nanoid";
type PlayerSession = { playerId: string; displayName: string };

export function getOrCreatePlayer(code: string): PlayerSession {
  const key = `bsbingo_player_${code}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return JSON.parse(existing);
  const p: PlayerSession = { playerId: nanoid(), displayName: "" };
  sessionStorage.setItem(key, JSON.stringify(p));
  return p;
}

export function setDisplayName(code: string, displayName: string): void {
  const key = `bsbingo_player_${code}`;
  const cur = getOrCreatePlayer(code);
  sessionStorage.setItem(key, JSON.stringify({ ...cur, displayName }));
}
```

---

### `src/lib/util/roomCode.ts` (utility)

**Seed pattern source:** `01-RESEARCH.md` Pattern 4 — Server-generated room code

**Note:** This module is imported by the server-side `+server.ts` handler. The alphabet constant should be the single canonical definition — the join code input's client-side validation also references it.

**Full pattern to copy:**
```ts
import { customAlphabet } from "nanoid";

// Per CONTEXT D-05/D-06: visually unambiguous — removes 0/O/1/I/L
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, 6);

/** Strip characters not in the unambiguous alphabet (for paste normalization on the join input). */
export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^ABCDEFGHJKMNPQRSTUVWXYZ23456789]/g, "");
}
```

---

### `src/lib/util/playerColor.ts` (utility)

**Seed pattern source:** `01-UI-SPEC.md` §Component Inventory — player-avatar color palette

**Role:** Deterministically maps a `playerId` string to one of 8 palette colors so the same player always gets the same avatar color across all clients.

**Pattern:**
```ts
const PLAYER_COLORS = [
  '#7DD3FC', '#FCA5A5', '#86EFAC', '#FDE68A',
  '#C4B5FD', '#F9A8D4', '#A5B4FC', '#FDBA74',
] as const;

/** Deterministic hash: same playerId → same color index on all clients. */
export function getPlayerColor(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
  }
  return PLAYER_COLORS[hash % PLAYER_COLORS.length];
}
```

---

### `src/lib/util/initials.ts` (utility)

**Seed pattern source:** inferred from `01-UI-SPEC.md` §Component Inventory (PlayerRow shows initials in color circle)

**Pattern:**
```ts
/** Extract up to 2 initials from a display name. */
export function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
```

---

### `party/game-room.ts` (service, event-driven)

**Seed pattern source:** `01-RESEARCH.md` Pattern 1 — PartyServer `Server` class with opt-in Hibernation

**Critical notes:**
- `static options = { hibernate: true }` MUST be present from the first commit (Pitfall 2)
- Import `ClientMessage` / `ServerMessage` / `RoomState` / `Player` from `../src/lib/protocol/messages`
- `v.safeParse` on EVERY inbound WS message — never trust client payloads
- Host is assigned to the first `hello` sender when `#players.size === 0 && #hostId === null` (Pitfall 8)
- `IDLE_TTL_MS = 30 * 60 * 1000` — configurable constant, ratify during planning
- `conn.setState({ playerId })` after hello so `onClose` can identify the leaver

**Full pattern to copy:** See `01-RESEARCH.md` Pattern 1 (lines 299–410) — the complete `GameRoom` class including `onStart`, `onConnect`, `onMessage`, `onClose`, `onAlarm`, `onRequest`, and `#snapshot()`.

**Worker entry (wraps SvelteKit + PartyServer):** See `01-RESEARCH.md` Pattern 2 (lines 418–443) — `routePartykitRequest` first, then fall through to SvelteKit's `_worker.js`. Confirm exact `adapter-cloudflare` composition approach early (RESEARCH.md Open Question 1).

---

### UI Components (Role: component)

All seven components in `src/lib/components/` share the same Tailwind 4 + Svelte 5 runes patterns. No analog exists — build from `01-UI-SPEC.md` contracts.

**Shared component pattern:**

```svelte
<!-- All components follow this structure -->
<script lang="ts">
  // Props declared with Svelte 5 $props() rune
  let { variant = "primary", disabled = false, ...rest } = $props();
</script>

<!-- Tailwind classes reference @theme tokens via CSS custom properties -->
<!-- e.g., bg-[var(--color-accent)] or Tailwind v4 shorthand bg-accent -->
```

**Per-component seed references from `01-UI-SPEC.md`:**

| Component | Key spec section |
|-----------|-----------------|
| `Button.svelte` | §Interaction Contracts — Primary CTA, Secondary CTA, Icon button states; min-h-11 (44px tap target) |
| `TextInput.svelte` | §Interaction Contracts — Text input states; `code` variant = 6-char monospace uppercase |
| `Modal.svelte` | §Interaction Contracts — Modal behavior (backdrop, focus trap, Esc dismiss, autofocus, Tab trap); Motion (120ms/150ms) |
| `Badge.svelte` | §Copywriting Contract — `Host` badge with crown icon; accent background, ink-inverse text |
| `PlayerRow.svelte` | §Component Inventory — color circle + initials + name + optional Host badge; uses `getPlayerColor` + `getInitials` utilities |
| `Banner.svelte` | §Interaction Contracts — Reconnecting banner (position fixed, top 0, translateY 150ms, auto-dismiss); §Screen-by-Screen Checklist #5 |
| `ErrorPage.svelte` | §Screen-by-Screen Checklist #4 — alert-triangle icon, destructive color, heading, body, CTA |

---

## Shared Patterns

### Tailwind 4 utility classes for design tokens

**Source:** `01-RESEARCH.md` §Code Examples — `src/app.css`; `01-UI-SPEC.md` §Color
**Apply to:** All `.svelte` component files

Tailwind v4 `@theme` tokens map directly to utility classes. Use these conventions throughout:

| Intent | Class pattern |
|--------|--------------|
| Page background | `bg-[var(--color-bg)]` or `bg-bg` (if Tailwind resolves it) |
| Surface / card | `bg-[var(--color-surface)]` |
| Border / divider | `border-[var(--color-divider)]` |
| Accent fill | `bg-[var(--color-accent)]` |
| Primary text | `text-[var(--color-ink-primary)]` |
| Secondary text | `text-[var(--color-ink-secondary)]` |
| Tap target floor | `min-h-11 min-w-11` (44px = Tailwind `h-11`) |
| Focus ring | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ink-secondary)]` |
| Reduced motion | `motion-reduce:transition-none` on all animated elements |

### Valibot `v.safeParse` guard (server-side WS)

**Source:** `01-RESEARCH.md` Pattern 1 `onMessage` and Pattern 6
**Apply to:** `party/game-room.ts` `onMessage` handler — every inbound message, no exceptions

```ts
const result = v.safeParse(ClientMessage, JSON.parse(raw as string));
if (!result.success) {
  conn.send(JSON.stringify({ type: "error", code: "bad_message" }));
  return;
}
// Now safe to use result.output with full TypeScript narrowing
```

### SvelteKit `platform.env` guard

**Source:** `01-RESEARCH.md` §Code Examples — Create-room endpoint
**Apply to:** All `+server.ts` and `+page.server.ts` files that access `platform.env`

```ts
if (!platform?.env) error(500, "Platform unavailable");
const env = platform.env;
```

### `browser` guard for client-only code

**Source:** `01-RESEARCH.md` Pitfall 3 and Anti-Patterns
**Apply to:** Any component or module that accesses `sessionStorage`, `navigator`, or `PartySocket`

```ts
import { browser } from "$app/environment";
// Wrap any browser-only API:
if (browser) { /* sessionStorage, PartySocket, navigator.clipboard */ }
```

### DO liveness ping pattern

**Source:** `01-RESEARCH.md` §Code Examples — Room existence check
**Apply to:** `src/routes/join/[code]/+page.server.ts`, `src/routes/room/[code]/+page.server.ts`, and `src/routes/api/rooms/[code]/exists/+server.ts`

```ts
const stub = env.GameRoom.get(env.GameRoom.idFromName(code));
const res = await stub.fetch(`https://do/exists`).catch(() => null);
if (!res || !res.ok) error(404, { message: "Room not found" });
```

### Error page routing

**Source:** `01-RESEARCH.md` §SESS-07; `01-CONTEXT.md` §D-12
**Apply to:** Any load function that detects a dead/missing room

SvelteKit's `error(404, { message: "..." })` thrown in a load function renders `+error.svelte` automatically. Do NOT redirect to a separate error route — use the built-in mechanism.

---

## No Analog Found

All files in this phase have no codebase analog — this is a greenfield project.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| All 30 files above | various | various | Greenfield — `bs-bingo/` contains only `.planning/` docs; no `src/` or `party/` directories exist |

---

## Metadata

**Analog search scope:** `/Users/christianmoore/ai/bs-bingo` — confirmed empty of source files
**Files scanned for analogs:** 0 (none exist)
**Pattern sources:** `01-RESEARCH.md` (Patterns 1–6, Code Examples), `01-UI-SPEC.md` (Design System, Component Inventory, Interaction Contracts, Screen-by-Screen Checklist)
**Pattern extraction date:** 2026-04-16
