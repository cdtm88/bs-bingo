# Roadmap: Bullshit Bingo

## Overview

Bullshit Bingo ships in six phases that each deliver a verifiable slice of the meeting-party experience: first a live room with presence, then word submission, then the randomized boards and the mark loop, then the payoff (win detection, celebration, play-again), then resilience work that turns a happy-path demo into something that survives a real meeting on a flaky phone, and finally a UI overhaul that polishes every screen into a cohesive, delightful product. Each phase ends with something a human can actually try; nothing sits half-built waiting for a later phase to light it up.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation — Transport, Room, Lobby, Presence** — Anyone can create a room, share a code or link, and see who has joined in real time.
- [x] **Phase 2: Lobby Gameplay — Word Submission & Start** — Players can seed the word pool, the grid auto-sizes, and the host can start the game.
- [x] **Phase 3: Board Generation & Core Mark Loop** — Every player gets a private, fairly shuffled board and can mark words that other players see count updates for.
- [x] **Phase 4: Win Detection, Announcement & Play-Again** — The server declares the winner, everyone sees the celebration, and the host can rematch with the same lobby.
- [x] **Phase 5: Resilience & Mobile Hardening** — Sessions survive phone locks, network drops, host disconnects, and tab-away meetings.
- [x] **Phase 6: UI Overhaul** — Dual-mode theming (SFW "Buzzword Bingo" default / NSFW "Bullshit Bingo" opt-in) with per-theme palette, copy, and classic bingo-card aesthetic.

## Phase Details

### Phase 1: Foundation — Transport, Room, Lobby, Presence
**Goal**: A host can spin up a live room and share it, players can join by code or link with a display name, and everyone in the room sees the live roster update in under a second.
**Depends on**: Nothing (first phase)
**Requirements**: SESS-01, SESS-02, SESS-03, SESS-04, SESS-05, SESS-06, SESS-07
**Success Criteria** (what must be TRUE):
  1. A user can create a new room and is shown both a 6-character join code and a shareable link.
  2. A second user can join that room either by entering the code or by opening the link, and both appear in the lobby with their chosen display names.
  3. When a new player joins or leaves, every other player in the lobby sees the roster update live without a manual refresh.
  4. The room's creator is visibly marked as host, and that designation is consistent for all players.
  5. Opening a link for an expired or unknown room lands on a clear error page rather than a broken lobby.
**Plans**: 5 plans
  - [x] 01-01-PLAN.md — Scaffold SvelteKit + Cloudflare + Tailwind, install test infra, author shared utilities (protocol schemas, roomCode, session, playerColor, initials)
  - [x] 01-02-PLAN.md — Implement GameRoom Durable Object + Worker entry + POST /api/rooms + existence endpoints
  - [x] 01-03-PLAN.md — Build design-system components + home page (create/join flows) + /join/[code] route
  - [x] 01-04-PLAN.md — Wire room store (PartySocket) + lobby page + error page + reconnecting banner
  - [x] 01-05-PLAN.md — Playwright e2e suite (SESS-02/03/05/06/07) + mobile-device human verification
**UI hint**: yes

### Phase 2: Lobby Gameplay — Word Submission & Start
**Goal**: Players can populate the buzzword pool (with starter packs as a shortcut), the grid size auto-negotiates from the word count, and the host can start the game only once the pool is viable.
**Depends on**: Phase 1
**Requirements**: LOBB-01, LOBB-02, LOBB-03, LOBB-04, LOBB-05, LOBB-06, LOBB-07
**Success Criteria** (what must be TRUE):
  1. Any player can submit a word and immediately see it appear in the shared word pool for everyone in the lobby.
  2. Attempting to submit a duplicate word (case-insensitive) is rejected with an inline message explaining why.
  3. A player can remove a word they personally submitted; they cannot remove words others submitted.
  4. The host can one-click seed the pool from a starter pack (Corporate Classics, Agile, or Sales) and those words merge into the pool without breaking dedupe.
  5. The "Start Game" control is visible to the host, disabled with an explanatory hint while the minimum word count for the current grid tier is unmet, and enabled the instant the threshold is crossed; non-hosts see a clear "waiting for host to start" state.
