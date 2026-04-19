import { test, expect } from "@playwright/test";

test("home first visit shows brand, tagline, CTA, and Professional Mode toggle", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto("/");
  await expect(p.getByRole("heading", { name: /Buzzword Bingo/ })).toBeVisible();
  await expect(p.getByText(/The meeting game/)).toBeVisible();
  await expect(p.getByRole("button", { name: /Create a game/ })).toBeVisible();
  await expect(p.getByRole("switch", { name: "Professional Mode" })).toBeVisible();
  await ctx.close();
});

test.describe("Home — NSFW copy migration (Phase 8)", () => {
  test("NSFW mode shows 'Got a code?' label, 'or drag someone in' divider, and 'Start the chaos' CTA", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("switch", { name: /professional mode|nsfw|theme/i });
    await toggle.click();
    await expect(page.getByText("Got a code?")).toBeVisible();
    await expect(page.getByText("or drag someone in")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start the chaos" })).toBeVisible();
    await expect(page.getByText(/^Join with code$/)).toHaveCount(0);
  });

  test("NSFW 'or drag someone in' stays on one visual line at 375px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const toggle = page.getByRole("switch", { name: /professional mode|nsfw|theme/i });
    await toggle.click();
    const divider = page.getByText("or drag someone in");
    await expect(divider).toBeVisible();
    const box = await divider.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThan(28);
  });

  test("SFW mode preserves 'Join with code' label and 'or' divider (regression guard)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Join with code")).toBeVisible();
    const orSpan = page.locator("span.whitespace-nowrap", { hasText: /^or$/ });
    await expect(orSpan).toBeVisible();
  });
});
