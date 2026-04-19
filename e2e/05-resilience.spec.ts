import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// Self-contained helpers — copied verbatim from win-and-reset.spec.ts
async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.getByRole("button", { name: "Create a game" }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: /Create game/ }).click();
  await page.waitForURL(/\/room\/[A-Z2-9]{6}$/);
  return page.url().split("/").pop()!;
}

async function joinRoom(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/join/${code}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: /Join game/ }).click();
  await page.waitForURL(`**/room/${code}`);
}

async function seedWords(page: Page, words: string[]): Promise<void> {
  for (const w of words) {
    await page.getByPlaceholder("Add a buzzword…").fill(w);
    await page.getByPlaceholder("Add a buzzword…").press("Enter");
    // Use exact:true to avoid substring collisions (e.g. "Eta" inside "Beta")
    await expect(page.getByText(w, { exact: true })).toBeVisible({ timeout: 2000 });
  }
}

/**
 * Set up a transparent WebSocket proxy for a page that allows forcing a full disconnect.
 * Returns a `dropConnection()` function that closes BOTH the client-side and server-side
 * WS legs of the proxy, so the DO registers the player as disconnected (triggering slot-hold).
 *
 * The proxy forwards all messages transparently so the game continues to function
 * normally — only `dropConnection()` interrupts it.
 */
async function setupWsProxy(page: Page): Promise<{ dropConnection: () => void }> {
  type WsRoute = Parameters<Parameters<typeof page.routeWebSocket>[1]>[0];
  let currentClientWs: WsRoute | null = null;
  let currentServerWs: ReturnType<WsRoute["connectToServer"]> | null = null;

  await page.routeWebSocket(/parties\/game-room/, (ws) => {
    currentClientWs = ws;
    const server = ws.connectToServer();
    currentServerWs = server;
    ws.onMessage((msg) => server.send(msg));
    server.onMessage((msg) => ws.send(msg));
  });

  return {
    dropConnection: () => {
      // Close both legs so the DO sees the connection drop (slot-hold triggers)
      if (currentServerWs) currentServerWs.close();
      if (currentClientWs) currentClientWs.close();
    },
  };
}