**Plans**: 3 plans
Plans:
  - [x] 02-01-PLAN.md — Define type contracts (Valibot schemas, gridTier utilities, starter pack constants) + unit tests
  - [x] 02-02-PLAN.md — Extend GameRoom DO with word pool handlers + room store with word state + DO unit tests
  - [x] 02-03-PLAN.md — Build UI components (WordChip, WordPool, PackPills, GridProgress) + wire into lobby page + human verification
**UI hint**: yes

### Phase 3: Board Generation & Core Mark Loop
**Goal**: Starting the game deals every player a private, server-generated board, and the mark-a-cell interaction round-trips to peers as a count update in under a second on both desktop and mobile.
**Depends on**: Phase 2
**Requirements**: BOAR-01, BOAR-02, BOAR-03, BOAR-04, BOAR-05, BOAR-06, BOAR-07
**Success Criteria** (what must be TRUE):
  1. When the host starts the game, every player transitions to a board screen showing a uniquely shuffled grid of the submitted words plus blank cells filling any remainder.
  2. A player's own board layout is visible only to that player — inspecting another player's network traffic or state does not leak it.
  3. Tapping a word cell toggles it into a visibly marked state on the acting player's board within the same frame.
  4. When one player marks a cell, every other player sees that player's public mark count update within ~1 second, without ever seeing the underlying layout.
  5. The board is fully usable on a phone held in portrait: every cell is at least a 44px tap target, nothing overflows the viewport, and marking works with touch as reliably as with a mouse.
**Plans**: 4 plans
Plans:
  - [x] 03-01-PLAN.md — Define BoardCell + markWord/boardAssigned/wordMarked message schemas + unbiased Fisher-Yates shuffle utility (BOAR-02)
  - [x] 03-02-PLAN.md — Extend GameRoom DO with startGame board-deal (per-connection send), markWord handler, wordMarked broadcast (BOAR-01/02/03/04/06)
  - [x] 03-03-PLAN.md — Extend room store with board/playerMarks/markedCellIds/toggleMark + BoardCell.svelte leaf component (BOAR-04/05)
  - [x] 03-04-PLAN.md — Board.svelte grid + PlayerRow markCount badge + room page wiring + e2e board-mark test (BOAR-04/05/06/07)
**UI hint**: yes

### Phase 4: Win Detection, Announcement & Play-Again
**Goal**: The server — not the client — decides who wins, every player sees a consistent celebration moment, and the host can reset the room for another round without anyone having to re-join.
**Depends on**: Phase 3
**Requirements**: WIN-01, WIN-02, WIN-03, WIN-04, WIN-05
**Success Criteria** (what must be TRUE):
  1. The instant a player's marks complete any row, column, or diagonal (blanks counted), the server declares them the winner and further marks no longer change the outcome.
  2. The winning player sees a celebration screen with a confetti animation and a "BINGO!" announcement.
  3. Every non-winning player sees who won and which line completed, and the view is identical in content across all clients.
  4. The host sees a "Start new game" control on the end screen that is unavailable to non-hosts.
  5. When the host triggers a new game, every player — without rejoining — lands back in the lobby with the roster and host role preserved, ready to submit words for a new round.
**Plans**: 4 plans
Plans:
  - [x] 04-01-PLAN.md — Protocol schema extension + pure detectWin util + win-line pulse keyframes (WIN-01/02/04/05)
  - [x] 04-02-PLAN.md — GameRoom DO: append win detection to markWord + startNewGame host-only reset handler (WIN-01/02/05)
  - [x] 04-03-PLAN.md — Room store win/reset handlers + WinLineIcon + EndScreen components with confetti (WIN-03/04/05)
  - [x] 04-04-PLAN.md — Wire EndScreen into /room/[code]/+page.svelte + two-browser e2e spec + human verify checkpoint (WIN-03/04/05)
