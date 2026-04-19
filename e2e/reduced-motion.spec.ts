import { test, expect } from "@playwright/test";

// Phase 7 — verifies D-13 prefers-reduced-motion guard on dauber animation
// Uses document.styleSheets CSS inspection since animations complete in ms and visual
// assertions of mid-animation state are unreliable in CI.

test("prefers-reduced-motion: reduce disables dauber-stamp animation", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto("/");

  // Media-query matches reduced-motion in this context
  const matchesReduced = await p.evaluate(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(matchesReduced).toBe(true);

  // The CSS rule `.dauber-stamp { animation: none; opacity: 0.72 }` must resolve inside
  // the reduced-motion @media block. Inject a detached probe element and read computed style.
  const animationName = await p.evaluate(() => {
    const el = document.createElement("div");
    el.className = "dauber-stamp";
    document.body.appendChild(el);
    const name = getComputedStyle(el).animationName;
    el.remove();
    return name;
  });
  expect(animationName).toBe("none");

  await ctx.close();
});

test("prefers-reduced-motion: reduce disables dauber-wrap::after bleed ring", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto("/");
  await p.waitForLoadState("networkidle");

  // Inspect the reduced-motion @media block in the stylesheet for the ::after override.
  const hasReducedOverride = await p.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          if (rule instanceof CSSMediaRule && rule.conditionText.includes("prefers-reduced-motion")) {
            for (const inner of Array.from(rule.cssRules)) {
              if (inner.cssText.includes(".dauber-wrap::after")) return true;
            }
          }
        }
      } catch (_) { /* cross-origin */ }
    }
    return false;
  });
  expect(hasReducedOverride).toBe(true);

  await ctx.close();
});

test("default (no-preference) keeps dauber-stamp animation active", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "no-preference" });
  const p = await ctx.newPage();
  await p.goto("/");
  await p.waitForLoadState("networkidle");

  const animationName = await p.evaluate(() => {
    const el = document.createElement("div");
    el.className = "dauber-stamp";
    document.body.appendChild(el);
    const name = getComputedStyle(el).animationName;
    el.remove();
    return name;
  });
  expect(animationName).toBe("dauberStampIn");

  await ctx.close();
});

test("default (no-preference) keeps dauber-wrap::after bleed ring animation active", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "no-preference" });
  const p = await ctx.newPage();
  await p.goto("/");
  await p.waitForLoadState("networkidle");

  // Pseudo-elements require a rendered layout context for getComputedStyle to resolve.
  // Instead inspect the stylesheet directly for the dauberBleed animation rule on ::after.
  const afterAnimationName = await p.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        for (const rule of Array.from(sheet.cssRules || [])) {
          const text = rule.cssText;
          if (text.includes(".dauber-wrap::after") && !text.includes("prefers-reduced-motion")) {
            // Extract animation-name from the rule text
            const match = text.match(/animation:\s*[^;]*?(dauberBleed)/);
            if (match) return match[1];
          }
        }
      } catch (_) { /* cross-origin */ }
    }
    return "none";
  });
  expect(afterAnimationName).toBe("dauberBleed");

  await ctx.close();
});
