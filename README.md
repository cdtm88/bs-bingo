# Buzzword Bingo

> The meeting game. Mark the buzzwords, first to a line wins.

[![CI](https://github.com/cdtm88/bs-bingo/actions/workflows/ci.yml/badge.svg)](https://github.com/cdtm88/bs-bingo/actions/workflows/ci.yml)

![Home screen](static/screenshots/home.png)

## What is it?

Buzzword Bingo is a real-time multiplayer game for anyone stuck in a corporate meeting. Players join a shared room, contribute buzzwords they expect to hear, then race to mark them off their randomly generated bingo board. First to complete a full row, column, or diagonal calls it — **BINGO!**

No account, no app, no setup. Join by link or 6-character code from any browser.

---

## Screenshots

### Buzzword Bingo (SFW — safe for screen share)

| Home | Lobby | Game board |
|---|---|---|
| ![Home](static/screenshots/home.png) | ![Lobby](static/screenshots/lobby-words.png) | ![Board](static/screenshots/board.png) |

| Win screen |
|---|
| ![Win](static/screenshots/board-marked.png) |

### Bullshit Bingo (NSFW — toggle off Professional Mode)

| Home | Lobby | Game board |
|---|---|---|
| ![NSFW Home](static/screenshots/nsfw-home.png) | ![NSFW Lobby](static/screenshots/nsfw-lobby.png) | ![NSFW Board](static/screenshots/nsfw-board.png) |

---

## Features

- **Zero friction** — no sign-up, no install; join by link or short code
- **Real-time sync** — marks and game state propagate to all players in ~100ms
- **Starter packs** — Corporate Classics, Agile, and IT Jargon to seed the word pool instantly
- **Auto-sizing boards** — 3×3 (5+ words), 4×4 (12+), 5×5 (21+) based on the word pool
- **Professional Mode** — toggle to hide the app name on your screen share 😇
- **Mobile-ready** — works on phone, tablet, and desktop
- **Reconnect-safe** — WebSocket auto-reconnects with exponential backoff; game state restores on rejoin

---

## Quick Start

Requires **Node.js ≥ 18** and **[pnpm](https://pnpm.io/)**.

```bash
git clone https://github.com/cdtm88/bs-bingo.git
cd bs-bingo
pnpm install
pnpm dev
```

Open [http://localhost:8788](http://localhost:8788) — create a room, share the code, start playing.

---

## How to Play

1. **Create** — click *Create a game*, enter your name, share the 6-character room code or link
2. **Add words** — type buzzwords you expect to hear, or load a starter pack
3. **Start** — the host clicks *Start Game*; everyone gets a unique randomised board
4. **Mark** — tap squares as buzzwords are said in the meeting
5. **Win** — first player to complete a full line shouts BINGO 🎉

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2 + Svelte 5 (runes) |
| Real-time | Cloudflare Durable Objects + WebSocket Hibernation |
| Coordination | PartyServer (Cloudflare-maintained WS framework) |
| Styling | Tailwind CSS v4 |
| Validation | Valibot |
| Deployment | Cloudflare Workers via Wrangler |

---

## Deployment

Requires a Cloudflare account on the **Workers Paid plan** ($5/mo) for Durable Objects.

```bash
pnpm build
wrangler deploy
```

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, key modules |
| [Getting Started](docs/GETTING-STARTED.md) | Prerequisites, install, first run |
| [Development](docs/DEVELOPMENT.md) | Build commands, code style, workflows |
| [Testing](docs/TESTING.md) | Unit tests (Vitest) and E2E (Playwright) |
| [Configuration](docs/CONFIGURATION.md) | `wrangler.jsonc`, in-code constants, game rules |
| [API](docs/API.md) | HTTP endpoints and WebSocket message protocol |
