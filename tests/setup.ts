// Vitest setup — ensure localStorage has the full Web Storage API surface.
//
// Node ≥25 with --localstorage-file exposes a global localStorage that omits
// `.clear()` and `.key()`.  When vitest runs under jsdom it re-assigns
// window.localStorage, but the jsdom shim may not restore those methods if
// the built-in global already exists.  This guard ensures tests that call
// `localStorage.clear()` work regardless of which implementation is active.

if (typeof localStorage !== "undefined") {
  if (typeof localStorage.clear !== "function") {
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          for (const k of Object.keys(store)) delete store[k];
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
        get length() {
          return Object.keys(store).length;
        },
      },
    });
  }
}
