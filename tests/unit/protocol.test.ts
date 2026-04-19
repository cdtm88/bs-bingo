import { describe, it, expect } from "vitest";
import * as v from "valibot";
import { ClientMessage, ServerMessage, Player, RoomState, WordEntry, BoardCell, WinningLine } from "../../src/lib/protocol/messages";

describe("ClientMessage", () => {
  it("accepts a valid hello message", () => {
    const result = v.safeParse(ClientMessage, {
      type: "hello",
      playerId: "p1",
      displayName: "Alice"
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid ping message", () => {
    const result = v.safeParse(ClientMessage, { type: "ping" });
    expect(result.success).toBe(true);
  });

  it("rejects hello with empty displayName", () => {
    const result = v.safeParse(ClientMessage, {
      type: "hello",
      playerId: "p1",
      displayName: ""
    });
    expect(result.success).toBe(false);
  });

  it("rejects hello with missing playerId", () => {
    const result = v.safeParse(ClientMessage, {
      type: "hello",
      displayName: "Alice"
    });
    expect(result.success).toBe(false);
  });

  it("rejects hello with displayName exceeding 20 chars", () => {
    const result = v.safeParse(ClientMessage, {
      type: "hello",
      playerId: "p1",
      displayName: "A".repeat(21)
    });
    expect(result.success).toBe(false);
  });

  it("accepts hello with displayName at exactly 20 chars", () => {
    const result = v.safeParse(ClientMessage, {
      type: "hello",
      playerId: "p1",
      displayName: "A".repeat(20)
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown discriminant", () => {
    const result = v.safeParse(ClientMessage, { type: "unknown" });
    expect(result.success).toBe(false);
  });

  it("accepts submitWord with text 1–30 chars", () => {
    const r = v.safeParse(ClientMessage, { type: "submitWord", text: "Synergy" });
    expect(r.success).toBe(true);
  });
  it("rejects submitWord with empty text", () => {
    const r = v.safeParse(ClientMessage, { type: "submitWord", text: "" });
    expect(r.success).toBe(false);
  });
  it("rejects submitWord with text > 30 chars", () => {
    const r = v.safeParse(ClientMessage, { type: "submitWord", text: "a".repeat(31) });
    expect(r.success).toBe(false);
  });
  it("accepts submitWord with exactly 30 chars", () => {
    const r = v.safeParse(ClientMessage, { type: "submitWord", text: "a".repeat(30) });
    expect(r.success).toBe(true);
  });
  it("accepts removeWord with wordId", () => {
    const r = v.safeParse(ClientMessage, { type: "removeWord", wordId: "abc123" });
    expect(r.success).toBe(true);
  });
  it("accepts loadStarterPack with valid pack name", () => {
    const r = v.safeParse(ClientMessage, { type: "loadStarterPack", pack: "agile" });
    expect(r.success).toBe(true);
  });
  it("rejects loadStarterPack with unknown pack name", () => {
    const r = v.safeParse(ClientMessage, { type: "loadStarterPack", pack: "unknown" });
    expect(r.success).toBe(false);
  });
  it("accepts startGame", () => {
    const r = v.safeParse(ClientMessage, { type: "startGame" });
    expect(r.success).toBe(true);
  });
  it("accepts markWord with non-empty cellId", () => {
    const r = v.safeParse(ClientMessage, { type: "markWord", cellId: "cell-abc" });
    expect(r.success).toBe(true);
  });
  it("rejects markWord with empty cellId", () => {
    const r = v.safeParse(ClientMessage, { type: "markWord", cellId: "" });
    expect(r.success).toBe(false);
  });
  it("rejects markWord missing cellId", () => {
    const r = v.safeParse(ClientMessage, { type: "markWord" });
    expect(r.success).toBe(false);
  });
});

describe("ServerMessage", () => {
  it("accepts a valid playerJoined message", () => {
    const result = v.safeParse(ServerMessage, {
      type: "playerJoined",
      player: {
        playerId: "p1",
        displayName: "Alice",
        isHost: false,
        joinedAt: 1
      }
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid roomState message", () => {
    const result = v.safeParse(ServerMessage, {
      type: "roomState",
      state: {
        code: "ABC234",
        phase: "lobby",
        hostId: "p1",
        players: [],
        words: [],
        usedPacks: [],
      }
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid playerLeft message", () => {
    const result = v.safeParse(ServerMessage, {
      type: "playerLeft",
      playerId: "p1"
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid pong message", () => {
    const result = v.safeParse(ServerMessage, { type: "pong" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid error message with optional message", () => {
    const result = v.safeParse(ServerMessage, {
      type: "error",
      code: "bad_message",
      message: "Invalid payload"
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown discriminant", () => {
    const result = v.safeParse(ServerMessage, { type: "unknown" });
    expect(result.success).toBe(false);
  });

  it("accepts wordAdded message", () => {
    const r = v.safeParse(ServerMessage, {
      type: "wordAdded",
      word: { wordId: "w1", text: "Synergy", submittedBy: "p1" },
    });
    expect(r.success).toBe(true);
  });
  it("accepts wordRemoved message", () => {
    const r = v.safeParse(ServerMessage, { type: "wordRemoved", wordId: "w1" });
    expect(r.success).toBe(true);
  });
  it("accepts gameStarted message", () => {
    const r = v.safeParse(ServerMessage, { type: "gameStarted" });
    expect(r.success).toBe(true);
  });
  it("accepts boardAssigned with cells array (word + blank cells)", () => {
    const r = v.safeParse(ServerMessage, {
      type: "boardAssigned",
      cells: [
        { cellId: "c1", wordId: "w1", text: "Synergy", blank: false },
        { cellId: "c2", wordId: null, text: null, blank: true },
      ],
    });
    expect(r.success).toBe(true);
  });
  it("accepts boardAssigned with empty cells array", () => {
    const r = v.safeParse(ServerMessage, { type: "boardAssigned", cells: [] });
    expect(r.success).toBe(true);
  });
  it("accepts wordMarked with playerId and non-negative markCount", () => {
    const r = v.safeParse(ServerMessage, { type: "wordMarked", playerId: "p1", markCount: 3, cellId: "c1" });
    expect(r.success).toBe(true);
  });
  it("accepts wordMarked with markCount = 0", () => {
    const r = v.safeParse(ServerMessage, { type: "wordMarked", playerId: "p1", markCount: 0, cellId: "c1" });
    expect(r.success).toBe(true);
  });
  it("rejects wordMarked with negative markCount", () => {
    const r = v.safeParse(ServerMessage, { type: "wordMarked", playerId: "p1", markCount: -1, cellId: "c1" });
    expect(r.success).toBe(false);
  });
  it("rejects wordMarked with non-integer markCount", () => {
    const r = v.safeParse(ServerMessage, { type: "wordMarked", playerId: "p1", markCount: 1.5, cellId: "c1" });
    expect(r.success).toBe(false);
  });
  it("rejects wordMarked with empty playerId", () => {
    const r = v.safeParse(ServerMessage, { type: "wordMarked", playerId: "", markCount: 0, cellId: "c1" });
    expect(r.success).toBe(false);
  });
});

describe("Player schema", () => {
  it("rejects player with empty playerId", () => {
    const result = v.safeParse(Player, {
      playerId: "",
      displayName: "Alice",
      isHost: false,
      joinedAt: 1
    });
    expect(result.success).toBe(false);
  });

  it("rejects player with displayName over 20 chars", () => {
    const result = v.safeParse(Player, {
      playerId: "p1",
      displayName: "A".repeat(21),
      isHost: false,
      joinedAt: 1
    });
    expect(result.success).toBe(false);
  });
});

describe("RoomState schema", () => {
  it("accepts valid room state with null hostId", () => {
    const result = v.safeParse(RoomState, {
      code: "ABC234",
      phase: "lobby",
      hostId: null,
      players: [],
      words: [],
      usedPacks: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("RoomState — Phase 2 fields", () => {
  it("accepts roomState with phase 'lobby' and empty words/usedPacks", () => {
    const r = v.safeParse(RoomState, {
      code: "ABC234", phase: "lobby", hostId: "p1",
      players: [], words: [], usedPacks: [],
    });
    expect(r.success).toBe(true);
  });
  it("accepts roomState with phase 'playing'", () => {
    const r = v.safeParse(RoomState, {
      code: "ABC234", phase: "playing", hostId: "p1",
      players: [], words: [{ wordId: "w1", text: "Synergy", submittedBy: "p1" }],
      usedPacks: ["agile"],
    });
    expect(r.success).toBe(true);
  });
  it("rejects roomState without words field", () => {
    const r = v.safeParse(RoomState, {
      code: "ABC234", phase: "lobby", hostId: null, players: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("WordEntry schema", () => {
  it("accepts valid WordEntry", () => {
    const r = v.safeParse(WordEntry, { wordId: "w1", text: "Synergy", submittedBy: "p1" });
    expect(r.success).toBe(true);
  });
});

describe("BoardCell schema", () => {
  it("accepts word cell (wordId + text + blank:false)", () => {
    const r = v.safeParse(BoardCell, { cellId: "c1", wordId: "w1", text: "Synergy", blank: false });
    expect(r.success).toBe(true);
  });
  it("accepts blank cell (null wordId + null text + blank:true)", () => {
    const r = v.safeParse(BoardCell, { cellId: "c2", wordId: null, text: null, blank: true });
    expect(r.success).toBe(true);
  });
  it("rejects cell missing blank flag", () => {
    const r = v.safeParse(BoardCell, { cellId: "c3", wordId: "w1", text: "X" });
    expect(r.success).toBe(false);
  });
  it("rejects cell missing cellId", () => {
    const r = v.safeParse(BoardCell, { wordId: "w1", text: "X", blank: false });
    expect(r.success).toBe(false);
  });
});

// --- Phase 4: WinningLine object schema ---
describe("WinningLine schema (Phase 4)", () => {
  it("accepts valid WinningLine { type: 'row', index: 0 }", () => {
    const r = v.safeParse(WinningLine, { type: "row", index: 0 });
    expect(r.success).toBe(true);
  });
  it("rejects WinningLine with unknown type 'anti'", () => {
    const r = v.safeParse(WinningLine, { type: "anti", index: 0 });
    expect(r.success).toBe(false);
  });
  it("rejects WinningLine with negative index", () => {
    const r = v.safeParse(WinningLine, { type: "col", index: -1 });
    expect(r.success).toBe(false);
  });
});

// --- Phase 4: New ClientMessage variant ---
describe("ClientMessage — Phase 4 variants", () => {
  it("accepts startNewGame message (zero payload)", () => {
    const r = v.safeParse(ClientMessage, { type: "startNewGame" });
    expect(r.success).toBe(true);
  });

  // Security gate T-4-03: a forged server message (winDeclared) must NOT parse as ClientMessage
  it("rejects a forged winDeclared attempted as a ClientMessage (T-4-03)", () => {
    const r = v.safeParse(ClientMessage, {
      type: "winDeclared",
      winnerId: "p1",
      winnerName: "Evil",
      winningLine: { type: "row", index: 0 },
      winningCellIds: [],
    });
    expect(r.success).toBe(false);
  });
});

// --- Phase 4: New ServerMessage variants ---
describe("ServerMessage — Phase 4 variants", () => {
  it("accepts winDeclared with full payload", () => {
    const r = v.safeParse(ServerMessage, {
      type: "winDeclared",
      winnerId: "p1",
      winnerName: "Alice",
      winningLine: { type: "row", index: 0 },
      winningCellIds: ["c1", "c2", "c3"],
      winningWords: ["Alpha", "Beta", "Gamma"],
      gridSize: 3,
    });
    expect(r.success).toBe(true);
  });
  it("rejects winDeclared with empty winnerId", () => {
    const r = v.safeParse(ServerMessage, {
      type: "winDeclared",
      winnerId: "",
      winnerName: "Alice",
      winningLine: { type: "row", index: 0 },
      winningCellIds: [],
    });
    expect(r.success).toBe(false);
  });
  it("rejects winDeclared with negative winningLine.index (via WinningLine)", () => {
    const r = v.safeParse(ServerMessage, {
      type: "winDeclared",
      winnerId: "p1",
      winnerName: "Alice",
      winningLine: { type: "row", index: -1 },
      winningCellIds: [],
    });
    expect(r.success).toBe(false);
  });
  it("accepts gameReset (zero payload)", () => {
    const r = v.safeParse(ServerMessage, { type: "gameReset" });
    expect(r.success).toBe(true);
  });
});

// --- Phase 4: RoomState.phase expanded union ---
describe("RoomState — Phase 4 phase='ended'", () => {
  it("accepts roomState with phase = 'ended'", () => {
    const r = v.safeParse(RoomState, {
      code: "ABC123",
      phase: "ended",
      hostId: "p1",
      players: [],
      words: [],
      usedPacks: [],
    });
    expect(r.success).toBe(true);
  });
  it("rejects roomState with unknown phase 'playing_over'", () => {
    const r = v.safeParse(RoomState, {
      code: "ABC123",
      phase: "playing_over",
      hostId: "p1",
      players: [],
      words: [],
      usedPacks: [],
    });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Phase 5: Resilience message variants (RESI-01/02/03/05)
// ---------------------------------------------------------------------------

const validRoomState = {
  code: "ABC123",
  phase: "lobby" as const,
  hostId: "p1",
  players: [],
  words: [],
  usedPacks: [],
};

const validCell = { cellId: "c1", wordId: "w1", text: "Synergy", blank: false };

// M1: syncRequest ClientMessage
describe("ClientMessage — Phase 5 variants", () => {
  it("M1: accepts syncRequest (zero payload)", () => {
    const r = v.safeParse(ClientMessage, { type: "syncRequest" });
    expect(r.success).toBe(true);
  });
});

// M2-M6: new ServerMessage variants
describe("ServerMessage — Phase 5 variants", () => {
  it("M2: accepts syncResponse with null board and empty markedCellIds (win fields nulled)", () => {
    const r = v.safeParse(ServerMessage, {
      type: "syncResponse",
      state: validRoomState,
      board: null,
      markedCellIds: [],
      winningLine: null,
      winningCellIds: [],
      winningWords: [],
      gridSize: null,
    });
    expect(r.success).toBe(true);
  });

  it("M3: accepts syncResponse with a non-null board and markedCellIds (win fields nulled)", () => {
    const r = v.safeParse(ServerMessage, {
      type: "syncResponse",
      state: validRoomState,
      board: [validCell],
      markedCellIds: ["c1"],
      winningLine: null,
      winningCellIds: [],
      winningWords: [],
      gridSize: null,
    });
    expect(r.success).toBe(true);
  });

  it("M4: accepts playerDisconnected with playerId", () => {
    const r = v.safeParse(ServerMessage, {
      type: "playerDisconnected",
      playerId: "p1",
    });
    expect(r.success).toBe(true);
  });

  it("M5: accepts playerReconnected with playerId and isHost=false", () => {
    const r = v.safeParse(ServerMessage, {
      type: "playerReconnected",
      playerId: "p1",
      isHost: false,
    });
    expect(r.success).toBe(true);
  });

  it("M6: accepts hostChanged with newHostId", () => {
    const r = v.safeParse(ServerMessage, {
      type: "hostChanged",
      newHostId: "p2",
    });
    expect(r.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 5 gap-04 (RESI-03): syncResponse win fields (plan 05-04)
// ---------------------------------------------------------------------------

const validRoomStateLobby = {
  code: "ABC123",
  phase: "lobby" as const,
  hostId: "p1",
  players: [{ playerId: "p1", displayName: "Alice", isHost: true, joinedAt: 1000 }],
  words: [],
  usedPacks: [],
};

const validRoomStateEnded = {
  code: "ABC123",
  phase: "ended" as const,
  hostId: "p1",
  players: [{ playerId: "p1", displayName: "Alice", isHost: true, joinedAt: 1000 }],
  words: [],
  usedPacks: [],
  winnerId: "p1",
  winnerName: "Alice",
};

describe("ServerMessage syncResponse win fields (gap-04)", () => {
  it("M1-gap04: accepts syncResponse in lobby with null/empty win fields", () => {
    const r = v.safeParse(ServerMessage, {
      type: "syncResponse",
      state: validRoomStateLobby,
      board: null,
      markedCellIds: [],
      winningLine: null,
      winningCellIds: [],
      winningWords: [],
      gridSize: null,
    });
    expect(r.success).toBe(true);
  });

  it("M2-gap04: accepts syncResponse in ended phase with full win-line payload", () => {
    const r = v.safeParse(ServerMessage, {
      type: "syncResponse",
      state: validRoomStateEnded,
      board: [validCell],
      markedCellIds: ["c1"],
      winningLine: { type: "row", index: 0 },
      winningCellIds: ["c1", "c2", "c3"],
      winningWords: ["Synergy", "Leverage", "Blockers"],
      gridSize: 3,
    });
    expect(r.success).toBe(true);
  });

  it("M3-gap04: rejects syncResponse missing win fields (now required)", () => {
    const r = v.safeParse(ServerMessage, {
      type: "syncResponse",
      state: validRoomStateLobby,
      board: null,
      markedCellIds: [],
    });
    expect(r.success).toBe(false);
  });

  it("M4-gap04: rejects syncResponse with invalid gridSize (6 not in picklist)", () => {
    const r = v.safeParse(ServerMessage, {
      type: "syncResponse",
      state: validRoomStateEnded,
      board: [],
      markedCellIds: [],
      winningLine: { type: "row", index: 0 },
      winningCellIds: [],
      winningWords: [],
      gridSize: 6,
    });
    expect(r.success).toBe(false);
  });
});

// M7-M8: RoomState winnerId/winnerName optional fields
describe("RoomState — Phase 5 winnerId/winnerName", () => {
  it("M7: accepts RoomState with winnerId: null and winnerName: null", () => {
    const r = v.safeParse(RoomState, {
      ...validRoomState,
      winnerId: null,
      winnerName: null,
    });
    expect(r.success).toBe(true);
  });

  it("M8: accepts RoomState without winnerId/winnerName (existing shape — fields are optional)", () => {
    const r = v.safeParse(RoomState, validRoomState);
    expect(r.success).toBe(true);
  });
});
