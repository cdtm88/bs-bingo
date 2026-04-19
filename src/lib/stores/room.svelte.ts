import { PartySocket } from "partysocket";
import * as v from "valibot";
import {
  ServerMessage,
  PARTY_NAME as _PARTY_NAME,
  type RoomState,
  type WordEntry,
  type ClientMessage,
  type BoardCell,
  type WinningLine,
} from "$lib/protocol/messages";
import { getOrCreatePlayer } from "$lib/session";
import { theme } from "./theme.svelte";

// Re-export PARTY_NAME for tests and other consumers
export const PARTY_NAME = _PARTY_NAME;

// Phase 6 — per-theme confetti palettes (CONTEXT D-08, UI-SPEC line 231).
const sfwConfettiPalette = ["#F5D547", "#F5F5F7", "#F87171"];
const nsfwConfettiPalette = ["#D4520A", "#C9A96B", "#7A4F2A", "#F5EDD6", "#2C1810"];

// Global-overlay status the layout's Banner reads. Set by whatever room page is mounted.
export const connection = $state<{
  status: "idle" | "connecting" | "open" | "reconnecting" | "closed";
}>({ status: "idle" });

const DEFAULT_GRID_SIZE: 3 | 4 | 5 = 3;

export function createRoomStore(code: string) {
  const player = getOrCreatePlayer(code);

  let state = $state<RoomState | null>(null);
  let status = $state<"connecting" | "open" | "reconnecting" | "closed">("connecting");
  let words = $state<WordEntry[]>([]);
  let usedPacks = $state<Set<string>>(new Set());
  let lastError = $state<{ code: string; message?: string } | null>(null);
  let board = $state<BoardCell[] | null>(null);
  let playerMarks = $state<Record<string, number>>({});
  let markedCellIds = $state<Set<string>>(new Set());
  let winner = $state<{ playerId: string; displayName: string } | null>(null);
  let winningLine = $state<WinningLine | null>(null);
  let winningCellIds = $state<string[]>([]);
  let winningWords = $state<string[]>([]);
  let winningGridSize = $state<3 | 4 | 5>(DEFAULT_GRID_SIZE);
  let disconnectedPlayerIds = $state<Set<string>>(new Set());
  // Phase 5 gap-04 (RESI-03): tracks disconnect-event epoch per player so a
  // reconnect during the 3s debounce window invalidates the pending re-add.
  // Not a $state rune — purely internal bookkeeping (no UI subscribes to it).
  const disconnectEpochs = new Map<string, number>();

  connection.status = "connecting";

  // host: use current page origin so PartySocket connects to the same-origin Worker
  // (Works for both wrangler dev at localhost:8787 and production Cloudflare deploy)
  const host = typeof window !== "undefined" ? window.location.host : "localhost:8787";
  const ws = new PartySocket({
    host,
    party: PARTY_NAME,
    room: code,
    query: { playerId: player.playerId }, // sent on every connect + reconnect (RESI-01/03)
  });

  ws.addEventListener("open", () => {
    status = "open";
    connection.status = "open";

    if (ws.retryCount > 0) {
      // Reconnect — server already knows us via query param; request full sync.
      ws.send(JSON.stringify({ type: "syncRequest" }));
    } else {
      // First connect — introduce ourselves.
      ws.send(
        JSON.stringify({
          type: "hello",
          playerId: player.playerId,
          displayName: player.displayName,
        })
      );
    }
  });

  ws.addEventListener("close", (ev) => {
    // A clean close (wasClean=true or code 1000/1001) means the server or client
    // intentionally terminated — treat as terminal. PartySocket sets wasClean=false
    // while actively reconnecting, so those stay as "reconnecting".
    const ce = ev as CloseEvent;
    const terminal = ce.wasClean || ce.code === 1000;
    const next = terminal ? "closed" : "reconnecting";
    status = next;
    connection.status = next;
  });

  ws.addEventListener("error", () => {
    status = "reconnecting";
    connection.status = "reconnecting";
  });

  ws.addEventListener("message", (ev) => {
    let raw: unknown;
    try {
      raw = JSON.parse((ev as MessageEvent).data);
    } catch {
      return; // ignore non-JSON frames
    }
    const parsed = v.safeParse(ServerMessage, raw);
    if (!parsed.success) return;
    const msg = parsed.output;
    switch (msg.type) {
      case "roomState":
        state = msg.state;
        words = msg.state.words ?? [];
        usedPacks = new Set(msg.state.usedPacks ?? []);
        break;
      case "playerJoined":
        if (state && !state.players.some((p) => p.playerId === msg.player.playerId)) {
          state.players = [...state.players, msg.player];
        }
        break;
      case "playerLeft":
        if (state) state.players = state.players.filter((p) => p.playerId !== msg.playerId);
        disconnectEpochs.delete(msg.playerId);
        break;
      case "error":
        lastError = { code: msg.code, message: msg.message };
        if (import.meta.env.DEV) console.warn("Server error:", msg.code, msg.message);
        break;
      case "gameStarted":
        if (state) state = { ...state, phase: "playing" };
        break;
      case "wordAdded":
        if (!words.some((w) => w.wordId === msg.word.wordId)) {
          words = [...words, msg.word];
          if (state) state = { ...state, words };
        }
        break;
      case "wordRemoved":
        words = words.filter((w) => w.wordId !== msg.wordId);
        if (state) state = { ...state, words };
        break;
      case "boardAssigned":
        board = msg.cells;
        // Fresh board → no marks yet. Reassign (Pitfall 3) — never mutate existing Set.
        markedCellIds = new Set();
        break;
      case "wordMarked":
        // Reassign the object (Pitfall 3 analog) so runes see the change.
        playerMarks = { ...playerMarks, [msg.playerId]: msg.markCount };
        // Server echoes back cellId so the marking player's own set stays in sync
        // without an optimistic local flip (WR-01 fix). For other players we don't
        // track their individual cell marks (BOAR-06 — no layout info shared).
        if (msg.playerId === player.playerId) {
          const next = new Set(markedCellIds);
          if (next.has(msg.cellId)) next.delete(msg.cellId);
          else next.add(msg.cellId);
          markedCellIds = next;
        }
        break;
      case "winDeclared": {
        winner = { playerId: msg.winnerId, displayName: msg.winnerName };
        winningLine = msg.winningLine;
        winningCellIds = msg.winningCellIds;
        winningWords = msg.winningWords;
        winningGridSize = msg.gridSize;
        if (state) state = { ...state, phase: "ended" };

        // Fire confetti ONLY on the winner's client, ONLY in a browser.
        // Dynamic import keeps canvas-confetti out of the SSR bundle (Pitfall 3).
        if (typeof window !== "undefined" && msg.winnerId === player.playerId) {
          import("canvas-confetti")
            .then(({ default: confetti }) => {
              const reduce =
                typeof window.matchMedia === "function" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              const palette =
                theme.current === "nsfw" ? nsfwConfettiPalette : sfwConfettiPalette;
              confetti(
                reduce
                  ? {
                      particleCount: 60,
                      spread: 90,
                      ticks: 100,
                      origin: { y: 0.25 },
                      colors: palette,
                    }
                  : {
                      particleCount: 180,
                      spread: 90,
                      startVelocity: 45,
                      ticks: 220,
                      origin: { y: 0.25 },
                      colors: palette,
                    }
              );
            })
            .catch(() => {
              // Silent — EndScreen still renders if the module fails to load.
            });
        }
        break;
      }
      case "gameReset": {
        board = null;
        markedCellIds = new Set();
        playerMarks = {};
        winner = null;
        winningLine = null;
        winningCellIds = [];
        winningWords = [];
        winningGridSize = DEFAULT_GRID_SIZE;
        if (state) state = { ...state, phase: "lobby" };
        break;
      }
      case "syncResponse": {
        // Atomically restore all state from the server snapshot (RESI-03).
        state = msg.state;
        words = msg.state.words ?? [];
        usedPacks = new Set(msg.state.usedPacks ?? []);
        if (msg.board !== null) {
          board = msg.board;
        }
        markedCellIds = new Set(msg.markedCellIds);
        // Restore winner if game is in ended phase
        if (msg.state.winnerId) {
          const winnerPlayer = msg.state.players.find((p) => p.playerId === msg.state.winnerId);
          winner = {
            playerId: msg.state.winnerId,
            displayName: msg.state.winnerName ?? winnerPlayer?.displayName ?? "Someone",
          };
        } else {
          winner = null;
        }
        // Phase 5 gap-04 (RESI-03): restore win-line details so the EndScreen
        // guard ({#if store?.winner && store?.winningLine}) passes for a player
        // reconnecting during the ended phase.
        if (msg.winningLine !== null) {
          winningLine = msg.winningLine;
          winningCellIds = msg.winningCellIds;
          winningWords = msg.winningWords;
          winningGridSize = msg.gridSize ?? DEFAULT_GRID_SIZE;
        } else {
          winningLine = null;
          winningCellIds = [];
          winningWords = [];
          winningGridSize = DEFAULT_GRID_SIZE;
        }
        break;
      }
      case "playerDisconnected": {
        // Mark player as disconnected in roster (RESI-04 peer indicator).
        // Use a 3s client-side debounce to avoid flicker on brief drops.
        // gap-04 race fix (RESI-03): a playerReconnected arriving during the
        // debounce window must prevent the re-add. We track a per-player
        // reconnect epoch so the closure only applies the visual if the latest
        // event for this pid was the disconnect, not a reconnect.
        const pid = msg.playerId;
        const epoch = (disconnectEpochs.get(pid) ?? 0) + 1;
        disconnectEpochs.set(pid, epoch);
        setTimeout(() => {
          // Abort if a playerReconnected bumped the epoch during the window.
          if (disconnectEpochs.get(pid) !== epoch) return;
          if (state?.players.some((p) => p.playerId === pid)) {
            disconnectedPlayerIds = new Set([...disconnectedPlayerIds, pid]);
          }
        }, 3000);
        break;
      }
      case "playerReconnected": {
        // Clear disconnected flag (RESI-04) + invalidate any pending debounce
        // timer for this pid (gap-04 race fix).
        const pid = msg.playerId;
        disconnectEpochs.set(pid, (disconnectEpochs.get(pid) ?? 0) + 1);
        disconnectedPlayerIds = new Set([...disconnectedPlayerIds].filter((id) => id !== pid));
        break;
      }
      case "hostChanged": {
        // Update host assignment in roster (RESI-05).
        if (state) {
          state = {
            ...state,
            hostId: msg.newHostId,
            players: state.players.map((p) => ({
              ...p,
              isHost: p.playerId === msg.newHostId,
            })),
          };
        }
        break;
      }
    }
  });

  function handleVisibilityChange() {
    if (document.visibilityState === "visible" && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "syncRequest" }));
    }
    // If WS is not open, PartySocket is already reconnecting; the open handler will sync.
  }
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return {
    get state() {
      return state;
    },
    get status() {
      return status;
    },
    send(msg: ClientMessage) {
      ws.send(JSON.stringify(msg));
    },
    get words() {
      return words;
    },
    get usedPacks() {
      return usedPacks;
    },
    get lastError() {
      return lastError;
    },
    clearError() {
      lastError = null;
    },
    disconnect() {
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      ws.close();
      connection.status = "closed";
    },
    get board() {
      return board;
    },
    get playerMarks() {
      return playerMarks;
    },
    get markedCellIds() {
      return markedCellIds;
    },
    get disconnectedPlayerIds() {
      return disconnectedPlayerIds;
    },
    toggleMark(cellId: string) {
      // No optimistic flip — server echoes wordMarked (with cellId) on success.
      // markedCellIds is updated inside the "wordMarked" handler above (WR-01 fix).
      ws.send(JSON.stringify({ type: "markWord", cellId }));
    },
    get winner() {
      return winner;
    },
    get winningLine() {
      return winningLine;
    },
    get winningCellIds() {
      return winningCellIds;
    },
    get winningWords() {
      return winningWords;
    },
    get winningGridSize() {
      return winningGridSize;
    },
    startNewGame() {
      ws.send(JSON.stringify({ type: "startNewGame" }));
    },
  };
}
