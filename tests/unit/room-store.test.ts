import { describe, it, expect, vi, beforeEach } from "vitest";

const confettiMock = vi.fn();
vi.mock("canvas-confetti", () => ({ default: confettiMock }));

// vi.hoisted runs before vi.mock factory, solving hoisting issues
const { MockPartySocket, getLastInstance, resetInstance } = vi.hoisted(() => {
  let _lastInstance: any = null;

  class MockPartySocket {
    listeners: Record<string, ((e: any) => void)[]> = {};
    lastSent: string | null = null;
    closed = false;
    opts: any;

    constructor(opts: any) {
      this.opts = opts;
      _lastInstance = this;
    }

    addEventListener(evt: string, fn: (e: any) => void) {
      (this.listeners[evt] ??= []).push(fn);
    }

    send(data: string) {
      this.lastSent = data;
    }

    close() {
      this.closed = true;
    }

    emit(evt: string, data: any) {
      (this.listeners[evt] ?? []).forEach((fn) => fn(data));
    }
  }

  return {
    MockPartySocket,
    getLastInstance: () => _lastInstance as InstanceType<typeof MockPartySocket> | null,
    resetInstance: () => { _lastInstance = null; },
  };
});

vi.mock("partysocket", () => ({
  PartySocket: MockPartySocket,
}));

vi.mock("../../src/lib/session", () => ({
  getOrCreatePlayer: vi.fn(() => ({
    playerId: "test-player-id",
    displayName: "Tester",
  })),
}));

import { createRoomStore, PARTY_NAME } from "../../src/lib/stores/room.svelte";

describe("PARTY_NAME", () => {
  it("equals 'game-room'", () => {
    expect(PARTY_NAME).toBe("game-room");
  });
});

