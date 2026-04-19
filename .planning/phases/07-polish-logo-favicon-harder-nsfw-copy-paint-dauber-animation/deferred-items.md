# Deferred Items — Phase 07

Items discovered during execution that are out-of-scope for the current plans. Track for future cleanup.

## Pre-existing TypeScript errors (outside 07-03 scope)

Discovered during 07-03 execution while running `pnpm check`. These errors exist on baseline (before 07-03 edits) and are unrelated to the copy.ts rewrite.

- `src/worker.ts` — multiple errors: missing `CacheStorage.default`, implicit `any` types, missing `Env.ASSETS`, unused `@ts-expect-error` directives.
- `tests/unit/game-room.test.ts` — accesses protected property `ctx` on `DurableObject` subclass (lines 818, 904).
- `src/lib/components/TextInput.svelte:60` — a11y warning about `autofocus`.

Recommend a follow-up plan to fix the worker typing and DO test access pattern.
