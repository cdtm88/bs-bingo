import { describe, it, expect, beforeEach } from "vitest";
import { theme } from "../../src/lib/stores/theme.svelte";

describe("theme store", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to 'sfw' when localStorage is empty", () => {
    theme.init();
    expect(theme.current).toBe("sfw");
  });

  it("restores 'nsfw' when localStorage has nsfw", () => {
    localStorage.setItem("theme", "nsfw");
    theme.init();
    expect(theme.current).toBe("nsfw");
  });

  it("falls back to 'sfw' on invalid stored value", () => {
    localStorage.setItem("theme", "bogus");
    theme.init();
    expect(theme.current).toBe("sfw");
  });

  it("set('nsfw') persists to localStorage and applies data-theme", () => {
    theme.init();
    theme.set("nsfw");
    expect(localStorage.getItem("theme")).toBe("nsfw");
    expect(document.documentElement.getAttribute("data-theme")).toBe("nsfw");
  });

  it("toggle() flips between sfw and nsfw", () => {
    theme.init();
    theme.toggle();
    expect(theme.current).toBe("nsfw");
    theme.toggle();
    expect(theme.current).toBe("sfw");
  });

  it("init() applies current value as data-theme attribute", () => {
    localStorage.setItem("theme", "nsfw");
    theme.init();
    expect(document.documentElement.getAttribute("data-theme")).toBe("nsfw");
  });
});