describe("createRoomStore", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetInstance();
  });

  it("initial status is 'connecting'", () => {
    const store = createRoomStore("ABC123");
    expect(store.status).toBe("connecting");
  });

  it("initial state is null", () => {
    const store = createRoomStore("ABC123");
    expect(store.state).toBeNull();
  });

  it("creates a PartySocket with party: PARTY_NAME and room: code", () => {
    createRoomStore("ABC123");
    const ws = getLastInstance();
    expect(ws).not.toBeNull();
    expect(ws!.opts.party).toBe("game-room");
    expect(ws!.opts.room).toBe("ABC123");
  });

  it("status becomes 'open' and sends hello when open fires", () => {
    const store = createRoomStore("ABC123");
    expect(store.status).toBe("connecting");

    const ws = getLastInstance()!;
    ws.emit("open", {});

    expect(store.status).toBe("open");
    expect(ws.lastSent).not.toBeNull();

    const sent = JSON.parse(ws.lastSent!);
    expect(sent.type).toBe("hello");
    expect(sent.playerId).toBe("test-player-id");
    expect(sent.displayName).toBe("Tester");
  });

  it("populates state when roomState message is received", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    const roomState = {
      code: "ABC123",
      phase: "lobby",
      hostId: "test-player-id",
      players: [
        { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
      ],
      words: [],
      usedPacks: [],
    };

    ws.emit("message", { data: JSON.stringify({ type: "roomState", state: roomState }) });

    expect(store.state).not.toBeNull();
    expect(store.state!.code).toBe("ABC123");
    expect(store.state!.players).toHaveLength(1);
  });

  it("appends a player when playerJoined message is received", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    const roomState = {
      code: "ABC123",
      phase: "lobby",
      hostId: "test-player-id",
      players: [
        { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
      ],
      words: [],
      usedPacks: [],
    };
    ws.emit("message", { data: JSON.stringify({ type: "roomState", state: roomState }) });
    expect(store.state!.players).toHaveLength(1);

    const newPlayer = { playerId: "player-2", displayName: "Bob", isHost: false, joinedAt: 2000 };
    ws.emit("message", { data: JSON.stringify({ type: "playerJoined", player: newPlayer }) });

    expect(store.state!.players).toHaveLength(2);
    expect(store.state!.players[1].playerId).toBe("player-2");
  });

  it("removes a player when playerLeft message is received", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    const roomState = {
      code: "ABC123",
      phase: "lobby",
      hostId: "test-player-id",
      players: [
        { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
        { playerId: "player-2", displayName: "Bob", isHost: false, joinedAt: 2000 },
      ],
      words: [],
      usedPacks: [],
    };
    ws.emit("message", { data: JSON.stringify({ type: "roomState", state: roomState }) });
    expect(store.state!.players).toHaveLength(2);

    ws.emit("message", { data: JSON.stringify({ type: "playerLeft", playerId: "player-2" }) });

    expect(store.state!.players).toHaveLength(1);
    expect(store.state!.players[0].playerId).toBe("test-player-id");
  });

  it("status becomes 'reconnecting' when close fires", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    expect(store.status).toBe("open");

    ws.emit("close", {});
    expect(store.status).toBe("reconnecting");
  });

  it("drops messages with unknown shape (invalid Valibot parse)", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    ws.emit("message", { data: JSON.stringify({ type: "unknown_type", garbage: true }) });

    expect(store.state).toBeNull();
  });

  it("disconnect() closes the WebSocket", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    store.disconnect();
    expect(ws.closed).toBe(true);
  });

  it("initial board is null", () => {
    const store = createRoomStore("ABC123");
    expect(store.board).toBeNull();
  });

  it("initial playerMarks is empty object", () => {
    const store = createRoomStore("ABC123");
    expect(Object.keys(store.playerMarks)).toHaveLength(0);
  });

  it("initial markedCellIds is empty Set", () => {
    const store = createRoomStore("ABC123");
    expect(store.markedCellIds).toBeInstanceOf(Set);
    expect(store.markedCellIds.size).toBe(0);
  });

  it("sets board when boardAssigned message is received", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    const cells = [
      { cellId: "c1", wordId: "w1", text: "Synergy", blank: false },
      { cellId: "c2", wordId: null, text: null, blank: true },
    ];
    ws.emit("message", { data: JSON.stringify({ type: "boardAssigned", cells }) });

    expect(store.board).toEqual(cells);
  });

  it("resets markedCellIds to empty Set when boardAssigned is received", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    // Pre-populate markedCellIds via server echo (toggleMark no longer optimistic)
    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "test-player-id", markCount: 1, cellId: "some-old-cell" }) });
    expect(store.markedCellIds.size).toBe(1);

    const cells = [{ cellId: "c1", wordId: "w1", text: "New", blank: false }];
    ws.emit("message", { data: JSON.stringify({ type: "boardAssigned", cells }) });

    expect(store.markedCellIds.size).toBe(0);
  });

  it("updates playerMarks when wordMarked message is received", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "p1", markCount: 3, cellId: "c1" }) });

    expect(store.playerMarks["p1"]).toBe(3);
  });

  it("wordMarked updates reassign the playerMarks object (immutable, Pitfall 3 analog)", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    const ref1 = store.playerMarks;
    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "p1", markCount: 1, cellId: "c1" }) });
    const ref2 = store.playerMarks;

    expect(ref1).not.toBe(ref2);
    expect(ref2["p1"]).toBe(1);
  });

  it("wordMarked for multiple players keeps entries independent", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "p1", markCount: 2, cellId: "c1" }) });
    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "p2", markCount: 5, cellId: "c2" }) });

    expect(store.playerMarks["p1"]).toBe(2);
    expect(store.playerMarks["p2"]).toBe(5);
  });

  it("toggleMark sends markWord without optimistic update; server echo updates markedCellIds", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    ws.lastSent = null;

    store.toggleMark("cell-1");

    // No optimistic flip — markedCellIds unchanged until server echoes wordMarked
    expect(store.markedCellIds.has("cell-1")).toBe(false);
    expect(ws.lastSent).not.toBeNull();
    expect(JSON.parse(ws.lastSent!)).toEqual({ type: "markWord", cellId: "cell-1" });

    // After server echo, markedCellIds is updated
    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "test-player-id", markCount: 1, cellId: "cell-1" }) });
    expect(store.markedCellIds.has("cell-1")).toBe(true);
  });

  it("server-echo toggles: second wordMarked for same cell removes it", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "test-player-id", markCount: 1, cellId: "cell-1" }) });
    expect(store.markedCellIds.has("cell-1")).toBe(true);
    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "test-player-id", markCount: 0, cellId: "cell-1" }) });
    expect(store.markedCellIds.has("cell-1")).toBe(false);
  });

  it("wordMarked reassigns markedCellIds Set reference (Pitfall 3)", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    const ref1 = store.markedCellIds;
    ws.emit("message", { data: JSON.stringify({ type: "wordMarked", playerId: "test-player-id", markCount: 1, cellId: "cell-1" }) });
    const ref2 = store.markedCellIds;

    expect(ref1).not.toBe(ref2);
  });
});

