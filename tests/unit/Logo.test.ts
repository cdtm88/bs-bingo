import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount, unmount } from "svelte";
import Logo from "../../src/lib/components/Logo.svelte";
import { theme } from "../../src/lib/stores/theme.svelte";

let instance: ReturnType<typeof mount> | null = null;
let container: HTMLElement | null = null;

function renderLogo(props: { size?: "hero" | "medium" | "compact" } = {}) {
  container = document.createElement("div");
  document.body.appendChild(container);
  instance = mount(Logo, { target: container, props });
  return container;
}

beforeEach(() => {
  localStorage.clear();
  theme.init();
  theme.set("sfw");
});

afterEach(() => {
  if (instance) {
    unmount(instance);
    instance = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
});

describe("Logo — SFW variant", () => {
  it("renders Buzzword Bingo wordmark in SFW", () => {
    const el = renderLogo();
    expect(el.textContent).toContain("Buzzword Bingo");
  });

  it("renders grid icon (<rect> elements) in SFW", () => {
    const el = renderLogo();
    const rects = el.querySelectorAll("svg rect");
    expect(rects.length).toBeGreaterThanOrEqual(9);
  });

  it("does NOT render dauber path in SFW", () => {
    const el = renderLogo();
    expect(el.querySelector("svg path")).toBeNull();
  });
});

describe("Logo — NSFW variant", () => {
  beforeEach(() => {
    theme.set("nsfw");
  });

  it("renders Bullshit Bingo wordmark in NSFW", () => {
    const el = renderLogo();
    expect(el.textContent).toContain("Bullshit Bingo");
  });

  it("renders bull logo image in NSFW (not SVG path)", () => {
    const el = renderLogo();
    const img = el.querySelector('img[src="/bull-logo.png"]');
    expect(img).not.toBeNull();
    expect(el.querySelectorAll("svg path").length).toBe(0);
  });

  it("does NOT render grid rects in NSFW", () => {
    const el = renderLogo();
    const rects = el.querySelectorAll("svg rect");
    expect(rects.length).toBe(0);
  });
});

describe("Logo — size variants", () => {
  it("hero renders a <header> with hero typography classes", () => {
    const el = renderLogo({ size: "hero" });
    const header = el.querySelector("header");
    expect(header).not.toBeNull();
    const h1 = el.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.className).toContain("text-[32px]");
    expect(h1!.className).toContain("sm:text-[40px]");
  });

  it("hero includes trailing accent dot", () => {
    const el = renderLogo({ size: "hero" });
    expect(el.textContent).toMatch(/Buzzword Bingo\./);
  });

  it("compact renders an anchor element linking to /", () => {
    const el = renderLogo({ size: "compact" });
    const anchor = el.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("/");
    expect(anchor!.getAttribute("aria-label")).toBe("Buzzword Bingo");
  });

  it("compact does NOT render an h1", () => {
    const el = renderLogo({ size: "compact" });
    expect(el.querySelector("h1")).toBeNull();
  });

  it("default size is compact", () => {
    const el = renderLogo();
    expect(el.querySelector("a")).not.toBeNull();
    expect(el.querySelector("h1")).toBeNull();
  });
});

describe("Logo — color token usage (no hardcoded hex)", () => {
  it("SFW grid uses var(--color-accent) on filled rect", () => {
    const el = renderLogo();
    const filledRect = el.querySelector('svg rect[fill="var(--color-accent)"]');
    expect(filledRect).not.toBeNull();
  });

  it("NSFW uses bull logo image (no SVG path with accent fill)", () => {
    theme.set("nsfw");
    const el = renderLogo();
    const img = el.querySelector('img[src="/bull-logo.png"]');
    expect(img).not.toBeNull();
  });
});

describe("Logo — medium size variant", () => {
  it("medium renders a <div> wrapper (not <header>, not <a>)", () => {
    const el = renderLogo({ size: "medium" });
    expect(el.querySelector("header")).toBeNull();
    expect(el.querySelector("a")).toBeNull();
    // The top-level rendered element should be a div containing the icon + wordmark
    const div = el.querySelector("div.flex.items-center.justify-center");
    expect(div).not.toBeNull();
  });

  it("medium SVG has aria-hidden='true'", () => {
    const el = renderLogo({ size: "medium" });
    const svg = el.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute("aria-hidden")).toBe("true");
  });

  it("medium wordmark uses text-[28px] sm:text-[36px] font-display", () => {
    const el = renderLogo({ size: "medium" });
    const wordmark = Array.from(el.querySelectorAll("span")).find((s) =>
      (s.textContent ?? "").includes("Buzzword Bingo")
    );
    expect(wordmark).toBeTruthy();
    expect(wordmark!.className).toContain("text-[28px]");
    expect(wordmark!.className).toContain("sm:text-[36px]");
    expect(wordmark!.className).toContain("font-display");
    expect(wordmark!.className).toContain("font-semibold");
  });

  it("medium icon uses w-8 h-8 sm:w-10 sm:h-10", () => {
    const el = renderLogo({ size: "medium" });
    const svg = el.querySelector("svg");
    expect(svg!.getAttribute("class") ?? "").toContain("w-8");
    expect(svg!.getAttribute("class") ?? "").toContain("h-8");
    expect(svg!.getAttribute("class") ?? "").toContain("sm:w-10");
    expect(svg!.getAttribute("class") ?? "").toContain("sm:h-10");
  });

  it("medium SFW renders 9 grid rects and no dauber path", () => {
    const el = renderLogo({ size: "medium" });
    const rects = el.querySelectorAll("svg rect");
    expect(rects.length).toBeGreaterThanOrEqual(9);
    expect(el.querySelector("svg path")).toBeNull();
  });

  it("medium NSFW renders bull logo image and no grid rects", () => {
    theme.set("nsfw");
    const el = renderLogo({ size: "medium" });
    const img = el.querySelector('img[src="/bull-logo.png"]');
    expect(img).not.toBeNull();
    expect(el.querySelectorAll("svg rect").length).toBe(0);
  });
});
