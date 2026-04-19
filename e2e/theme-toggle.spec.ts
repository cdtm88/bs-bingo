import { test, expect } from "@playwright/test";

test("data-theme defaults to sfw on first visit", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto("/");
  await expect(p.locator("html")).toHaveAttribute("data-theme", "sfw");
  await ctx.close();
});

test("Professional Mode toggle flips data-theme and persists across reload", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto("/");
  await expect(p.locator("html")).toHaveAttribute("data-theme", "sfw");
  await p.getByRole("switch", { name: "Professional Mode" }).click();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "nsfw");
  await p.reload();
  await expect(p.locator("html")).toHaveAttribute("data-theme", "nsfw");
  await ctx.close();
});

test("Professional Mode toggle visible on home and lobby", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto("/");
  await expect(p.getByRole("switch", { name: "Professional Mode" })).toBeVisible();
  // Create a room
  await p.getByRole("button", { name: /Create a game|Start the chaos/ }).click();
  await p.getByLabel("Your name").fill("Tester");
  await p.getByRole("button", { name: /Create game|Start the chaos/ }).click();
  await p.waitForURL(/\/room\/[A-Z0-9]{6}/);
  await expect(p.getByRole("switch", { name: "Professional Mode" })).toBeVisible();
  await ctx.close();
});