describe("createRoomStore — Phase 4 (win + reset)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetInstance();
    confettiMock.mockClear();
  });

  type WinLine = { type: "row" | "col" | "diagonal"; index: number };

  function seedRoomState(ws: InstanceType<typeof MockPartySocket>, overrides: Record<string, unknown> = {}) {
    const roomState = {
      code: "ABC123",
      phase: "playing",
      hostId: "test-player-id",
      players: [
        { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
        { playerId: "player-2", displayName: "Bob", isHost: false, joinedAt: 2000 },
      ],
      words: [
        { wordId: "w1", text: "Synergy", submittedBy: "test-player-id" },
      ],
      usedPacks: ["corporate-classics"],
      ...overrides,
    };
    ws.emit("message", { data: JSON.stringify({ type: "roomState", state: roomState }) });
  }

  function emitWinDeclared(
    ws: InstanceType<typeof MockPartySocket>,
    opts: { winnerId: string; winnerName?: string; line?: WinLine; cellIds?: string[]; words?: string[]; gridSize?: 3 | 4 | 5 }
  ) {
    ws.emit("message", {
      data: JSON.stringify({
        type: "winDeclared",
        winnerId: opts.winnerId,
        winnerName: opts.winnerName ?? "Alice",
        winningLine: opts.line ?? { type: "row", index: 0 },
        winningCellIds: opts.cellIds ?? ["c1", "c2", "c3"],
        winningWords: opts.words ?? ["Alpha", "Beta", "Gamma"],
        gridSize: opts.gridSize ?? 3,
      }),
    });
  }

  it("S1: winDeclared (self-winner) sets winner/winningLine/winningCellIds and flips phase to 'ended'", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    seedRoomState(ws);

    emitWinDeclared(ws, {
      winnerId: "test-player-id",
      winnerName: "Tester",
      line: { type: "row", index: 2 },
      cellIds: ["c7", "c8", "c9"],
    });

    expect(store.winner).toEqual({ playerId: "test-player-id", displayName: "Tester" });
    expect(store.winningLine).toEqual({ type: "row", index: 2 });
    expect(store.winningCellIds).toEqual(["c7", "c8", "c9"]);
    expect(store.state!.phase).toBe("ended");
  });

  it("S2: winDeclared (other winner) sets all three fields but does NOT fire confetti", async () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    seedRoomState(ws);

    emitWinDeclared(ws, {
      winnerId: "player-2",
      winnerName: "Bob",
      line: { type: "col", index: 1 },
      cellIds: ["c2", "c5", "c8"],
    });

    expect(store.winner).toEqual({ playerId: "player-2", displayName: "Bob" });
    expect(store.winningLine).toEqual({ type: "col", index: 1 });
    expect(store.winningCellIds).toEqual(["c2", "c5", "c8"]);
    expect(store.state!.phase).toBe("ended");

    // Give the microtask queue a flush just in case — then assert still 0.
    await Promise.resolve();
    await Promise.resolve();
    expect(confettiMock).not.toHaveBeenCalled();
  });

  it("S3: winDeclared (self-winner) fires confetti exactly once via dynamic import", async () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    seedRoomState(ws);

    emitWinDeclared(ws, { winnerId: "test-player-id", winnerName: "Tester" });

    await vi.waitFor(() => {
      expect(confettiMock).toHaveBeenCalledTimes(1);
    });

    const cfg = confettiMock.mock.calls[0][0] as { particleCount: number };
    expect([60, 180]).toContain(cfg.particleCount);
    expect(store.winner).toEqual({ playerId: "test-player-id", displayName: "Tester" });
  });

  it("S4: gameReset clears all 7 fields and flips phase to 'lobby'", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    seedRoomState(ws);

    // Pre-populate game-scoped fields
    ws.emit("message", {
      data: JSON.stringify({
        type: "boardAssigned",
        cells: [
          { cellId: "c1", wordId: "w1", text: "Synergy", blank: false },
          { cellId: "c2", wordId: null, text: null, blank: true },
        ],
      }),
    });
    store.toggleMark("c1");
    ws.emit("message", {
      data: JSON.stringify({ type: "wordMarked", playerId: "test-player-id", markCount: 1, cellId: "c1" }),
    });
    emitWinDeclared(ws, { winnerId: "player-2" });

    expect(store.board).not.toBeNull();
    expect(store.markedCellIds.size).toBeGreaterThan(0);
    expect(Object.keys(store.playerMarks).length).toBeGreaterThan(0);
    expect(store.winner).not.toBeNull();
    expect(store.winningLine).not.toBeNull();
    expect(store.winningCellIds.length).toBeGreaterThan(0);

    ws.emit("message", { data: JSON.stringify({ type: "gameReset" }) });

    expect(store.board).toBeNull();
    expect(store.markedCellIds).toBeInstanceOf(Set);
    expect(store.markedCellIds.size).toBe(0);
    expect(Object.keys(store.playerMarks)).toHaveLength(0);
    expect(store.winner).toBeNull();
    expect(store.winningLine).toBeNull();
    expect(store.winningCellIds).toEqual([]);
    expect(store.state!.phase).toBe("lobby");
  });

  it("S5: gameReset does NOT touch words, players, hostId, usedPacks", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    seedRoomState(ws);

    const wordsBefore = store.words;
    const playersBefore = store.state!.players;
    const hostIdBefore = store.state!.hostId;
    const usedPacksBefore = new Set(store.usedPacks);

    ws.emit("message", { data: JSON.stringify({ type: "gameReset" }) });

    expect(store.words).toEqual(wordsBefore);
    expect(store.state!.players).toEqual(playersBefore);
    expect(store.state!.hostId).toBe(hostIdBefore);
    expect(Array.from(store.usedPacks)).toEqual(Array.from(usedPacksBefore));
  });

  it("S6: startNewGame() sends a { type: 'startNewGame' } frame over the WS", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    ws.lastSent = null;

    store.startNewGame();

    expect(ws.lastSent).toBe(JSON.stringify({ type: "startNewGame" }));
  });

  it("S7: winner/winningLine/winningCellIds getters return current reactive values", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    seedRoomState(ws);

    expect(store.winner).toBeNull();
    expect(store.winningLine).toBeNull();
    expect(store.winningCellIds).toEqual([]);

    emitWinDeclared(ws, {
      winnerId: "player-2",
      winnerName: "Bob",
      line: { type: "diagonal", index: 1 },
      cellIds: ["c3", "c5", "c7"],
    });

    expect(store.winner).toEqual({ playerId: "player-2", displayName: "Bob" });
    expect(store.winningLine).toEqual({ type: "diagonal", index: 1 });
    expect(store.winningCellIds).toEqual(["c3", "c5", "c7"]);
  });
});

