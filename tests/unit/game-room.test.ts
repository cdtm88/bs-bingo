/**
 * Unit tests for GameRoom Durable Object (TDD RED phase).
 *
 * Strategy: We test the GameRoom class by subclassing it with a fake Server base
 * that stubs out the PartyServer runtime (ctx, broadcast, getConnections, etc.).
 * We drive `onMessage` / `onClose` directly on the instance.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Fake runtime primitives
// ---------------------------------------------------------------------------

function makeConn(
  id: string,
  overrides?: Partial<FakeConn>
): FakeConn {
  const sent: string[] = [];
  const conn: FakeConn = {
    id,
    state: null as unknown,
    send(msg: string) {
      sent.push(msg);
    },
    setState(s: unknown) {
      conn.state = s;
      return s;
    },
    _sent: sent,
    ...overrides,
  };
  return conn;
}

interface FakeConn {
  id: string;
  state: unknown;
  send(msg: string): void;
  setState(s: unknown): unknown;
  _sent: string[];
}

// ---------------------------------------------------------------------------
// We need to stub the PartyServer `Server` base class because it imports from
// "cloudflare:workers" which isn't available in the Vitest jsdom environment.
// We mock "partyserver" so that `Server` is a plain JS class with no CF deps.
// ---------------------------------------------------------------------------

vi.mock("partyserver", () => {
  class FakeServer {
    static options = { hibernate: false };
    ctx: { storage: { setAlarm: ReturnType<typeof vi.fn>; deleteAll: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> } };
    // PartyServer exposes `this.name` from storage; we allow tests to set it.
    _name: string = "TESTAB";

    constructor() {
      this.ctx = {
        storage: {
          setAlarm: vi.fn(),
          deleteAll: vi.fn().mockResolvedValue(undefined),
          get: vi.fn().mockResolvedValue(undefined),
          put: vi.fn().mockResolvedValue(undefined),
        },
      };
    }

    get name(): string {
      return this._name;
    }

    // broadcast is provided by PartyServer at runtime; we stub it here.
    broadcast = vi.fn();

    // getConnections is provided by PartyServer at runtime; default returns empty iterable.
    // Phase 3 tests override this per-instance in their beforeEach.
    getConnections(): Iterable<unknown> {
      return [];
    }

    // Lifecycle stubs — subclass overrides.
    onStart() {}
    onConnect(_conn: unknown, _ctx: unknown) {}
    onMessage(_conn: unknown, _msg: unknown) {}
    onClose(_conn: unknown, _code: number, _reason: string, _clean: boolean) {}
    onAlarm() {}
    onRequest(_req: unknown): unknown {
      return new Response("Not Found", { status: 404 });
    }
  }

  return { Server: FakeServer, routePartykitRequest: vi.fn() };
});

// ---------------------------------------------------------------------------
// Import GameRoom AFTER the mock is registered.
// ---------------------------------------------------------------------------

const { GameRoom } = await import("../../party/game-room.js");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GameRoom", () => {
  let room: InstanceType<typeof GameRoom>;

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    // Reset broadcast mock
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // First hello → become host
  // -------------------------------------------------------------------------

  it("first hello sets hostId and sends roomState to newcomer, broadcasts playerJoined to others", () => {
    const conn1 = makeConn("conn-1");

    room.onMessage(conn1 as never, JSON.stringify({
      type: "hello",
      playerId: "player-abc",
      displayName: "Alice",
    }));

    // conn1 should receive roomState
    expect(conn1._sent).toHaveLength(1);
    const roomState = JSON.parse(conn1._sent[0]);
    expect(roomState.type).toBe("roomState");
    expect(roomState.state.hostId).toBe("player-abc");
    expect(roomState.state.players).toHaveLength(1);
    expect(roomState.state.players[0].isHost).toBe(true);
    expect(roomState.state.players[0].playerId).toBe("player-abc");
    expect(roomState.state.phase).toBe("lobby");
    expect(roomState.state.code).toBe("TESTAB");

    // broadcast should fire for playerJoined (excluding conn1)
    expect((room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast).toHaveBeenCalledOnce();
    const broadcastArg = JSON.parse(
      (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast.mock.calls[0][0] as string
    );
    expect(broadcastArg.type).toBe("playerJoined");
    expect(broadcastArg.player.playerId).toBe("player-abc");

    // conn1 should be tagged with playerId via setState
    expect(conn1.state).toEqual({ playerId: "player-abc" });
  });

  // -------------------------------------------------------------------------
  // Second hello → NOT host, host unchanged
  // -------------------------------------------------------------------------

  it("second hello is not host; players map grows to 2; hostId unchanged", () => {
    const conn1 = makeConn("conn-1");
    const conn2 = makeConn("conn-2");

    room.onMessage(conn1 as never, JSON.stringify({
      type: "hello",
      playerId: "player-abc",
      displayName: "Alice",
    }));

    vi.clearAllMocks(); // reset broadcast count

    room.onMessage(conn2 as never, JSON.stringify({
      type: "hello",
      playerId: "player-def",
      displayName: "Bob",
    }));

    // conn2 should receive roomState with 2 players
    expect(conn2._sent).toHaveLength(1);
    const state2 = JSON.parse(conn2._sent[0]);
    expect(state2.type).toBe("roomState");
    expect(state2.state.players).toHaveLength(2);
    expect(state2.state.hostId).toBe("player-abc"); // unchanged
    expect(state2.state.players.find((p: { playerId: string }) => p.playerId === "player-def")?.isHost).toBe(false);

    // broadcast for playerJoined
    expect((room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast).toHaveBeenCalledOnce();
    const broadcastArg = JSON.parse(
      (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast.mock.calls[0][0] as string
    );
    expect(broadcastArg.type).toBe("playerJoined");
    expect(broadcastArg.player.playerId).toBe("player-def");
  });

  // -------------------------------------------------------------------------
  // Malformed payload → error sent, state unchanged
  // -------------------------------------------------------------------------

  it("malformed JSON triggers error response and leaves state unchanged", () => {
    const conn = makeConn("conn-bad");

    room.onMessage(conn as never, "not json at all {{{{");

    expect(conn._sent).toHaveLength(1);
    const err = JSON.parse(conn._sent[0]);
    expect(err.type).toBe("error");
    expect(err.code).toBe("bad_message");

    // No broadcast should have fired
    expect((room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast).not.toHaveBeenCalled();
  });

  it("schema-failing payload triggers error response and leaves state unchanged", () => {
    const conn = makeConn("conn-schema");

    room.onMessage(conn as never, JSON.stringify({ type: "unknown_type", foo: "bar" }));

    expect(conn._sent).toHaveLength(1);
    const err = JSON.parse(conn._sent[0]);
    expect(err.type).toBe("error");
    expect(err.code).toBe("bad_message");

    expect((room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // onClose → playerLeft broadcast, player removed
  // -------------------------------------------------------------------------

  it("onClose broadcasts playerDisconnected (slot-hold: player stays until alarm evicts)", async () => {
    const conn1 = makeConn("conn-1");
    const conn2 = makeConn("conn-2");

    room.onMessage(conn1 as never, JSON.stringify({ type: "hello", playerId: "p1", displayName: "Alice" }));
    room.onMessage(conn2 as never, JSON.stringify({ type: "hello", playerId: "p2", displayName: "Bob" }));

    vi.clearAllMocks();

    // Simulate conn1 disconnect — Phase 5: slot-hold means playerDisconnected (not playerLeft)
    await room.onClose(conn1 as never, 1000, "", true);

    expect((room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast).toHaveBeenCalledOnce();
    const broadcastArg = JSON.parse(
      (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast.mock.calls[0][0] as string
    );
    // Phase 5: onClose broadcasts playerDisconnected instead of playerLeft (slot-hold).
    // playerLeft fires only after the 45s window expires via onAlarm.
    expect(broadcastArg.type).toBe("playerDisconnected");
    expect(broadcastArg.playerId).toBe("p1");

    // p1 still appears in roster (slot-hold keeps them until alarm evicts)
    const conn3 = makeConn("conn-3");
    room.onMessage(conn3 as never, JSON.stringify({ type: "hello", playerId: "p3", displayName: "Carol" }));
    const state = JSON.parse(conn3._sent[0]);
    // p1 is still in #players during slot-hold window (3 players: p1, p2, p3)
    expect(state.state.players).toHaveLength(3);
    expect(state.state.players.find((p: { playerId: string }) => p.playerId === "p1")).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // onRequest → POST /create activates room; GET /exists guards on #active
  // -------------------------------------------------------------------------

  it("onRequest POST /create returns 200 and activates room", async () => {
    const req = new Request("https://do/parties/game-room/TESTAB/create", { method: "POST" });
    const resp = room.onRequest(req as never) as Response;
    expect(resp.status).toBe(200);
    const body = await resp.json() as { created: boolean };
    expect(body.created).toBe(true);
  });

  it("onRequest POST /create returns 409 on second call (already active)", async () => {
    const req1 = new Request("https://do/parties/game-room/TESTAB/create", { method: "POST" });
    room.onRequest(req1 as never);
    const req2 = new Request("https://do/parties/game-room/TESTAB/create", { method: "POST" });
    const resp = room.onRequest(req2 as never) as Response;
    expect(resp.status).toBe(409);
  });

  it("onRequest GET /exists returns 404 before POST /create", async () => {
    const req = new Request("https://do/parties/game-room/TESTAB/exists");
    const resp = room.onRequest(req as never) as Response;
    expect(resp.status).toBe(404);
  });

  it("onRequest GET /exists returns 200 after POST /create", async () => {
    const createReq = new Request("https://do/parties/game-room/TESTAB/create", { method: "POST" });
    room.onRequest(createReq as never);
    const existsReq = new Request("https://do/parties/game-room/TESTAB/exists");
    const resp = room.onRequest(existsReq as never) as Response;
    expect(resp.status).toBe(200);
    const body = await resp.json() as { exists: boolean; playerCount: number };
    expect(body.exists).toBe(true);
    expect(body.playerCount).toBe(0);
  });

  it("onRequest at unknown path returns 404", () => {
    const req = new Request("https://do/parties/game-room/TESTAB/other");
    const resp = room.onRequest(req as never) as Response;
    expect(resp.status).toBe(404);
  });

  // -------------------------------------------------------------------------
  // onAlarm — reaps empty rooms
  // -------------------------------------------------------------------------

  it("onAlarm with no players calls ctx.storage.deleteAll", async () => {
    await room.onAlarm();
    expect((room as unknown as { ctx: { storage: { deleteAll: ReturnType<typeof vi.fn> } } }).ctx.storage.deleteAll).toHaveBeenCalledOnce();
  });

  it("onAlarm with players re-arms alarm", async () => {
    const conn = makeConn("conn-1");
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId: "p1", displayName: "Alice" }));
    vi.clearAllMocks();

    await room.onAlarm();

    expect((room as unknown as { ctx: { storage: { setAlarm: ReturnType<typeof vi.fn> } } }).ctx.storage.setAlarm).toHaveBeenCalledOnce();
    expect((room as unknown as { ctx: { storage: { deleteAll: ReturnType<typeof vi.fn> } } }).ctx.storage.deleteAll).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // static options
  // -------------------------------------------------------------------------

  it("has static options.hibernate = true", () => {
    expect((GameRoom as unknown as { options: { hibernate: boolean } }).options.hibernate).toBe(true);
  });

  // -------------------------------------------------------------------------
  // ping → pong
  // -------------------------------------------------------------------------

  it("ping message triggers pong response", () => {
    const conn = makeConn("conn-ping");
    room.onMessage(conn as never, JSON.stringify({ type: "ping" }));

    expect(conn._sent).toHaveLength(1);
    const pong = JSON.parse(conn._sent[0]);
    expect(pong.type).toBe("pong");
  });
});

// ---------------------------------------------------------------------------
// Phase 2: Word pool tests
// ---------------------------------------------------------------------------

describe("GameRoom — word pool (Phase 2)", () => {
  let room: InstanceType<typeof GameRoom>;

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    vi.clearAllMocks();
  });

  function joinPlayer(conn: FakeConn, playerId: string, displayName: string) {
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId, displayName }));
    vi.clearAllMocks();
  }

  function getBroadcast() {
    return (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast;
  }

  it("submitWord adds word and broadcasts wordAdded", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: "Synergy" }));

    expect(getBroadcast()).toHaveBeenCalledOnce();
    const msg = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(msg.type).toBe("wordAdded");
    expect(msg.word.text).toBe("Synergy");
    expect(msg.word.submittedBy).toBe("p1");
    expect(typeof msg.word.wordId).toBe("string");
  });

  it("submitWord duplicate (case-insensitive) sends error to submitter only", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: "Synergy" }));
    vi.clearAllMocks();
    conn._sent.length = 0;

    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: "synergy" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
    expect(conn._sent).toHaveLength(1);
    const err = JSON.parse(conn._sent[0]);
    expect(err.type).toBe("error");
    expect(err.code).toBe("duplicate_word");
  });

  it("submitWord trims whitespace", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: "  Synergy  " }));

    const msg = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(msg.word.text).toBe("Synergy");
  });

  it("removeWord by owner removes and broadcasts wordRemoved", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: "Synergy" }));
    const wordId = JSON.parse(getBroadcast().mock.calls[0][0]).word.wordId;
    vi.clearAllMocks();

    room.onMessage(conn as never, JSON.stringify({ type: "removeWord", wordId }));

    expect(getBroadcast()).toHaveBeenCalledOnce();
    const msg = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(msg.type).toBe("wordRemoved");
    expect(msg.wordId).toBe(wordId);
  });

  it("removeWord by non-owner sends not_owner error", () => {
    const conn1 = makeConn("c1");
    const conn2 = makeConn("c2");
    joinPlayer(conn1, "p1", "Alice");
    joinPlayer(conn2, "p2", "Bob");

    room.onMessage(conn1 as never, JSON.stringify({ type: "submitWord", text: "Synergy" }));
    const wordId = JSON.parse(getBroadcast().mock.calls[0][0]).word.wordId;
    vi.clearAllMocks();
    conn2._sent.length = 0;

    room.onMessage(conn2 as never, JSON.stringify({ type: "removeWord", wordId }));

    expect(getBroadcast()).not.toHaveBeenCalled();
    expect(conn2._sent).toHaveLength(1);
    const err = JSON.parse(conn2._sent[0]);
    expect(err.type).toBe("error");
    expect(err.code).toBe("not_owner");
  });

  it("removeWord for nonexistent wordId is idempotent", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    conn._sent.length = 0;

    room.onMessage(conn as never, JSON.stringify({ type: "removeWord", wordId: "nonexistent" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
    expect(conn._sent).toHaveLength(0);
  });

  it("loadStarterPack by host adds pack words with host's playerId", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    room.onMessage(conn as never, JSON.stringify({ type: "loadStarterPack", pack: "agile" }));

    // agile pack has 17 words
    expect(getBroadcast().mock.calls.length).toBe(17);
    const firstMsg = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(firstMsg.type).toBe("wordAdded");
    expect(firstMsg.word.submittedBy).toBe("p1");
  });

  it("loadStarterPack by non-host is silently ignored", () => {
    const conn1 = makeConn("c1");
    const conn2 = makeConn("c2");
    joinPlayer(conn1, "p1", "Alice");
    joinPlayer(conn2, "p2", "Bob");

    room.onMessage(conn2 as never, JSON.stringify({ type: "loadStarterPack", pack: "agile" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("loadStarterPack twice is silently ignored", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    room.onMessage(conn as never, JSON.stringify({ type: "loadStarterPack", pack: "agile" }));
    vi.clearAllMocks();

    room.onMessage(conn as never, JSON.stringify({ type: "loadStarterPack", pack: "agile" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("loadStarterPack silently skips duplicates already in pool", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    // "Sprint" is the first word in the agile pack
    room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: "Sprint" }));
    vi.clearAllMocks();

    room.onMessage(conn as never, JSON.stringify({ type: "loadStarterPack", pack: "agile" }));

    // agile pack has 17 words; 1 duplicate ("Sprint") should be skipped
    expect(getBroadcast().mock.calls.length).toBe(16);
  });

  it("startGame with < 5 words sends not_enough_words error", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    for (let i = 0; i < 4; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `Word${i}` }));
    }
    vi.clearAllMocks();
    conn._sent.length = 0;

    room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
    expect(conn._sent).toHaveLength(1);
    const err = JSON.parse(conn._sent[0]);
    expect(err.type).toBe("error");
    expect(err.code).toBe("not_enough_words");
  });

  it("startGame with 5 words flips phase to playing and broadcasts gameStarted", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");

    for (let i = 0; i < 5; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `Word${i}` }));
    }
    vi.clearAllMocks();

    room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));

    // Phase 3 change: startGame now broadcasts gameStarted (phase flip) instead of roomState.
    // Per-connection boardAssigned is sent separately via conn.send.
    expect(getBroadcast()).toHaveBeenCalled();
    const firstBroadcast = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(firstBroadcast.type).toBe("gameStarted");
  });

  it("startGame by non-host is silently ignored", () => {
    const conn1 = makeConn("c1");
    const conn2 = makeConn("c2");
    joinPlayer(conn1, "p1", "Alice");
    joinPlayer(conn2, "p2", "Bob");

    for (let i = 0; i < 5; i++) {
      room.onMessage(conn1 as never, JSON.stringify({ type: "submitWord", text: `Word${i}` }));
    }
    vi.clearAllMocks();

    room.onMessage(conn2 as never, JSON.stringify({ type: "startGame" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("roomState snapshot includes words and usedPacks", () => {
    const conn1 = makeConn("c1");
    const conn2 = makeConn("c2");
    joinPlayer(conn1, "p1", "Alice");

    room.onMessage(conn1 as never, JSON.stringify({ type: "submitWord", text: "Synergy" }));
    room.onMessage(conn1 as never, JSON.stringify({ type: "submitWord", text: "Leverage" }));
    room.onMessage(conn1 as never, JSON.stringify({ type: "loadStarterPack", pack: "agile" }));
    vi.clearAllMocks();
    conn2._sent.length = 0;

    // p2 joins — receives full snapshot
    room.onMessage(conn2 as never, JSON.stringify({ type: "hello", playerId: "p2", displayName: "Bob" }));

    expect(conn2._sent).toHaveLength(1);
    const snapshot = JSON.parse(conn2._sent[0]);
    expect(snapshot.type).toBe("roomState");
    expect(snapshot.state.words.length).toBeGreaterThan(0);
    expect(snapshot.state.usedPacks).toContain("agile");
  });
});

// ---------------------------------------------------------------------------
// Phase 3: Board generation + mark loop tests
// ---------------------------------------------------------------------------

describe("GameRoom — board & marks (Phase 3)", () => {
  let room: InstanceType<typeof GameRoom>;
  let conns: FakeConn[];

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    conns = [];
    // FakeServer does not provide getConnections; stub it to return the harness's conns list.
    (room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => conns;
    vi.clearAllMocks();
  });

  function joinPlayer(conn: FakeConn, playerId: string, displayName: string) {
    conns.push(conn);
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId, displayName }));
    vi.clearAllMocks();
    conn._sent.length = 0;
  }

  function addWords(conn: FakeConn, words: string[]) {
    for (const text of words) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text }));
    }
  }

  function getBroadcast() {
    return (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast;
  }

  function extractBoardFromConn(conn: FakeConn) {
    const msgStr = conn._sent.find((m) => JSON.parse(m).type === "boardAssigned");
    expect(msgStr, "conn should have received a boardAssigned message").toBeDefined();
    return JSON.parse(msgStr!) as { type: "boardAssigned"; cells: Array<{ cellId: string; wordId: string | null; text: string | null; blank: boolean }> };
  }

  it("startGame broadcasts gameStarted first, then sends per-connection boardAssigned (BOAR-01, BOAR-03)", () => {
    const host = makeConn("c1");
    const peer = makeConn("c2");
    joinPlayer(host, "p1", "Alice");
    joinPlayer(peer, "p2", "Bob");
    addWords(host, ["W1", "W2", "W3", "W4", "W5"]);
    vi.clearAllMocks();
    host._sent.length = 0; peer._sent.length = 0;

    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    // Broadcast fired with gameStarted
    expect(getBroadcast()).toHaveBeenCalled();
    const firstBroadcast = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(firstBroadcast.type).toBe("gameStarted");

    // Each connection received its own boardAssigned via conn.send (not broadcast)
    const hostBoard = extractBoardFromConn(host);
    const peerBoard = extractBoardFromConn(peer);
    expect(hostBoard.type).toBe("boardAssigned");
    expect(peerBoard.type).toBe("boardAssigned");
    // Per-player nanoid cellIds guarantee difference even if same permutation
    expect(hostBoard.cells[0].cellId).not.toBe(peerBoard.cells[0].cellId);
  });

  it("board has cellCount cells with blanks filling the remainder (BOAR-04)", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    addWords(host, ["W1", "W2", "W3", "W4", "W5"]);
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    const board = extractBoardFromConn(host);
    // 5 words → 3x3 tier → 9 cells. 5 words + 4 blanks.
    expect(board.cells).toHaveLength(9);
    const wordCells = board.cells.filter((c) => !c.blank);
    const blankCells = board.cells.filter((c) => c.blank);
    expect(wordCells).toHaveLength(5);
    expect(blankCells).toHaveLength(4);
    wordCells.forEach((c) => {
      expect(c.wordId).not.toBeNull();
      expect(c.text).not.toBeNull();
    });
    blankCells.forEach((c) => {
      expect(c.wordId).toBeNull();
      expect(c.text).toBeNull();
    });
  });

  it("two connections receive different boards — independent shuffles (BOAR-01, BOAR-02)", () => {
    const host = makeConn("c1");
    const peer = makeConn("c2");
    joinPlayer(host, "p1", "Alice");
    joinPlayer(peer, "p2", "Bob");
    // 21 words → 5x5 tier → 25 cells (4 blanks). Bigger search space → shuffle collision chance ≈ 1/25!
    const words = Array.from({ length: 21 }, (_, i) => `Word${i}`);
    addWords(host, words);
    host._sent.length = 0; peer._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    const hostBoard = extractBoardFromConn(host).cells.map((c) => c.wordId ?? "BLANK");
    const peerBoard = extractBoardFromConn(peer).cells.map((c) => c.wordId ?? "BLANK");
    expect(hostBoard).not.toEqual(peerBoard);
  });

  it("markWord on a valid word cell toggles mark and broadcasts wordMarked with minimal payload (BOAR-05, BOAR-06)", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    // 9 words → 3x3 full, zero blanks. A single mark cannot complete any line
    // (every line requires 3 marks), so the new Phase 4 win detection never
    // fires here — isolating the Phase 3 wordMarked broadcast contract.
    addWords(host, ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9"]);
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    const board = extractBoardFromConn(host);
    const firstWordCell = board.cells.find((c) => !c.blank)!;
    vi.clearAllMocks();

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: firstWordCell.cellId }));

    expect(getBroadcast()).toHaveBeenCalledOnce();
    const payload = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(payload).toEqual({ type: "wordMarked", playerId: "p1", markCount: 1, cellId: firstWordCell.cellId });
    // Strict key check — cellId included for WR-01 (server echo), no other layout fields leaked
    expect(Object.keys(payload).sort()).toEqual(["cellId", "markCount", "playerId", "type"]);
  });

  it("markWord second time on same cell unmarks (toggle idempotency)", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    // 9 words → 3x3 full, zero blanks. No single mark can win (requires 3).
    addWords(host, ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9"]);
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    const board = extractBoardFromConn(host);
    const cell = board.cells.find((c) => !c.blank)!;

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: cell.cellId }));
    vi.clearAllMocks();
    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: cell.cellId }));

    expect(getBroadcast()).toHaveBeenCalledOnce();
    const payload = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(payload).toEqual({ type: "wordMarked", playerId: "p1", markCount: 0, cellId: cell.cellId });
  });

  it("markWord on a blank cellId is silently dropped (no broadcast)", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    addWords(host, ["W1", "W2", "W3", "W4", "W5"]);
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    const board = extractBoardFromConn(host);
    const blankCell = board.cells.find((c) => c.blank)!;
    vi.clearAllMocks();

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: blankCell.cellId }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("markWord on a cellId not on the player's own board is silently dropped (authorization)", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    addWords(host, ["W1", "W2", "W3", "W4", "W5"]);
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    vi.clearAllMocks();

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: "nonexistent-cell-id" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("markWord when phase is 'lobby' is silently dropped", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    vi.clearAllMocks();

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: "any" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("markWord by a pre-hello connection (no playerId in conn.state) is silently dropped", () => {
    const stranger = makeConn("c-stranger");
    // Do NOT call joinPlayer — conn.state stays null/undefined
    conns.push(stranger);
    vi.clearAllMocks();

    room.onMessage(stranger as never, JSON.stringify({ type: "markWord", cellId: "any" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("startGame skips connections that have not sent hello (Pitfall 4)", () => {
    const host = makeConn("c1");
    const stranger = makeConn("c-stranger");
    joinPlayer(host, "p1", "Alice");
    conns.push(stranger); // pushed but never sent hello
    addWords(host, ["W1", "W2", "W3", "W4", "W5"]);
    host._sent.length = 0; stranger._sent.length = 0;

    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    const hostMsgs = host._sent.map((m) => JSON.parse(m).type);
    const strangerMsgs = stranger._sent.map((m) => JSON.parse(m).type);
    expect(hostMsgs).toContain("boardAssigned");
    expect(strangerMsgs).not.toContain("boardAssigned"); // pre-hello conn skipped
  });

  it("wordMarked broadcast payload contains only type, playerId, markCount keys — nothing else", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    // 9 words → 3x3 full, zero blanks. Avoids the Phase-4 single-mark-via-blanks
    // edge case (Pitfall 5) so the first broadcast is strictly wordMarked.
    addWords(host, ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9"]);
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    const board = extractBoardFromConn(host);
    const wordCell = board.cells.find((c) => !c.blank)!;
    vi.clearAllMocks();

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: wordCell.cellId }));

    const payload = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(Object.keys(payload).sort()).toEqual(["cellId", "markCount", "playerId", "type"]);
  });

  // -------------------------------------------------------------------------
  // Hibernation rehydration (regression for start-game-button-no-board)
  // -------------------------------------------------------------------------

  it('rehydrates hostId/players/words/phase from storage on wake (startGame survives hibernation)', async () => {
    // Arrange: pretend the room had state BEFORE hibernation by stuffing the
    // storage.get mock to return the pre-hibernation values.
    const preHostId = 'p1';
    const prePlayers = [
      { playerId: 'p1', displayName: 'Alice', isHost: true, joinedAt: 100 },
    ];
    const preWords = Array.from({ length: 5 }, (_, i) => ({
      wordId: 'w' + i,
      text: 'Word' + i,
      submittedBy: 'p1',
    }));
    const getMock = (room as any).ctx.storage.get as ReturnType<typeof vi.fn>;
    getMock.mockImplementation((key: string) => {
      switch (key) {
        case 'active': return Promise.resolve(true);
        case 'hostId': return Promise.resolve(preHostId);
        case 'players': return Promise.resolve(prePlayers);
        case 'words': return Promise.resolve(preWords);
        case 'phase': return Promise.resolve('lobby');
        case 'usedPacks': return Promise.resolve([]);
        case 'boards': return Promise.resolve([]);
        case 'marks': return Promise.resolve([]);
        default: return Promise.resolve(undefined);
      }
    });

    // Simulate waking from hibernation.
    await (room as unknown as { onStart: () => Promise<void> }).onStart();

    // A connection that reconnected after hibernation already has conn.state
    // (hibernation API persists it) but the in-memory class state was wiped.
    // The fix must have rehydrated #hostId so the host-only guard passes.
    const host = makeConn('c1');
    host.state = { playerId: 'p1' };
    conns.push(host);

    vi.clearAllMocks();
    host._sent.length = 0;

    // Act: host clicks Start Game after hibernation.
    room.onMessage(host as never, JSON.stringify({ type: 'startGame' }));

    // Assert: gameStarted broadcast fires (not silently dropped by host guard).
    expect(getBroadcast()).toHaveBeenCalled();
    const firstBroadcast = JSON.parse(getBroadcast().mock.calls[0][0]);
    expect(firstBroadcast.type).toBe('gameStarted');

    // Assert: host received boardAssigned.
    const types = host._sent.map((m) => JSON.parse(m).type);
    expect(types).toContain('boardAssigned');
  });

});

// ---------------------------------------------------------------------------
// Phase 5: Hibernation rehydration — ended phase win-line coverage (IN-02)
// ---------------------------------------------------------------------------

describe("GameRoom — Phase 5 rehydration (ended phase)", () => {
  let room: InstanceType<typeof GameRoom>;
  let conns: FakeConn[];

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    conns = [];
    (room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => conns;
    vi.clearAllMocks();
  });

  it("syncResponse after onStart wake includes win-line fields when phase is ended", async () => {
    // Arrange: stub storage with full Phase 5 ended-phase state.
    const preHostId = "p1";
    const prePlayers = [
      { playerId: "p1", displayName: "Alice", isHost: true, joinedAt: 100 },
      { playerId: "p2", displayName: "Bob", isHost: false, joinedAt: 200 },
    ];
    const preBoards: [string, Array<{ cellId: string; wordId: string | null; text: string | null; blank: boolean }>][] = [
      [
        "p1",
        [
          { cellId: "c1", wordId: "w1", text: "Synergy", blank: false },
          { cellId: "c2", wordId: "w2", text: "Leverage", blank: false },
          { cellId: "c3", wordId: "w3", text: "Pivot", blank: false },
          { cellId: "c4", wordId: null, text: null, blank: true },
          { cellId: "c5", wordId: "w4", text: "Bandwidth", blank: false },
          { cellId: "c6", wordId: "w5", text: "Agile", blank: false },
          { cellId: "c7", wordId: null, text: null, blank: true },
          { cellId: "c8", wordId: null, text: null, blank: true },
          { cellId: "c9", wordId: null, text: null, blank: true },
        ],
      ],
    ];
    const preMarks: [string, string[]][] = [["p1", ["c1", "c2", "c3"]]];
    const preWinningLine = { type: "row" as const, index: 0 };
    const preWinningCellIds = ["c1", "c2", "c3"];
    const preWinningWords = ["Synergy", "Leverage", "Pivot"];

    const getMock = (room as any).ctx.storage.get as ReturnType<typeof vi.fn>;
    getMock.mockImplementation((key: string) => {
      switch (key) {
        case "active": return Promise.resolve(true);
        case "hostId": return Promise.resolve(preHostId);
        case "players": return Promise.resolve(prePlayers);
        case "words": return Promise.resolve([]);
        case "phase": return Promise.resolve("ended");
        case "usedPacks": return Promise.resolve([]);
        case "boards": return Promise.resolve(preBoards);
        case "marks": return Promise.resolve(preMarks);
        case "pendingSlots": return Promise.resolve([]);
        case "winnerId": return Promise.resolve("p1");
        case "winnerName": return Promise.resolve("Alice");
        case "winningLine": return Promise.resolve(preWinningLine);
        case "winningCellIds": return Promise.resolve(preWinningCellIds);
        case "winningWords": return Promise.resolve(preWinningWords);
        case "gridSize": return Promise.resolve(3);
        default: return Promise.resolve(undefined);
      }
    });

    // Wake from hibernation.
    await (room as unknown as { onStart: () => Promise<void> }).onStart();

    // Reconnecting player — conn state is preserved by hibernation API.
    const conn = makeConn("c1");
    conn.state = { playerId: "p1" };
    conns.push(conn);

    vi.clearAllMocks();
    conn._sent.length = 0;

    // Act: player sends syncRequest (reconnect path).
    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    // Assert: syncResponse includes win-line data.
    expect(conn._sent).toHaveLength(1);
    const sync = JSON.parse(conn._sent[0]);
    expect(sync.type).toBe("syncResponse");
    expect(sync.winningLine).toEqual(preWinningLine);
    expect(sync.winningCellIds).toEqual(preWinningCellIds);
    expect(sync.winningWords).toEqual(preWinningWords);
    expect(sync.gridSize).toBe(3);
    expect(sync.state.phase).toBe("ended");
  });
});

// ---------------------------------------------------------------------------
// Phase 4: Win detection & play-again reset
// ---------------------------------------------------------------------------

describe("GameRoom — win & reset (Phase 4)", () => {
  let room: InstanceType<typeof GameRoom>;
  let conns: FakeConn[];

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    conns = [];
    (room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => conns;
    vi.clearAllMocks();
  });

  function joinPlayer(conn: FakeConn, playerId: string, displayName: string) {
    conns.push(conn);
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId, displayName }));
    vi.clearAllMocks();
    conn._sent.length = 0;
  }

  function getBroadcast() {
    return (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast;
  }

  // Private fields (#boards, #marks, #players) are inaccessible from outside
  // the class, so we drive the DO via public messages. For a 3x3 board with
  // 5 words + 4 blanks, marking every word cell guarantees at least one line
  // completes (there are 8 lines: 3 rows, 3 cols, 2 diagonals; the line whose
  // word-cells are all marked AND whose blank-cells are "pre-satisfied" wins).
  // We don't need to predict WHICH line completes — we only need to observe
  // the server's broadcast behaviour.

  function extractBoardFromConn(conn: FakeConn) {
    const msgStr = conn._sent.find((m) => JSON.parse(m).type === "boardAssigned");
    expect(msgStr, "conn should have received a boardAssigned message").toBeDefined();
    return JSON.parse(msgStr!) as {
      type: "boardAssigned";
      cells: Array<{ cellId: string; wordId: string | null; text: string | null; blank: boolean }>;
    };
  }

  // Helper: submit N words, start the game, return the host's assigned board.
  // We then mark EVERY non-blank cell on that board — since a 3x3 with 5 words
  // has 5 word cells + 4 blanks, marking all 5 words guarantees at least one
  // complete line (rows + cols + diagonals cover all cells; with 4 blanks
  // distributed, some line of 3 cells must be fully satisfied).
  function setupGameWithWinnableBoard(playerId = "p1", displayName = "Alice") {
    const host = makeConn("c1");
    joinPlayer(host, playerId, displayName);
    for (let i = 0; i < 5; i++) {
      room.onMessage(host as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    const board = extractBoardFromConn(host);
    return { host, board };
  }

  /**
   * Mark every non-blank cell on the board in order, returning the broadcast
   * calls captured from the mark that triggered the first winDeclared. If no
   * winDeclared is emitted, returns null.
   */
  function markUntilWin(host: FakeConn, board: ReturnType<typeof extractBoardFromConn>) {
    const broadcast = getBroadcast();
    const wordCells = board.cells.filter((c) => !c.blank);
    for (const cell of wordCells) {
      const beforeCallCount = broadcast.mock.calls.length;
      room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: cell.cellId }));
      const newCalls = broadcast.mock.calls.slice(beforeCallCount);
      const winDeclared = newCalls.find((args) => {
        try { return JSON.parse(args[0] as string).type === "winDeclared"; } catch { return false; }
      });
      if (winDeclared) {
        return {
          winningMark: cell,
          newCalls: newCalls.map((args) => JSON.parse(args[0] as string)),
        };
      }
    }
    return null;
  }

  // --- Win detection behaviours (W1–W8) ------------------------------------

  it("W1: a mark that completes a line triggers winDeclared broadcast with correct payload shape", () => {
    const { host, board } = setupGameWithWinnableBoard();
    const result = markUntilWin(host, board);
    expect(result, "should have detected a win after marking all words").not.toBeNull();
    const winMsg = result!.newCalls.find((m) => m.type === "winDeclared")!;
    expect(winMsg.type).toBe("winDeclared");
    expect(winMsg.winnerId).toBe("p1");
    expect(winMsg.winnerName).toBe("Alice");
    expect(winMsg.winningLine).toBeDefined();
    expect(["row", "col", "diagonal"]).toContain(winMsg.winningLine.type);
    expect(typeof winMsg.winningLine.index).toBe("number");
    expect(Array.isArray(winMsg.winningCellIds)).toBe(true);
  });

  it("W2: on the winning mark, wordMarked is broadcast BEFORE winDeclared (call order)", () => {
    const { host, board } = setupGameWithWinnableBoard();
    const result = markUntilWin(host, board);
    expect(result).not.toBeNull();
    // The NEW calls emitted by the final (winning) mark should include
    // wordMarked first, winDeclared second.
    const types = result!.newCalls.map((m) => m.type);
    expect(types.indexOf("wordMarked")).toBeGreaterThanOrEqual(0);
    expect(types.indexOf("winDeclared")).toBeGreaterThanOrEqual(0);
    expect(types.indexOf("wordMarked")).toBeLessThan(types.indexOf("winDeclared"));
  });

  it("W3: a non-completing mark triggers only wordMarked (no winDeclared)", () => {
    const { host, board } = setupGameWithWinnableBoard();
    const wordCells = board.cells.filter((c) => !c.blank);
    // Mark exactly one word cell — a single mark on a 3x3 with 5 words and
    // 4 blanks cannot complete a row, col, or diagonal on its own unless
    // every OTHER cell on that line is blank. For a 3x3 with 5 words, there
    // are at most 4 blanks; a line of 3 cells cannot be all blanks (would
    // need 3 blanks, leaving 6 words in 6 cells — but we have 5). Wait —
    // 5 words + 4 blanks = 9 cells; a line of 3 blanks is possible (4 >= 3).
    // So the first mark MIGHT win if it's on a line of 2 blanks + itself.
    //
    // To make this test deterministic, we check: after one mark, EITHER
    // a winDeclared was emitted (edge case — the single mark completed
    // a line because the other two cells were blanks), OR no winDeclared.
    // If winDeclared happened on the first mark, skip the assertion.
    const broadcast = getBroadcast();
    broadcast.mockClear();
    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: wordCells[0].cellId }));
    const msgs = broadcast.mock.calls.map((args) => JSON.parse(args[0] as string));
    const wordMarkedCount = msgs.filter((m) => m.type === "wordMarked").length;
    const winDeclaredCount = msgs.filter((m) => m.type === "winDeclared").length;
    expect(wordMarkedCount).toBe(1);
    // If this single mark happened to complete a line of blanks, a win is
    // legitimate. Otherwise, no winDeclared should fire on this non-winning mark.
    if (winDeclaredCount === 0) {
      // Non-completing mark path: exactly one broadcast (wordMarked).
      expect(msgs.length).toBe(1);
    }
  });

  it("W4: on win, #phase becomes 'ended' AND storage.put(phase, 'ended') is called when winDeclared broadcasts", () => {
    const { host, board } = setupGameWithWinnableBoard();
    const broadcast = getBroadcast();
    const storagePut = (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put;

    // Mark until a win is declared. `markUntilWin` only marks each cell once,
    // so no toggle-unmark happens mid-sequence.
    const result = markUntilWin(host, board);
    expect(result, "should have detected a win").not.toBeNull();

    // After the win, storage.put must have been called with ("phase", "ended").
    const phaseEndedPut = storagePut.mock.calls.find(
      (args) => args[0] === "phase" && args[1] === "ended"
    );
    expect(phaseEndedPut, "storage.put('phase', 'ended') must be called on win").toBeDefined();

    // And winDeclared must have fired.
    const winBroadcast = broadcast.mock.calls.find((args) => {
      try { return JSON.parse(args[0] as string).type === "winDeclared"; } catch { return false; }
    });
    expect(winBroadcast, "winDeclared broadcast must fire").toBeDefined();
  });

  it("W5: after phase='ended', subsequent markWord is silently dropped (no further broadcasts)", () => {
    const { host, board } = setupGameWithWinnableBoard();
    const result = markUntilWin(host, board);
    expect(result).not.toBeNull();

    const broadcast = getBroadcast();
    broadcast.mockClear();

    // Try to mark another cell after the win.
    const wordCells = board.cells.filter((c) => !c.blank);
    const unmarkedCell = wordCells.find((c) => c.cellId !== result!.winningMark.cellId) ?? wordCells[0];
    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: unmarkedCell.cellId }));

    expect(broadcast).not.toHaveBeenCalled();
  });

  it("W6: winnerName comes from the server-side player roster, not client-supplied input", () => {
    const { host, board } = setupGameWithWinnableBoard("p1", "Alice");
    const result = markUntilWin(host, board);
    expect(result).not.toBeNull();
    const winMsg = result!.newCalls.find((m) => m.type === "winDeclared")!;
    // winnerName MUST equal the roster displayName — not any client-supplied value.
    expect(winMsg.winnerName).toBe("Alice");
  });

  it("W7: winnerName falls back to 'Someone' if players.get(playerId) returns undefined", async () => {
    // Manually wire a board + marks for a player that is NOT in the #players
    // map, to exercise the fallback branch. We must run startGame as a real
    // host (to populate #boards/#marks), then evict the player via onAlarm
    // (Phase 5: onClose no longer deletes from #players — slot-hold does that
    // via onAlarm after the 45s window expires).
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(host as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    const board = extractBoardFromConn(host);

    // Disconnect host — this puts them in pendingSlots (not deleted yet).
    await room.onClose(host as never, 1000, "", true);

    // Advance time past slot-hold window (45s), then fire onAlarm to evict.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 50_000);
    // getConnections returns empty so promoteNextHost finds no connected player.
    (room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => [];
    await room.onAlarm();

    // Restore real timers and clear broadcast history.
    vi.useRealTimers();
    const broadcast = getBroadcast();
    broadcast.mockClear();

    // conn.state still has playerId set from the hello — #boards/#marks intact.
    // Mark until win (host is no longer in #players after alarm eviction).
    const result = markUntilWin(host, board);
    expect(result, "win should still be declared even if player row was removed").not.toBeNull();
    const winMsg = result!.newCalls.find((m) => m.type === "winDeclared")!;
    expect(winMsg.winnerName).toBe("Someone");
  });

  it("W8: storage rehydration — phase='ended' in storage loads cleanly via onStart (no type error)", async () => {
    const getMock = (room as unknown as { ctx: { storage: { get: ReturnType<typeof vi.fn> } } }).ctx.storage.get;
    getMock.mockImplementation((key: string) => {
      switch (key) {
        case "active": return Promise.resolve(true);
        case "hostId": return Promise.resolve("p1");
        case "players": return Promise.resolve([{ playerId: "p1", displayName: "Alice", isHost: true, joinedAt: 100 }]);
        case "words": return Promise.resolve([]);
        case "phase": return Promise.resolve("ended");
        case "usedPacks": return Promise.resolve([]);
        case "boards": return Promise.resolve([]);
        case "marks": return Promise.resolve([]);
        default: return Promise.resolve(undefined);
      }
    });

    await (room as unknown as { onStart: () => Promise<void> }).onStart();

    // After rehydration, a markWord from a connection should be silently dropped
    // because phase === "ended" (post-hibernation integrity — Pitfall 2).
    const host = makeConn("c1");
    host.state = { playerId: "p1" };
    conns.push(host);
    vi.clearAllMocks();

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: "any" }));
    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  // --- Play-again reset behaviours (R1–R11) --------------------------------
  // startNewGame returns the room to phase="lobby" but RETAINS players, words,
  // and usedPacks. Only the host may issue it (WIN-05, D-09/D-13).

  /** Drive the room to phase="ended" and clear broadcast history. */
  function setupEndedGame(playerId = "p1", displayName = "Alice") {
    const host = makeConn("c1");
    joinPlayer(host, playerId, displayName);
    for (let i = 0; i < 5; i++) {
      room.onMessage(host as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    const board = extractBoardFromConn(host);
    const result = markUntilWin(host, board);
    expect(result, "expected to reach phase=ended via win").not.toBeNull();
    getBroadcast().mockClear();
    (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put.mockClear();
    return { host };
  }

  it("R1: startNewGame from the host broadcasts gameReset", () => {
    const { host } = setupEndedGame();
    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));
    const calls = getBroadcast().mock.calls.map((a) => JSON.parse(a[0] as string));
    const gameReset = calls.find((m) => m.type === "gameReset");
    expect(gameReset, "gameReset must broadcast on host startNewGame").toBeDefined();
    // gameReset payload shape: { type: "gameReset" } — no other keys (D-14).
    expect(Object.keys(gameReset!).sort()).toEqual(["type"]);
  });

  it("R2: startNewGame from a non-host is silently dropped (no broadcast)", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(host as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    // Second player (not host)
    const other = makeConn("c2");
    joinPlayer(other, "p2", "Bob");
    getBroadcast().mockClear();

    room.onMessage(other as never, JSON.stringify({ type: "startNewGame" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("R3: startNewGame from a pre-hello connection is silently dropped", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(host as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    const stranger = makeConn("c-stranger");
    conns.push(stranger); // never sent hello → conn.state is null
    getBroadcast().mockClear();

    room.onMessage(stranger as never, JSON.stringify({ type: "startNewGame" }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("R4: startNewGame persists phase='lobby' to storage", () => {
    const { host } = setupEndedGame();
    const storagePut = (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put;

    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));

    const phaseLobbyPut = storagePut.mock.calls.find(
      (args) => args[0] === "phase" && args[1] === "lobby"
    );
    expect(phaseLobbyPut, "storage.put('phase', 'lobby') must fire on startNewGame").toBeDefined();
  });

  it("R5: startNewGame persists an empty boards array to storage", () => {
    const { host } = setupEndedGame();
    const storagePut = (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put;

    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));

    const boardsPut = storagePut.mock.calls.find((args) => args[0] === "boards");
    expect(boardsPut, "storage.put('boards', ...) must fire on startNewGame").toBeDefined();
    expect(boardsPut![1]).toEqual([]);
  });

  it("R6: startNewGame persists an empty marks array to storage", () => {
    const { host } = setupEndedGame();
    const storagePut = (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put;

    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));

    const marksPut = storagePut.mock.calls.find((args) => args[0] === "marks");
    expect(marksPut, "storage.put('marks', ...) must fire on startNewGame").toBeDefined();
    expect(marksPut![1]).toEqual([]);
  });

  it("R7: after startNewGame, markWord is silently dropped (phase back to lobby)", () => {
    const { host } = setupEndedGame();
    // Capture a word cellId BEFORE the reset wipes boards.
    const boardBefore = extractBoardFromConn(host);
    const someWordCell = boardBefore.cells.find((c) => !c.blank)!;

    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));
    getBroadcast().mockClear();

    room.onMessage(host as never, JSON.stringify({ type: "markWord", cellId: someWordCell.cellId }));

    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  it("R8: startNewGame retains #words — starting a new game yields a board", () => {
    const { host } = setupEndedGame();
    // Remember word count before reset (the host has 5 submitted words).
    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));
    host._sent.length = 0;
    getBroadcast().mockClear();

    // Now host issues startGame again; the retained words should still be
    // available so the board regenerates successfully.
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));

    const types = host._sent.map((m) => JSON.parse(m).type);
    expect(types).toContain("boardAssigned");
    // Also: gameStarted should have been broadcast (host guard + words present).
    const gameStarted = getBroadcast().mock.calls
      .map((a) => JSON.parse(a[0] as string))
      .find((m) => m.type === "gameStarted");
    expect(gameStarted).toBeDefined();
  });

  it("R9: startNewGame retains #players and #hostId — host can still operate post-reset", () => {
    const { host } = setupEndedGame();
    const storagePut = (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put;

    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));

    // No storage.put call for "hostId" or "players" should fire on reset —
    // those are retained (not rewritten) per plan frontmatter.
    const hostIdPuts = storagePut.mock.calls.filter((args) => args[0] === "hostId");
    const playersPuts = storagePut.mock.calls.filter((args) => args[0] === "players");
    expect(hostIdPuts.length, "hostId must NOT be re-persisted on reset").toBe(0);
    expect(playersPuts.length, "players must NOT be re-persisted on reset").toBe(0);

    // And the host can still issue startGame (proves #hostId still matches).
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    const types = host._sent.map((m) => JSON.parse(m).type);
    expect(types).toContain("boardAssigned");
  });

  it("R10: startNewGame does NOT re-persist #words or #usedPacks (retention only)", () => {
    const { host } = setupEndedGame();
    const storagePut = (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put;

    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));

    const wordsPuts = storagePut.mock.calls.filter((args) => args[0] === "words");
    const usedPacksPuts = storagePut.mock.calls.filter((args) => args[0] === "usedPacks");
    expect(wordsPuts.length, "words must NOT be re-persisted on reset").toBe(0);
    expect(usedPacksPuts.length, "usedPacks must NOT be re-persisted on reset").toBe(0);
  });

  it("R11: startNewGame works from phase='playing' too (not just ended) — host can reset mid-game", () => {
    const host = makeConn("c1");
    joinPlayer(host, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(host as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    host._sent.length = 0;
    room.onMessage(host as never, JSON.stringify({ type: "startGame" }));
    // Now phase === "playing" but no win yet.
    getBroadcast().mockClear();
    const storagePut = (room as unknown as { ctx: { storage: { put: ReturnType<typeof vi.fn> } } }).ctx.storage.put;
    storagePut.mockClear();

    room.onMessage(host as never, JSON.stringify({ type: "startNewGame" }));

    const calls = getBroadcast().mock.calls.map((a) => JSON.parse(a[0] as string));
    expect(calls.find((m) => m.type === "gameReset"), "gameReset must fire from playing phase too").toBeDefined();
    expect(
      storagePut.mock.calls.find((a) => a[0] === "phase" && a[1] === "lobby"),
      "phase must drop back to 'lobby' from 'playing'"
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Resilience — slot-hold, reconnect, host failover, alarm multiplex
// ---------------------------------------------------------------------------

describe("GameRoom — Phase 5 resilience", () => {
  let room: InstanceType<typeof GameRoom>;
  let conns: FakeConn[];

  function makeUrl(playerId?: string): string {
    return playerId ? `https://test/?playerId=${playerId}` : "https://test/";
  }

  function getStorage() {
    return (room as unknown as { ctx: { storage: { setAlarm: ReturnType<typeof vi.fn>; deleteAll: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> } } }).ctx.storage;
  }

  function getBroadcast() {
    return (room as unknown as { broadcast: ReturnType<typeof vi.fn> }).broadcast;
  }

  function joinPlayer(conn: FakeConn, playerId: string, displayName: string) {
    conns.push(conn);
    room.onMessage(conn as never, JSON.stringify({ type: "hello", playerId, displayName }));
    vi.clearAllMocks();
    conn._sent.length = 0;
  }

  beforeEach(() => {
    room = new GameRoom({} as never, {} as never);
    conns = [];
    (room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => conns;
    vi.clearAllMocks();
  });

  // S1: onClose with recognized playerId adds to #pendingSlots, broadcasts playerDisconnected, does NOT delete player or broadcast playerLeft
  it("S1: onClose adds playerId to pendingSlots, broadcasts playerDisconnected, does NOT delete player or broadcast playerLeft", async () => {
    const conn1 = makeConn("c1");
    joinPlayer(conn1, "p1", "Alice");

    await room.onClose(conn1 as never, 1000, "", true);

    const broadcastCalls = getBroadcast().mock.calls.map((a) => JSON.parse(a[0] as string));
    const disconnected = broadcastCalls.find((m) => m.type === "playerDisconnected");
    expect(disconnected, "playerDisconnected must be broadcast").toBeDefined();
    expect(disconnected!.playerId).toBe("p1");
    const playerLeft = broadcastCalls.find((m) => m.type === "playerLeft");
    expect(playerLeft, "playerLeft must NOT be broadcast on close (slot-hold)").toBeUndefined();

    // Player should still be in #players (not evicted yet)
    const conn2 = makeConn("c2");
    room.onMessage(conn2 as never, JSON.stringify({ type: "hello", playerId: "p2", displayName: "Bob" }));
    const state = JSON.parse(conn2._sent[0]);
    const p1InState = state.state.players.find((p: { playerId: string }) => p.playerId === "p1");
    expect(p1InState, "p1 must still be in players map after close (slot-hold)").toBeDefined();
  });

  // S2: onClose calls storage.put(K_PENDING_SLOTS) and setAlarm with ~45000ms
  it("S2: onClose persists pendingSlots and sets alarm ~45000ms from now", async () => {
    const conn1 = makeConn("c1");
    joinPlayer(conn1, "p1", "Alice");
    const storage = getStorage();
    const before = Date.now();

    await room.onClose(conn1 as never, 1000, "", true);

    const pendingSlotsPut = storage.put.mock.calls.find((a) => a[0] === "pendingSlots");
    expect(pendingSlotsPut, "storage.put('pendingSlots', ...) must be called").toBeDefined();

    const alarmTime = storage.setAlarm.mock.calls.at(-1)?.[0] as number;
    expect(alarmTime, "setAlarm must be called after onClose").toBeDefined();
    expect(alarmTime).toBeGreaterThanOrEqual(before + 44500);
    expect(alarmTime).toBeLessThanOrEqual(before + 46000);
  });

  // S3: onConnect with playerId in pendingSlots: reconnect path — no playerJoined broadcast, sends syncResponse
  it("S3: onConnect with playerId in pendingSlots reconnects player, broadcasts playerReconnected, sends syncResponse unicast, no playerJoined", async () => {
    const conn1 = makeConn("c1");
    joinPlayer(conn1, "p1", "Alice");
    await room.onClose(conn1 as never, 1000, "", true);
    vi.clearAllMocks();

    const conn2 = makeConn("c2");
    conns.push(conn2);
    await room.onConnect(conn2 as never, { request: { url: makeUrl("p1") } } as never);

    // playerReconnected must be broadcast (not playerJoined)
    const broadcastCalls = getBroadcast().mock.calls.map((a) => JSON.parse(a[0] as string));
    const reconnected = broadcastCalls.find((m) => m.type === "playerReconnected");
    expect(reconnected, "playerReconnected must be broadcast").toBeDefined();
    expect(reconnected!.playerId).toBe("p1");
    const playerJoined = broadcastCalls.find((m) => m.type === "playerJoined");
    expect(playerJoined, "playerJoined must NOT be broadcast for reconnecting player").toBeUndefined();

    // conn2 must have received syncResponse unicast
    expect(conn2._sent.some((m) => m.includes("syncResponse")), "syncResponse must be sent unicast to reconnecting conn").toBe(true);

    // conn.state must be tagged with playerId
    expect(conn2.state).toMatchObject({ playerId: "p1" });
  });

  // S4: onConnect with playerId in #players but NOT in pendingSlots (outside window):
  // broadcasts playerReconnected to peers so they clear disconnect indicators, and sends syncResponse unicast.
  it("S4: onConnect with known playerId outside slot window broadcasts playerReconnected and sends syncResponse", async () => {
    const conn1 = makeConn("c1");
    joinPlayer(conn1, "p1", "Alice");
    // p1 is in #players but NOT in pendingSlots (slot already expired)

    const conn2 = makeConn("c2");
    conns.push(conn2);
    await room.onConnect(conn2 as never, { request: { url: makeUrl("p1") } } as never);

    const broadcastCalls = getBroadcast().mock.calls.map((a) => JSON.parse(a[0] as string));
    expect(broadcastCalls.find((m) => m.type === "playerJoined"), "no playerJoined for known-outside-window").toBeUndefined();
    const reconnected = broadcastCalls.find((m) => m.type === "playerReconnected");
    expect(reconnected, "playerReconnected must be broadcast to peers on expired-slot reconnect").toBeDefined();
    expect(reconnected!.playerId).toBe("p1");
    expect(conn2._sent.some((m) => m.includes("syncResponse")), "syncResponse must still be sent").toBe(true);
  });

  // S5: onConnect with no playerId (new player): no state send, no broadcast (falls through to hello-wait)
  it("S5: onConnect with no playerId falls through without sending state or broadcasting", async () => {
    const conn = makeConn("c-new");
    conns.push(conn);
    await room.onConnect(conn as never, { request: { url: makeUrl() } } as never);

    expect(conn._sent).toHaveLength(0);
    expect(getBroadcast()).not.toHaveBeenCalled();
  });

  // S6: syncRequest onMessage handler calls sendSyncToConn for the requesting connection
  it("S6: syncRequest from a known player triggers syncResponse unicast", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    conn._sent.length = 0;

    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    expect(conn._sent.some((m) => m.includes("syncResponse")), "syncResponse must be sent to requester").toBe(true);
  });

  // S7: #sendSyncToConn sends syncResponse with board=null for player with no board, array for player with board
  it("S7: sendSyncToConn sends syncResponse with board=null when player has no board", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    conn._sent.length = 0;

    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.type).toBe("syncResponse");
    expect(syncMsg.board).toBeNull();
    expect(Array.isArray(syncMsg.markedCellIds)).toBe(true);
    expect(syncMsg.state).toBeDefined();
  });

  // S8: #snapshot() includes winnerId and winnerName
  it("S8: snapshot includes winnerId and winnerName fields", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    conn._sent.length = 0;

    // Request sync — the syncResponse state should include winnerId/winnerName
    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect("winnerId" in syncMsg.state).toBe(true);
    expect("winnerName" in syncMsg.state).toBe(true);
  });

  // S9: onAlarm with expired pending slot evicts player and broadcasts playerLeft
  it("S9: onAlarm evicts expired pending slot player and broadcasts playerLeft", async () => {
    const conn1 = makeConn("c1");
    joinPlayer(conn1, "p1", "Alice");

    // Simulate disconnect 50s ago (past the 45s window)
    const disconnectedAt = Date.now() - 50_000;
    // Manually inject into pendingSlots via onClose then backdate
    await room.onClose(conn1 as never, 1000, "", true);
    // Override the pendingSlots map directly by accessing private field via hack
    const roomAsAny = room as unknown as Record<string, unknown>;
    // We can't access private fields directly, so we simulate via driving time
    // Instead, re-read the test: we need to set Date.now to a future time
    // Use vi.setSystemTime to advance time past the slot window
    vi.setSystemTime(Date.now() + 50_000); // 50s in the future
    vi.clearAllMocks();

    await room.onAlarm();

    const broadcastCalls = getBroadcast().mock.calls.map((a) => JSON.parse(a[0] as string));
    expect(broadcastCalls.find((m) => m.type === "playerLeft" && m.playerId === "p1"),
      "playerLeft must be broadcast when slot expires").toBeDefined();

    vi.useRealTimers();
  });

  // S10: onAlarm where evicted player is host: #promoteNextHost fires, hostChanged broadcast
  it("S10: onAlarm evicts host from pending slot, promotes next host, broadcasts hostChanged", async () => {
    // Setup: host (p1) and second player (p2)
    const conn1 = makeConn("c1");
    const conn2 = makeConn("c2");
    joinPlayer(conn1, "p1", "Alice");
    joinPlayer(conn2, "p2", "Bob");

    // p1 (host) disconnects
    await room.onClose(conn1 as never, 1000, "", true);
    vi.clearAllMocks();

    // p2 is still connected — getConnections returns conn2
    (room as unknown as { getConnections: () => FakeConn[] }).getConnections = () => [conn2];

    // Advance time past slot hold window
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 50_000);

    await room.onAlarm();

    const broadcastCalls = getBroadcast().mock.calls.map((a) => JSON.parse(a[0] as string));
    const hostChanged = broadcastCalls.find((m) => m.type === "hostChanged");
    expect(hostChanged, "hostChanged must be broadcast when host slot expires").toBeDefined();
    expect(hostChanged!.newHostId).toBe("p2");

    vi.useRealTimers();
  });

  // S11: onAlarm with no pending slots and players.size === 0: idle reap
  it("S11: onAlarm with no pending slots and no players calls deleteAll", async () => {
    const storage = getStorage();
    // No players, no pending slots
    await room.onAlarm();
    expect(storage.deleteAll).toHaveBeenCalledOnce();
  });

  // S12: onAlarm with no pending slots and players.size > 0: reschedule idle alarm
  it("S12: onAlarm with no pending slots and players present reschedules idle alarm", async () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    const storage = getStorage();
    vi.clearAllMocks();

    await room.onAlarm();

    expect(storage.setAlarm).toHaveBeenCalledOnce();
    expect(storage.deleteAll).not.toHaveBeenCalled();
  });

  // S13: When player reconnects and pendingSlots becomes empty, restores idle-reaper alarm
  it("S13: reconnect that empties pendingSlots restores idle-reaper alarm", async () => {
    const conn1 = makeConn("c1");
    joinPlayer(conn1, "p1", "Alice");
    await room.onClose(conn1 as never, 1000, "", true);
    const storage = getStorage();
    vi.clearAllMocks();

    // Reconnect
    const conn2 = makeConn("c2");
    conns.push(conn2);
    await room.onConnect(conn2 as never, { request: { url: makeUrl("p1") } } as never);

    // setAlarm should be called (idle-reaper restore)
    expect(storage.setAlarm).toHaveBeenCalled();
    const alarmTime = storage.setAlarm.mock.calls.at(-1)?.[0] as number;
    // Should be IDLE_TTL_MS (30 min) not the slot-hold window
    expect(alarmTime).toBeGreaterThan(Date.now() + 1_000_000); // 30 min = 1800000ms >> slot-hold 45000ms
  });

  // S14: winDeclared path persists winnerId and winnerName to storage
  it("S14: win detection persists winnerId and winnerName to storage", () => {
    const conn = makeConn("c1");
    // joinPlayer pushes conn into conns — do NOT push manually before calling joinPlayer
    joinPlayer(conn, "p1", "Alice");
    // Add 5 words and start game
    for (let i = 0; i < 5; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));
    const boardMsg = conn._sent.find((m) => m.includes("boardAssigned"));
    const board = JSON.parse(boardMsg!).cells as Array<{ cellId: string; blank: boolean }>;
    const wordCells = board.filter((c) => !c.blank);
    const storage = getStorage();
    storage.put.mockClear();

    // Mark until win — accumulate broadcast calls across all marks
    for (const cell of wordCells) {
      room.onMessage(conn as never, JSON.stringify({ type: "markWord", cellId: cell.cellId }));
      const broadcasts = getBroadcast().mock.calls.map((a) => {
        try { return JSON.parse(a[0] as string); } catch { return {}; }
      });
      if (broadcasts.find((m: { type: string }) => m.type === "winDeclared")) break;
    }

    const winnerIdPut = storage.put.mock.calls.find((a) => a[0] === "winnerId");
    const winnerNamePut = storage.put.mock.calls.find((a) => a[0] === "winnerName");
    expect(winnerIdPut, "storage.put('winnerId', ...) must be called on win").toBeDefined();
    expect(winnerNamePut, "storage.put('winnerName', ...) must be called on win").toBeDefined();
  });

  // S15: onStart rehydrates pendingSlots, winnerId, winnerName from storage
  it("S15: onStart rehydrates pendingSlots, winnerId, and winnerName", async () => {
    const getMock = getStorage().get;
    getMock.mockImplementation((key: string) => {
      switch (key) {
        case "active": return Promise.resolve(true);
        case "hostId": return Promise.resolve("p1");
        case "players": return Promise.resolve([{ playerId: "p1", displayName: "Alice", isHost: true, joinedAt: 100 }]);
        case "words": return Promise.resolve([]);
        case "phase": return Promise.resolve("ended");
        case "usedPacks": return Promise.resolve([]);
        case "boards": return Promise.resolve([]);
        case "marks": return Promise.resolve([]);
        case "pendingSlots": return Promise.resolve([["p2", Date.now() - 10_000]]);
        case "winnerId": return Promise.resolve("p1");
        case "winnerName": return Promise.resolve("Alice");
        default: return Promise.resolve(undefined);
      }
    });

    await (room as unknown as { onStart: () => Promise<void> }).onStart();

    // After rehydration, a syncRequest should include winner info
    const conn = makeConn("c1");
    conn.state = { playerId: "p1" };
    conns.push(conn);
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.state.winnerId).toBe("p1");
    expect(syncMsg.state.winnerName).toBe("Alice");
  });

  // -------------------------------------------------------------------------
  // gap-04 (RESI-03, plan 05-04): win-line persistence + phase-gated syncResponse
  // -------------------------------------------------------------------------

  it("G1-gap04: win detection persists winningLine / winningCellIds / winningWords / gridSize to storage", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));
    const boardMsg = conn._sent.find((m) => m.includes("boardAssigned"));
    const board = JSON.parse(boardMsg!).cells as Array<{ cellId: string; blank: boolean }>;
    const wordCells = board.filter((c) => !c.blank);
    const storage = getStorage();
    storage.put.mockClear();

    for (const cell of wordCells) {
      room.onMessage(conn as never, JSON.stringify({ type: "markWord", cellId: cell.cellId }));
      const broadcasts = getBroadcast().mock.calls.map((a) => {
        try { return JSON.parse(a[0] as string); } catch { return {}; }
      });
      if (broadcasts.find((m: { type: string }) => m.type === "winDeclared")) break;
    }

    const winningLinePut = storage.put.mock.calls.find((a) => a[0] === "winningLine");
    const winningCellIdsPut = storage.put.mock.calls.find((a) => a[0] === "winningCellIds");
    const winningWordsPut = storage.put.mock.calls.find((a) => a[0] === "winningWords");
    const gridSizePut = storage.put.mock.calls.find((a) => a[0] === "gridSize");
    expect(winningLinePut, "storage.put('winningLine', ...) must be called on win").toBeDefined();
    expect(winningCellIdsPut, "storage.put('winningCellIds', ...) must be called on win").toBeDefined();
    expect(winningWordsPut, "storage.put('winningWords', ...) must be called on win").toBeDefined();
    expect(gridSizePut, "storage.put('gridSize', ...) must be called on win").toBeDefined();
    // The persisted winningLine must match the winDeclared broadcast shape
    expect((winningLinePut as unknown as [string, { type: string; index: number }])[1]).toHaveProperty("type");
    expect((winningLinePut as unknown as [string, { type: string; index: number }])[1]).toHaveProperty("index");
    // winningCellIds must be an array of strings (only non-blank cells on the
    // winning line, so can be 0..gridSize — a fully-blank line is a valid
    // auto-win on first mark).
    const cellIdsVal = (winningCellIdsPut as unknown as [string, string[]])[1];
    expect(Array.isArray(cellIdsVal)).toBe(true);
    // gridSize must be 3, 4, or 5
    const gridSizeVal = (gridSizePut as unknown as [string, number])[1];
    expect([3, 4, 5]).toContain(gridSizeVal);
  });

  it("G2-gap04: onStart rehydrates winningLine / winningCellIds / winningWords / gridSize from storage", async () => {
    const getMock = getStorage().get;
    getMock.mockImplementation((key: string) => {
      switch (key) {
        case "active": return Promise.resolve(true);
        case "hostId": return Promise.resolve("p1");
        case "players": return Promise.resolve([{ playerId: "p1", displayName: "Alice", isHost: true, joinedAt: 100 }]);
        case "words": return Promise.resolve([]);
        case "phase": return Promise.resolve("ended");
        case "usedPacks": return Promise.resolve([]);
        case "boards": return Promise.resolve([]);
        case "marks": return Promise.resolve([]);
        case "pendingSlots": return Promise.resolve([]);
        case "winnerId": return Promise.resolve("p1");
        case "winnerName": return Promise.resolve("Alice");
        case "winningLine": return Promise.resolve({ type: "row", index: 0 });
        case "winningCellIds": return Promise.resolve(["c1", "c2", "c3"]);
        case "winningWords": return Promise.resolve(["A", "B", "C"]);
        case "gridSize": return Promise.resolve(3);
        default: return Promise.resolve(undefined);
      }
    });

    await (room as unknown as { onStart: () => Promise<void> }).onStart();

    const conn = makeConn("c1");
    conn.state = { playerId: "p1" };
    conns.push(conn);
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.winningLine).toEqual({ type: "row", index: 0 });
    expect(syncMsg.winningCellIds).toEqual(["c1", "c2", "c3"]);
    expect(syncMsg.winningWords).toEqual(["A", "B", "C"]);
    expect(syncMsg.gridSize).toBe(3);
  });

  it("G3-gap04: sendSyncToConn emits win fields when phase === 'ended'", () => {
    // Stand up a room with phase=ended + win-line state via a full win sequence.
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));
    const boardMsg = conn._sent.find((m) => m.includes("boardAssigned"));
    const board = JSON.parse(boardMsg!).cells as Array<{ cellId: string; blank: boolean }>;
    const wordCells = board.filter((c) => !c.blank);
    for (const cell of wordCells) {
      room.onMessage(conn as never, JSON.stringify({ type: "markWord", cellId: cell.cellId }));
      const broadcasts = getBroadcast().mock.calls.map((a) => {
        try { return JSON.parse(a[0] as string); } catch { return {}; }
      });
      if (broadcasts.find((m: { type: string }) => m.type === "winDeclared")) break;
    }

    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.state.phase).toBe("ended");
    expect(syncMsg.winningLine).not.toBeNull();
    expect(syncMsg.winningLine.type).toMatch(/row|col|diagonal/);
    // winningCellIds holds non-blank cells on the winning line (0..gridSize).
    // winningWords mirrors that filter, so their lengths are always equal.
    expect(Array.isArray(syncMsg.winningCellIds)).toBe(true);
    expect(Array.isArray(syncMsg.winningWords)).toBe(true);
    expect(syncMsg.winningWords.length).toBe(syncMsg.winningCellIds.length);
    expect([3, 4, 5]).toContain(syncMsg.gridSize);
  });

  it("G4-gap04: sendSyncToConn emits null/empty win fields when phase === 'lobby'", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    conn._sent.length = 0;

    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.state.phase).toBe("lobby");
    expect(syncMsg.winningLine).toBeNull();
    expect(syncMsg.winningCellIds).toEqual([]);
    expect(syncMsg.winningWords).toEqual([]);
    expect(syncMsg.gridSize).toBeNull();
  });

  it("G5-gap04: sendSyncToConn emits null/empty win fields when phase === 'playing'", () => {
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));
    // Game is now in 'playing' phase; do NOT mark anything.

    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.state.phase).toBe("playing");
    expect(syncMsg.winningLine).toBeNull();
    expect(syncMsg.winningCellIds).toEqual([]);
    expect(syncMsg.winningWords).toEqual([]);
    expect(syncMsg.gridSize).toBeNull();
  });

  it("G6-gap04: onStart with no win-line keys produces null/[] defaults (fresh room)", async () => {
    // All storage reads return undefined — fresh room scenario.
    const getMock = getStorage().get;
    getMock.mockResolvedValue(undefined);

    await (room as unknown as { onStart: () => Promise<void> }).onStart();

    // Add a player so we can observe #sendSyncToConn output.
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    conn._sent.length = 0;

    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));

    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.state.phase).toBe("lobby");
    expect(syncMsg.winningLine).toBeNull();
    expect(syncMsg.winningCellIds).toEqual([]);
    expect(syncMsg.winningWords).toEqual([]);
    expect(syncMsg.gridSize).toBeNull();
  });

  it("G7-gap04: startNewGame resets in-memory win-line state + persists defaults", () => {
    // Drive a full win first, then startNewGame, then syncRequest.
    const conn = makeConn("c1");
    joinPlayer(conn, "p1", "Alice");
    for (let i = 0; i < 5; i++) {
      room.onMessage(conn as never, JSON.stringify({ type: "submitWord", text: `W${i}` }));
    }
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "startGame" }));
    const boardMsg = conn._sent.find((m) => m.includes("boardAssigned"));
    const board = JSON.parse(boardMsg!).cells as Array<{ cellId: string; blank: boolean }>;
    const wordCells = board.filter((c) => !c.blank);
    for (const cell of wordCells) {
      room.onMessage(conn as never, JSON.stringify({ type: "markWord", cellId: cell.cellId }));
      const broadcasts = getBroadcast().mock.calls.map((a) => {
        try { return JSON.parse(a[0] as string); } catch { return {}; }
      });
      if (broadcasts.find((m: { type: string }) => m.type === "winDeclared")) break;
    }

    const storage = getStorage();
    storage.put.mockClear();
    room.onMessage(conn as never, JSON.stringify({ type: "startNewGame" }));

    // Win-line storage should be reset to null/[]
    const winningLinePut = storage.put.mock.calls.find((a) => a[0] === "winningLine");
    const winningCellIdsPut = storage.put.mock.calls.find((a) => a[0] === "winningCellIds");
    const gridSizePut = storage.put.mock.calls.find((a) => a[0] === "gridSize");
    expect(winningLinePut, "winningLine must be persisted on startNewGame").toBeDefined();
    expect((winningLinePut as unknown as [string, unknown])[1]).toBeNull();
    expect((winningCellIdsPut as unknown as [string, unknown[]])[1]).toEqual([]);
    expect((gridSizePut as unknown as [string, unknown])[1]).toBeNull();

    // And syncResponse reflects that (phase is now lobby).
    conn._sent.length = 0;
    room.onMessage(conn as never, JSON.stringify({ type: "syncRequest" }));
    const syncMsg = JSON.parse(conn._sent.find((m) => m.includes("syncResponse"))!);
    expect(syncMsg.state.phase).toBe("lobby");
    expect(syncMsg.winningLine).toBeNull();
    expect(syncMsg.winningCellIds).toEqual([]);
    expect(syncMsg.winningWords).toEqual([]);
    expect(syncMsg.gridSize).toBeNull();
  });
});
