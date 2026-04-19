import { test, expect } from "@playwright/test";

test("favicon.svg returns 200 with SVG content-type", async ({ request }) => {
  const res = await request.get("/favicon.svg");
  expect(res.status()).toBe(200);
  const contentType = res.headers()["content-type"] ?? "";
  expect(contentType).toContain("image/svg+xml");
  const body = await res.text();
  expect(body).toContain("<svg");
});

test("app.html link tag points to favicon.svg with correct type attribute", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('link[rel="icon"]');
  await expect(link).toHaveAttribute("href", /favicon\.svg$/);
  await expect(link).toHaveAttribute("type", "image/svg+xml");
});

test("favicon body contains a bingo-grid shape (9 rect elements)", async ({ request }) => {
  const res = await request.get("/favicon.svg");
  expect(res.status()).toBe(200);
  const body = await res.text();
  const rectCount = (body.match(/<rect/g) ?? []).length;
  expect(rectCount).toBe(9);
});

test("favicon is neutral — body contains no NSFW-revealing strings", async ({ request }) => {
  const res = await request.get("/favicon.svg");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).not.toMatch(/bullshit/i);
  expect(body).not.toMatch(/dauber/i);
});
