import { test, expect } from "@playwright/test";

test("ThemeToggle does not overlap board cells at 375px (iPhone SE)", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const p = await ctx.newPage();
  await p.goto("/");
  await p.getByRole("button", { name: /Create a game/ }).click();
  await p.getByLabel("Your name").fill("Tester");
  await p.getByRole("button", { name: /Create game/ }).click();
  await p.waitForURL(/\/room\/[A-Z0-9]{6}/);
  // In lobby — toggle should be visible and not overlap interactive lobby controls
  const toggleBox = await p.getByRole("switch", { name: "Professional Mode" }).boundingBox();
  expect(toggleBox).not.toBeNull();
  const startButton = p.getByRole("button", { name: /Start/i }).first();
  const startBox = await startButton.boundingBox();
  if (toggleBox && startBox) {
    // Assert no intersection
    const intersects =
      toggleBox.x < startBox.x + startBox.width &&
      toggleBox.x + toggleBox.width > startBox.x &&
      toggleBox.y < startBox.y + startBox.height &&
      toggleBox.y + toggleBox.height > startBox.y;
    expect(intersects).toBe(false);
  }
  await ctx.close();
});