**UI hint**: yes

### Phase 5: Resilience & Mobile Hardening
**Goal**: Real-meeting conditions — iPhones locking, tabs backgrounding, hosts dropping off Wi-Fi — no longer break a game in progress; disconnected players resume cleanly and hosts are reassigned automatically.
**Depends on**: Phase 4
**Requirements**: RESI-01, RESI-02, RESI-03, RESI-04, RESI-05, RESI-06
**Success Criteria** (what must be TRUE):
  1. A player whose connection drops mid-game sees a "reconnecting…" indicator, and once the network returns their full game state (board, marks, phase, winner if any) is restored without them having to refresh or re-enter a name.
  2. A player who closes and reopens their tab within the slot-hold window returns to the same seat in the same game, identified by their sessionStorage token.
  3. If the host disconnects and does not return within the slot-hold window, host role transfers to the next-longest-connected player and that transfer is visible to everyone.
  4. Switching back to a backgrounded tab triggers an immediate resync so the returning player's view matches the live state within a second.
  5. A player opening a link for a room that has been reaped still lands on the Phase 1 "room not found" error rather than a stalled lobby.
**Plans**: 3 plans
Plans:
  - [x] 05-01-PLAN.md — Server: slot-hold alarm + host failover + syncRequest/syncResponse + playerDisconnected/playerReconnected/hostChanged + winner state persistence (RESI-01/02/03/05)
  - [x] 05-02-PLAN.md — Client: playerId query param + reconnect-aware open handler + syncResponse/playerDisconnected/playerReconnected/hostChanged handlers + visibilitychange listener (RESI-03/04/05/06)
  - [x] 05-03-PLAN.md — E2E: Playwright tests for reconnect resume, tab-background resync, host failover, reaped room + human verify checkpoint (RESI-02/03/04/05/06)
**UI hint**: yes

### Phase 6: UI Overhaul
**Goal**: Ship dual-mode theming — a default SFW "Buzzword Bingo" mode (existing dark palette, professional copy) and an opt-in NSFW "Bullshit Bingo" mode (warm parchment + burnt orange palette, classic bingo-card aesthetic with B-U-L-L-S header and dauber stamps, snarky copy) — controlled by a persistent Professional Mode toggle. Zero gameplay / backend changes; pure visual + copy polish layered on top of Phases 1-5.
**Depends on**: Phase 5
**Requirements**: (no backend requirements; success measured by SC-1 through SC-5 below)
**Success Criteria** (what must be TRUE):
  1. A Professional Mode toggle is visible on every screen, persists via localStorage, and flips the entire app between SFW and NSFW theme without reload.
  2. In SFW mode the app reads "Buzzword Bingo" with the current dark palette and professional copy; in NSFW mode the app reads "Bullshit Bingo" with the parchment / burnt-orange palette, B-U-L-L-S board header, dauber stamps on marked cells, and snarky copy per the UI Copywriting Contract.
  3. Every user-facing string in the UI Copywriting Contract is sourced from `src/lib/copy.ts` — a grep audit confirms no hardcoded strings leak outside that module.
  4. Theme swap, dauber stamp-in, and toggle-slide animations all respect `prefers-reduced-motion`; no regressions to Phase 1-5 existing unit / e2e suites.
  5. Human UAT confirms visual cohesion in both themes across home, lobby, board, end, and error screens, including 375px mobile viewport and mid-game theme flip.
