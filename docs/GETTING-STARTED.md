<!-- generated-by: gsd-doc-writer -->
# Getting Started

This guide covers everything you need to run Bullshit Bingo locally from a fresh clone.

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | `>= 18` | Required by Wrangler and SvelteKit |
| pnpm | `10.x` | Project is locked to pnpm (`packageManager` field in `package.json`) |
| Wrangler CLI | included | Installed as a dev dependency — no global install needed |
| Cloudflare account | — | Required only for production deployment, not local dev |

Install pnpm if you don't have it:

```bash
npm install -g pnpm
```

---

## Installation Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/christianmoore88/bs-bingo.git
   cd bs-bingo
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

That's it. No `.env` file is needed — there are no environment variables. All configuration is in `wrangler.jsonc`.

---

## First Run

Start the local dev server (Cloudflare Workers + Durable Objects via Wrangler):

```bash
pnpm dev
```

This runs `wrangler dev`, which starts the Worker runtime at `http://localhost:8787`. Open that URL in your browser to use the app.

---

## Common Setup Issues

**`pnpm` not found**
Install it globally via `npm install -g pnpm`, then re-run `pnpm install`.

**`wrangler dev` fails with "workerd" binary error**
Run `pnpm install` again — `workerd` is a platform-native binary that pnpm builds on install. It may not have compiled correctly on first run if Node.js was not available at install time.

**Port 8787 already in use**
Another Wrangler dev process is running. Kill it (`lsof -ti:8787 | xargs kill`) and retry.

**TypeScript errors on first open in your editor**
Run `pnpm check` once to let `svelte-kit sync` generate the type declarations. The editor should recover after that.

---

## Next Steps

- **Development workflows, build commands, and code style:** see [DEVELOPMENT.md](DEVELOPMENT.md)
- **Running the test suite:** see [TESTING.md](TESTING.md)
- **Runtime configuration and in-code constants:** see [CONFIGURATION.md](CONFIGURATION.md)
- **System architecture and deployment overview:** see [ARCHITECTURE.md](ARCHITECTURE.md)
