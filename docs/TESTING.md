<!-- generated-by: gsd-doc-writer -->
# Testing

Bullshit Bingo has two test layers: Vitest for unit tests and Playwright for end-to-end tests.

## Test Framework and Setup

| Layer | Framework | Version |
|-------|-----------|---------|
| Unit | Vitest | `^2.1.0` |
| Component | @testing-library/svelte | `^5.2.0` |
| Component assertions | @testing-library/jest-dom | `^6.6.3` |
| E2E | Playwright | `^1.49.0` |

Unit tests run in a `jsdom` environment (configured in `vitest.config.ts`) with `url: http://localhost/`. A setup file at `tests/setup.ts` patches `localStorage` to ensure `.clear()` and `.key()` are available regardless of the Node version's built-in implementation.

No additional setup is required beyond `pnpm install`.

## Running Tests

**Full suite (unit + e2e):**
```bash
pnpm test
```

**Unit tests only:**
```bash
pnpm test:unit
```

**Unit tests in watch mode:**
```bash
pnpm test:unit:watch
```

**E2E tests only:**
```bash
pnpm test:e2e
```

E2E tests require a running Wrangler dev server. When `CI` is not set, Playwright reuses an existing server on `http://localhost:5173` if one is already running. In CI, Playwright spins one up automatically via `pnpm exec wrangler dev --port 5173`.

## Writing New Tests

**Unit tests** live in `tests/unit/` and follow the `*.test.ts` naming convention. Import from `vitest` directly (`describe`, `it`, `expect`, `vi`, `beforeEach`). Component tests use `@testing-library/svelte`.

**E2E tests** live in `e2e/` and follow the `*.spec.ts` naming convention. They use Playwright's `test` and `expect` from `@playwright/test`.

**Shared test setup:** `tests/setup.ts` — runs before every unit test file via `setupFiles` in `vitest.config.ts`.

**Unit test patterns in use:**
- Pure logic (room codes, shuffle, win detection): plain `describe`/`it` blocks with `expect`
- Durable Object server logic (`game-room.test.ts`): subclass `GameRoom` with a fake `Server` base that stubs `broadcast`, `getConnections`, and connection primitives — drive `onMessage`/`onClose` directly
- Svelte components (`Board.test.ts`, `BoardCell.test.ts`, etc.): `@testing-library/svelte` render + DOM assertions via `@testing-library/jest-dom`

## Coverage Requirements

No coverage threshold is configured. Coverage collection is not enabled in `vitest.config.ts`.

## CI Integration

No CI pipeline is configured in this repository (no `.github/workflows/` files detected). <!-- VERIFY: CI pipeline status — confirm whether tests run in a hosted CI environment outside this repository -->

Run tests locally before pushing:
```bash
pnpm test
```