// ---------------------------------------------------------------------------
// Phase 5 gap-04 (RESI-03, plan 05-04): syncResponse win-field restoration
// + playerDisconnected/Reconnected debounce race
// ---------------------------------------------------------------------------

describe("createRoomStore — Phase 5 gap-04 (syncResponse win + debounce race)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    resetInstance();
    confettiMock.mockClear();
  });

  function endedRoomState(overrides: Record<string, unknown> = {}) {
    return {
      code: "ABC123",
      phase: "ended" as const,
      hostId: "test-player-id",
      players: [
        { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
      ],
      words: [],
      usedPacks: [],
      winnerId: "player-2",
      winnerName: "Bob",
      ...overrides,
    };
  }

  function lobbyRoomState(overrides: Record<string, unknown> = {}) {
    return {
      code: "ABC123",
      phase: "lobby" as const,
      hostId: "test-player-id",
      players: [
        { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
      ],
      words: [],
      usedPacks: [],
      ...overrides,
    };
  }

  it("C1-gap04: syncResponse in ended phase restores winningLine/CellIds/Words/GridSize", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    ws.emit("message", {
      data: JSON.stringify({
        type: "syncResponse",
        state: endedRoomState(),
        board: null,
        markedCellIds: [],
        winningLine: { type: "row", index: 0 },
        winningCellIds: ["c1", "c2", "c3"],
        winningWords: ["A", "B", "C"],
        gridSize: 3,
      }),
    });

    expect(store.winningLine).toEqual({ type: "row", index: 0 });
    expect(store.winningCellIds).toEqual(["c1", "c2", "c3"]);
    expect(store.winningWords).toEqual(["A", "B", "C"]);
    expect(store.winningGridSize).toBe(3);
    // winner derives from state.winnerId (existing behaviour)
    expect(store.winner).toEqual({ playerId: "player-2", displayName: "Bob" });
  });

  it("C2-gap04: syncResponse in lobby phase resets win fields to null/[] defaults", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    // Preload some stale win state (simulate stale client after gameReset race)
    ws.emit("message", {
      data: JSON.stringify({
        type: "winDeclared",
        winnerId: "player-2",
        winnerName: "Bob",
        winningLine: { type: "row", index: 0 },
        winningCellIds: ["c1", "c2", "c3"],
        winningWords: ["A", "B", "C"],
        gridSize: 3,
      }),
    });
    expect(store.winningLine).not.toBeNull();

    // Now receive a lobby syncResponse with nulled win fields
    ws.emit("message", {
      data: JSON.stringify({
        type: "syncResponse",
        state: lobbyRoomState(),
        board: null,
        markedCellIds: [],
        winningLine: null,
        winningCellIds: [],
        winningWords: [],
        gridSize: null,
      }),
    });

    expect(store.winningLine).toBeNull();
    expect(store.winningCellIds).toEqual([]);
    expect(store.winningWords).toEqual([]);
    expect(store.winningGridSize).toBe(3); // default fallback
    expect(store.winner).toBeNull();
  });

  it("C3-gap04: syncResponse in playing phase also resets win fields", () => {
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});

    ws.emit("message", {
      data: JSON.stringify({
        type: "syncResponse",
        state: lobbyRoomState({ phase: "playing" }),
        board: null,
        markedCellIds: [],
        winningLine: null,
        winningCellIds: [],
        winningWords: [],
        gridSize: null,
      }),
    });

    expect(store.winningLine).toBeNull();
    expect(store.winningCellIds).toEqual([]);
    expect(store.winningWords).toEqual([]);
    expect(store.winner).toBeNull();
  });

  it("C4-gap04: playerReconnected arriving during debounce invalidates the disconnect re-add", async () => {
    vi.useFakeTimers();
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    // Seed state so state?.players.some(...) check passes for "p1"
    ws.emit("message", {
      data: JSON.stringify({
        type: "roomState",
        state: lobbyRoomState({
          players: [
            { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
            { playerId: "p1", displayName: "Alice", isHost: false, joinedAt: 2000 },
          ],
        }),
      }),
    });

    // Disconnect p1 at t=0
    ws.emit("message", { data: JSON.stringify({ type: "playerDisconnected", playerId: "p1" }) });
    expect(store.disconnectedPlayerIds.has("p1")).toBe(false);

    // Reconnect p1 at t=2s (mid-debounce)
    vi.advanceTimersByTime(2000);
    ws.emit("message", { data: JSON.stringify({ type: "playerReconnected", playerId: "p1", isHost: false }) });

    // Past the 3s window — pending timer from playerDisconnected must NOT re-add p1.
    vi.advanceTimersByTime(2000); // now at t=4s
    expect(store.disconnectedPlayerIds.has("p1")).toBe(false);
    vi.useRealTimers();
  });

  it("C5-gap04: playerDisconnected without reconnect still adds to disconnected set after 3s", async () => {
    vi.useFakeTimers();
    const store = createRoomStore("ABC123");
    const ws = getLastInstance()!;
    ws.emit("open", {});
    ws.emit("message", {
      data: JSON.stringify({
        type: "roomState",
        state: lobbyRoomState({
          players: [
            { playerId: "test-player-id", displayName: "Tester", isHost: true, joinedAt: 1000 },
            { playerId: "p1", displayName: "Alice", isHost: false, joinedAt: 2000 },
          ],
        }),
      }),
    });

    ws.emit("message", { data: JSON.stringify({ type: "playerDisconnected", playerId: "p1" }) });
    expect(store.disconnectedPlayerIds.has("p1")).toBe(false);

    vi.advanceTimersByTime(3500); // past 3s window
    expect(store.disconnectedPlayerIds.has("p1")).toBe(true);
    vi.useRealTimers();
  });
});