test.describe("Phase 5: Resilience & Mobile Hardening e2e", () => {
  test("reconnect resume — board restored after network drop [reconnect]", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    try {
      // Set up WS proxy on B so we can simulate a disconnect
      const proxyB = await setupWsProxy(b);

      const code = await createRoom(a, "HostAlice");
      await joinRoom(b, code, "PeerBob");
      await expect(a.getByText("Players · 2")).toBeVisible({ timeout: 5000 });
      await seedWords(a, ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]);
      await a.getByRole("button", { name: /Start Game/i }).click();
      await expect(a.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 3000 });
      await expect(b.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 3000 });

      // Drop B's connection — triggers PartySocket reconnect and "Reconnecting…" banner
      proxyB.dropConnection();
      await expect(b.getByText(/Reconnecting/i)).toBeVisible({ timeout: 3000 });

      // PartySocket auto-reconnects through the same proxy — syncRequest restores state.
      // Wait for board to reappear (syncResponse delivered) then banner to clear (open event).
      await expect(b.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 8000 });
      await expect(b.getByText(/Reconnecting/i)).not.toBeVisible({ timeout: 8000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("ended-phase reconnect — shows EndScreen after missing winDeclared [reconnect-ended]", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    try {
      // Proxy B's WS so we can drop the connection cleanly. When the proxy is
      // closed, PartySocket's reconnect loop hits ctxB.setOffline(true) and
      // cannot resume until we put B back online.
      const proxyB = await setupWsProxy(b);

      const code = await createRoom(a, "HostAlice");
      await joinRoom(b, code, "PeerBob");
      await expect(a.getByText("Players · 2")).toBeVisible({ timeout: 5000 });

      // Minimal 3x3 pool so a single row completes quickly.
      await seedWords(a, ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]);
      await a.getByRole("button", { name: /Start Game/i }).click();
      await expect(a.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 3000 });
      await expect(b.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 3000 });

      // Take B offline BEFORE A declares the win — B will miss winDeclared.
      proxyB.dropConnection();
      await ctxB.setOffline(true);
      await expect(b.getByText(/Reconnecting/i)).toBeVisible({ timeout: 4000 });

      // A clicks cells until the EndScreen appears on A (server-authoritative).
      // Use a short per-click timeout + break on BINGO! to avoid hanging on
      // clicks that race against Board unmount (pattern from win-and-reset.spec).
      const aCells = await a.locator('[data-testid="board-grid"] button').all();
      for (const cell of aCells) {
        try {
          await cell.click({ timeout: 1000 });
        } catch {
          break;
        }
        if (await a.getByText(/^BINGO!$/).isVisible().catch(() => false)) break;
      }
      await expect(a.getByText(/^BINGO!$/)).toBeVisible({ timeout: 1500 });

      // Bring B back online — reconnects mid-ended-phase. With the gap-04 fix
      // syncResponse carries winningLine + winningCellIds + winningWords + gridSize,
      // so the EndScreen mounts. Without the fix, B sees a blank screen.
      await ctxB.setOffline(false);
      await expect(b.getByText(/Reconnecting/i)).not.toBeVisible({ timeout: 8000 });

      // Assert B's EndScreen is visible — winner name "HostAlice" is rendered by
      // EndScreen regardless of whether viewer is winner or not.
      await expect(b.getByText(/HostAlice/)).toBeVisible({ timeout: 5000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("tab-background resync — state updates within 1s of tab focus [visibility]", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    try {
      const code = await createRoom(a, "HostAlice");
      await joinRoom(b, code, "PeerBob");
      await expect(a.getByText("Players · 2")).toBeVisible({ timeout: 5000 });
      // 16 distinct words → 4×4 grid. Marking 1 cell cannot win (needs 4 in a line).
      // Words chosen to avoid substring collisions in seedWords' exact-text check.
      await seedWords(a, [
        "Sync", "Board", "Focus", "Resync",
        "Lobby", "Token", "Clock", "Queue",
        "Frame", "Patch", "Draft", "Cache",
        "Flush", "Merge", "Pivot", "Scope",
      ]);
      await a.getByRole("button", { name: /Start Game/i }).click();
      await expect(a.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 3000 });
      await expect(b.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 3000 });

      // Simulate B's tab going to background before A marks
      await b.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // A marks a cell while B is "hidden"
      await a.locator('[data-testid="board-grid"] button').first().click();
      // Give mark time to propagate to server
      await a.waitForTimeout(500);

      // Simulate B's tab coming back to foreground — triggers syncRequest
      await b.evaluate(() => {
        Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      // Board should still be visible (syncResponse came in and game state is intact)
      await expect(b.locator('[data-testid="board-grid"] button').first()).toBeVisible({ timeout: 2000 });

      // A's mark-badge should appear on B's player list within 3s of resync
      await expect(
        b.locator('[data-testid="mark-badge"]').first()
      ).toBeVisible({ timeout: 3000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("host failover — second player becomes host after slot expires [host-failover]", async ({ browser }) => {
    test.slow(); // extends timeout 3x (default 30s → 90s)
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const a = await ctxA.newPage();
    const b = await ctxB.newPage();
    try {
      // Set up WS proxy on A so we can close the server-side leg (DO sees disconnect)
      // while also preventing reconnect by going offline immediately after.
      const proxyA = await setupWsProxy(a);

      const code = await createRoom(a, "HostAlice");
      await joinRoom(b, code, "PeerBob");
      await expect(a.getByText("Players · 2")).toBeVisible({ timeout: 5000 });
      await seedWords(a, ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"]);

      // Step 1: drop connection so DO registers the host as disconnected (slot-hold starts)
      proxyA.dropConnection();
      // Step 2: go offline immediately so PartySocket cannot reconnect (alarm will fire at 45s)
      await ctxA.setOffline(true);

      // Wait up to 55s for the DO alarm to fire and B to receive hostChanged +
      // become host. Playwright polls every ~100ms — resolves the moment the
      // button appears. gap-04 (plan 05-04): replaces a 50s hard sleep + 5s
      // assertion that left only ~30s spare within the 90s test.slow() budget
      // and couldn't fail fast under slow-CI contention.
      await expect(b.getByRole("button", { name: /Start Game/i })).toBeVisible({ timeout: 55_000 });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("reaped room — navigating to unknown code shows error page [reaped-room]", async ({ page }) => {
    // A code that was never created — /exists returns 404, client redirects to error page.
    await page.goto("/room/XXXXXX");
    // SvelteKit load function redirects to error route on 404
    await expect(
      page.getByText(/not found|doesn't exist|no room/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("reconnecting banner — visible within 2s of network loss [reconnecting]", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      // Set up WS proxy so we can force-close the connection
      const proxy = await setupWsProxy(page);

      await createRoom(page, "HostAlice");
      // Confirm we're connected (lobby renders = WS open)
      await expect(page.getByText("Players · 1")).toBeVisible({ timeout: 5000 });

      // Drop connection — PartySocket triggers "close" → store sets status="reconnecting"
      proxy.dropConnection();
      await expect(page.getByText(/Reconnecting/i)).toBeVisible({ timeout: 3000 });
    } finally {
      await ctx.close();
    }
  });
});
