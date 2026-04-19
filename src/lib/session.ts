import { nanoid } from "nanoid";

export type PlayerSession = { playerId: string; displayName: string };

export function getOrCreatePlayer(code: string): PlayerSession {
  const key = `bsbingo_player_${code}`;
  const existing = sessionStorage.getItem(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as unknown;
      if (
        parsed !== null &&
        typeof parsed === "object" &&
        typeof (parsed as Record<string, unknown>).playerId === "string" &&
        typeof (parsed as Record<string, unknown>).displayName === "string"
      ) {
        return parsed as PlayerSession;
      }
    } catch {
      // Corrupted entry — fall through.
    }
    // Invalid or stale schema — clear and recreate (IN-03).
    sessionStorage.removeItem(key);
  }
  const p: PlayerSession = { playerId: nanoid(), displayName: "" };
  sessionStorage.setItem(key, JSON.stringify(p));
  return p;
}

export function setDisplayName(code: string, displayName: string): void {
  const key = `bsbingo_player_${code}`;
  const cur = getOrCreatePlayer(code);
  sessionStorage.setItem(key, JSON.stringify({ ...cur, displayName }));
}
