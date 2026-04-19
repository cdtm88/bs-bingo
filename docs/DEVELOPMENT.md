<!-- generated-by: gsd-doc-writer -->
# Development

Local development guide for Bullshit Bingo.

## Local Setup

```bash
git clone <your-fork-url>
cd bs-bingo
pnpm install
```

No `.env` file is required — all runtime config is handled via `wrangler.jsonc` bindings (Durable Objects, Assets). The Cloudflare runtime is emulated locally by Wrangler.

## Build Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start local dev server via `wrangler dev` (Worker + Durable Objects + static assets on one port) |
| `pnpm build` | Compile SvelteKit with Vite, then run `scripts/patch-worker.mjs` to inject the `GameRoom` DO export and PartyServer routing |
| `pnpm preview` | Alias for `wrangler dev` — previews the production build locally |
| `pnpm check` | Run `svelte-kit sync` + `svelte-check` for TypeScript and template type errors |
| `pnpm test:unit` | Run Vitest unit tests once |
| `pnpm test:unit:watch` | Run Vitest in watch mode |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm test` | Run full test suite (Vitest + Playwright) |

### Build note

The `build` script runs a post-build patch (`scripts/patch-worker.mjs`) after `vite build`. This patches `src/worker.ts` to re-export the `GameRoom` Durable Object class and wrap the SvelteKit default handler with PartyServer routing. The script is idempotent — it skips patching if `GameRoom` is already present.

## Code Style

No ESLint, Prettier, or Biome config is present in the repository. TypeScript strict mode is enforced via `tsconfig.json` (`"strict": true`). Run `pnpm check` to surface type errors before pushing.

The `tsconfig.json` uses `"moduleResolution": "bundler"` and includes `@cloudflare/workers-types` — keep all Worker-side code compatible with the Cloudflare Workers runtime (no Node.js built-ins except those gated by the `nodejs_als` compatibility flag in `wrangler.jsonc`).

## Branch Conventions

No branch naming convention is documented. No convention documented.

## PR Process

No pull request template exists. General guidance:

- Branch off `main` for each change
- Run `pnpm check && pnpm test` locally before opening a PR
- Keep PRs focused — one logical change per PR
- The `build` script must succeed cleanly (Worker patch must apply without error)
- No CI pipeline is configured yet — reviewer runs checks manually
