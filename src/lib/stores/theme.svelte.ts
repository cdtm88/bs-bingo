// Phase 6 — theme store (CONTEXT D-13, RESEARCH Pattern 1)
// Mirrors src/lib/session.ts storage shape + src/lib/stores/room.svelte.ts runes+getter shape.
// Pitfall 2: export a stable object, not a bare $state primitive.

type Theme = "sfw" | "nsfw";
const STORAGE_KEY = "theme";

function readStored(): Theme {
  if (typeof localStorage === "undefined") return "sfw"; // D-03 SSR default
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "nsfw" ? "nsfw" : "sfw"; // invalid → sfw per D-03
}

function applyAttribute(t: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", t);
}

// Module-scope $state wrapped in an object so cross-file consumers read through the getter.
const themeState = $state<{ current: Theme }>({ current: "sfw" });

export const theme = {
  get current(): Theme {
    return themeState.current;
  },
  init(): void {
    themeState.current = readStored();
    applyAttribute(themeState.current);
  },
  set(next: Theme): void {
    themeState.current = next;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
    }
    applyAttribute(next);
  },
  toggle(): void {
    this.set(themeState.current === "sfw" ? "nsfw" : "sfw");
  },
};