**Plans**: 4 plans
Plans:
  - [x] 06-01-PLAN.md — Wave 0 test scaffolds + theme store (src/lib/stores/theme.svelte.ts) + copy module (src/lib/copy.ts) + NSFW CSS override block in app.css (foundation)
  - [x] 06-02-PLAN.md — ThemeToggle.svelte component + wire theme.init + ThemeToggle into +layout.svelte + migrate home page copy (global chrome + home)
  - [x] 06-03-PLAN.md — BoardHeader.svelte (B-U-L-L-S row) + dauber stamp + crosshatch into BoardCell + per-theme confetti palette in room store (board identity)
  - [x] 06-04-PLAN.md — Migrate EndScreen / WordPool / PackPills + lobby + join + error routes to copy.ts; grep audit; narrow-viewport e2e; human UAT checkpoint (copy sweep + phase sign-off)
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Transport, Room, Lobby, Presence | 5/5 | Complete | 2026-04-17 |
| 2. Lobby Gameplay — Word Submission & Start | 3/3 | Complete | 2026-04-17 |
| 3. Board Generation & Core Mark Loop | 4/4 | Complete | 2026-04-18 |
| 4. Win Detection, Announcement & Play-Again | 4/4 | Complete | 2026-04-18 |
| 5. Resilience & Mobile Hardening | 3/3 | Complete | 2026-04-18 |
| 6. UI Overhaul | 4/4 | Complete | 2026-04-19 |
| 7. Polish — logo, favicon, NSFW copy, dauber animation | 4/4 | Complete | 2026-04-19 |
| 8. Bull logos, win/lose screens, copy dial-up | 4/4 | Complete | 2026-04-19 |
| Docs, CI, test suite | — | Complete | 2026-04-19 |

**v1.0 COMPLETE — 2026-04-19**

### Phase 7: Polish — logo, favicon, harder NSFW copy, paint dauber animation

**Goal:** Ship a dual-mode SVG logo/wordmark, fix the broken favicon to a neutral mark, sharpen mild NSFW copy strings to match the "CALLED IT!" quality bar, and upgrade the NSFW paint dauber to an Impact + Ink Bleed Ring animation. Pure frontend polish layered on Phase 6; no gameplay, protocol, or server changes.
**Requirements**: (no v1 requirements — polish phase on Phase 6 theming)
**Depends on:** Phase 6
**Plans:** 4 plans

Plans:
- [x] 07-01-PLAN.md — Dual-mode Logo.svelte component + home hero + persistent compact header in layout with route guard (D-01/D-02/D-03)
- [x] 07-02-PLAN.md — Neutral static/favicon.svg + fix src/app.html link + Playwright spec (D-04/D-05)
- [x] 07-03-PLAN.md — Audit and rewrite mild NSFW strings in copy.ts to match "CALLED IT!" quality bar + update copy.test.ts (D-06/D-07/D-08/D-09)
- [x] 07-04-PLAN.md — Impact + Ink Bleed Ring dauber animation (app.css + BoardCell.svelte + BoardCell.test.ts + reduced-motion e2e spec) (D-10/D-11/D-12/D-13/D-14/D-15)

### Phase 8: Add logos to the bullshit versions home page, win page and lose page and dial up the language

**Goal:** Deliver a branded medium-size Logo above winner/loser content on the NSFW EndScreen, migrate every remaining hardcoded string in EndScreen.svelte and +page.svelte into copy.ts with NSFW variants, and sharpen two underperforming NSFW copy keys. Pure frontend copy + component polish on top of Phase 7; no gameplay, protocol, or server changes.
**Requirements**: (no v1 requirements — polish phase on Phase 7; tracked via CONTEXT decisions D-01 through D-12)
**Depends on:** Phase 7
**Plans:** 4 plans

Plans:
- [x] 08-01-PLAN.md — Extend Logo.svelte with size="medium" variant + unit tests (D-01, D-03)
- [x] 08-02-PLAN.md — Add 11 new copy.ts keys + sharpen 2 underperforming NSFW values + test coverage (D-04 through D-12, D-08/D-09 audit)
- [x] 08-03-PLAN.md — Wire medium Logo into EndScreen (NSFW only, winner + loser) + migrate 4 hardcoded strings + tests (D-01/D-02/D-03/D-04/D-05/D-06/D-07)
- [x] 08-04-PLAN.md — Migrate +page.svelte join-flow strings + NSFW 'or drag someone in' divider with 375px wrap guard + e2e spec (D-10/D-11/D-12)

---
*Roadmap created: 2026-04-16*
*Coverage: 32 / 32 v1 requirements mapped (100%)*
