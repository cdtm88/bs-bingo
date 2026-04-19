<!-- generated-by: gsd-doc-writer -->
# API Reference

Bullshit Bingo has two API surfaces: a small HTTP REST API for room lifecycle operations, and a WebSocket (PartySocket) protocol for all real-time game events. All game state transitions happen over WebSocket.

---

## Authentication

There is no authentication layer. The game is zero-signup — players are identified by a `playerId` generated client-side via `nanoid` and stored in `sessionStorage` under the key `bsbingo_player_<code>`.

The `playerId` is passed as a WebSocket query parameter (`?playerId=<id>`) on connect and included in `hello` messages. The server uses it to assign host status and ownership of words/marks. No API keys, tokens, or cookies are required.

---

## HTTP Endpoints

| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| `POST` | `/api/rooms` | Create a new game room | No |
| `GET` | `/api/rooms/[code]/exists` | Check whether a room is live | No |

### `POST /api/rooms`

Creates a new game room. Generates a 6-character room code from the unambiguous alphabet (`ABCDEFGHJKMNPQRSTUVWXYZ23456789`), registers it in a Durable Object, and returns a shareable URL.

**Request body:** none

**Response — `200 OK`:**
```json
{
  "code": "A3KM7P",
  "shareUrl": "https://<origin>/join/A3KM7P"
}
```

**Error responses:**

| Status | Body | Cause |
|--------|------|-------|
| `500` | `{ "message": "Could not allocate a room code" }` | 5 consecutive code collisions (astronomically unlikely) |
| `500` | `{ "message": "Platform unavailable" }` | Worker binding not present (misconfigured deployment) |

---

### `GET /api/rooms/[code]/exists`

Checks whether a room was formally created and is still live. Used by the join flow before connecting via WebSocket.

**URL parameter:** `code` — 6 uppercase alphanumeric characters from the unambiguous alphabet.

**Response — `200 OK`:**
```json
{
  "exists": true,
  "playerCount": 3
}
```

**Response — `404 Not Found`:**
```json
{
  "message": "Room not found"
}
```

The `404` is returned when the room code is invalid, was never created, or the Durable Object has been reaped after 30 minutes of idle with no players.

---

## WebSocket Protocol

Clients connect to:
```
wss://<origin>/parties/game-room/<code>?playerId=<playerId>
```

The `game-room` segment is the PartyServer party name (`PARTY_NAME = "game-room"` in `src/lib/protocol/messages.ts`). The `<code>` is the 6-character room code. `playerId` is optional on connect — if supplied and recognized, the server sends a `syncResponse` for reconnection rather than waiting for a `hello`.

The client library is `PartySocket` (`partysocket` package), which provides auto-reconnect with exponential backoff.

All messages are JSON-serialized. Schemas are defined and validated with Valibot in `src/lib/protocol/messages.ts`.

---

### Client → Server Messages

#### `hello`

Registers a new player in the room. Must be the first message sent by any new connection. Rejected with `game_in_progress` if the game has already started.

```json
{
  "type": "hello",
  "playerId": "<nanoid>",
  "displayName": "Alice"
}
```

| Field | Constraints |
|-------|-------------|
| `playerId` | Non-empty string |
| `displayName` | 1–20 characters |

**Side effects:** First player to send `hello` becomes the host. The server sends a `roomState` snapshot to the sender and broadcasts `playerJoined` to everyone else.

---

#### `ping`

Heartbeat. Server replies with `pong`.

```json
{ "type": "ping" }
```

---

#### `submitWord`

Adds a word to the shared word pool. Available to all players during the lobby phase.

```json
{
  "type": "submitWord",
  "text": "Circle back"
}
```

| Constraint | Value |
|------------|-------|
| Max length | 30 characters |
| Max pool size | 200 words |
| Duplicates | Rejected with `duplicate_word` error |

**Side effects:** Broadcasts `wordAdded` to all players.

---

#### `removeWord`

Removes a word the calling player submitted. Only the submitter may remove their own word.

```json
{
  "type": "removeWord",
  "wordId": "<nanoid>"
}
```

**Side effects:** Broadcasts `wordRemoved` to all players. Silently ignored if the word does not exist. Returns `not_owner` error if the caller did not submit the word.

---

#### `loadStarterPack`

Host-only. Bulk-loads a curated word list into the pool. Each pack can only be loaded once per room session.

```json
{
  "type": "loadStarterPack",
  "pack": "corporate-classics"
}
```

| `pack` value | Contents |
|---|---|
| `corporate-classics` | Circle back, Move the needle, Low-hanging fruit, … (18 words) |
| `agile` | Sprint, Velocity, Backlog, Stand-up, … (17 words) |
| `it-jargon` | Microservices, Tech debt, Refactor, CI/CD, … (18 words) |

**Side effects:** Broadcasts `wordAdded` for each new word added (duplicates are skipped). Silently ignored for non-hosts.

---

#### `startGame`

Host-only. Transitions the room from `lobby` to `playing`. Requires at least 5 words in the pool.

```json
{ "type": "startGame" }
```

**Side effects:** Broadcasts `gameStarted` to all players, then sends each player their private randomized `boardAssigned` message. Board size is derived from pool size: 3×3 (< some threshold), 4×4, or 5×5.

**Error:** `not_enough_words` if the pool has fewer than 5 words.

---

#### `markWord`

Marks or unmarks a cell on the calling player's board. Toggle — calling again with the same `cellId` unmarks it.

```json
{
  "type": "markWord",
  "cellId": "<nanoid>"
}
```

The `cellId` must be on the caller's own board and must not be a blank cell. Silently dropped otherwise.

**Side effects:** Broadcasts `wordMarked` to all players. If the mark completes a line, also broadcasts `winDeclared` and transitions the room to `ended`.

---

#### `startNewGame`

Host-only. Resets the room from `ended` back to `lobby`. Clears boards and marks; retains the player roster and word pool.

```json
{ "type": "startNewGame" }
```

**Side effects:** Broadcasts `gameReset` to all players.

---

#### `syncRequest`

Requests a full state snapshot from the server. Used on reconnection to rehydrate client state.

```json
{ "type": "syncRequest" }
```

**Side effects:** Server replies with a `syncResponse` targeted at the requesting connection only.

---

### Server → Client Messages

#### `roomState`

Full room state snapshot. Sent to a player immediately after they send `hello`.

```json
{
  "type": "roomState",
  "state": {
    "code": "A3KM7P",
    "phase": "lobby",
    "hostId": "<playerId>",
    "players": [
      { "playerId": "…", "displayName": "Alice", "isHost": true, "joinedAt": 1713456789000 }
    ],
    "words": [
      { "wordId": "…", "text": "Circle back", "submittedBy": "<playerId>" }
    ],
    "usedPacks": [],
    "winnerId": null,
    "winnerName": null
  }
}
```

**`phase` values:** `"lobby"` | `"playing"` | `"ended"`

---

#### `playerJoined`

Broadcast to all players except the newcomer when a new player sends `hello`.

```json
{
  "type": "playerJoined",
  "player": { "playerId": "…", "displayName": "Bob", "isHost": false, "joinedAt": 1713456800000 }
}
```

---

#### `playerLeft`

Broadcast when a disconnected player's 45-second reconnect slot expires and they are permanently removed.

```json
{ "type": "playerLeft", "playerId": "…" }
```

---

#### `playerDisconnected`

Broadcast immediately when a player's WebSocket closes, before the slot-hold window expires. Peers use this to show a disconnect indicator.

```json
{ "type": "playerDisconnected", "playerId": "…" }
```

---

#### `playerReconnected`

Broadcast to all peers (excluding the reconnecting connection) when a player reconnects within the 45-second slot-hold window.

```json
{
  "type": "playerReconnected",
  "playerId": "…",
  "isHost": false
}
```

---

#### `hostChanged`

Broadcast when the host disconnects permanently and the server promotes the longest-tenured connected player to host.

```json
{ "type": "hostChanged", "newHostId": "…" }
```

---

#### `wordAdded`

Broadcast to all players when a word is added to the pool (via `submitWord` or `loadStarterPack`).

```json
{
  "type": "wordAdded",
  "word": { "wordId": "…", "text": "Circle back", "submittedBy": "<playerId>" }
}
```

---

#### `wordRemoved`

Broadcast to all players when a word is removed.

```json
{ "type": "wordRemoved", "wordId": "…" }
```

---

#### `gameStarted`

Broadcast to all players when the host starts the game. Clients should mount the board UI before `boardAssigned` arrives.

```json
{ "type": "gameStarted" }
```

---

#### `boardAssigned`

Sent privately to each individual player (never broadcast) after `gameStarted`. Contains that player's unique randomized board.

```json
{
  "type": "boardAssigned",
  "cells": [
    { "cellId": "…", "wordId": "…", "text": "Circle back", "blank": false },
    { "cellId": "…", "wordId": null, "text": null, "blank": true }
  ]
}
```

Board sizes: 9 cells (3×3), 16 cells (4×4), or 25 cells (5×5) depending on pool size.

---

#### `wordMarked`

Broadcast to all players when any player marks or unmarks a cell.

```json
{
  "type": "wordMarked",
  "playerId": "…",
  "markCount": 7,
  "cellId": "…"
}
```

`markCount` is the total number of marked cells for that player. `cellId` identifies which cell changed.

---

#### `winDeclared`

Broadcast to all players when a player completes a line.

```json
{
  "type": "winDeclared",
  "winnerId": "…",
  "winnerName": "Alice",
  "winningLine": { "type": "row", "index": 2 },
  "winningCellIds": ["…", "…", "…", "…", "…"],
  "winningWords": ["Circle back", "Deep dive", "Bandwidth", "Alignment", "MVP"],
  "gridSize": 5
}
```

| `winningLine.type` | Meaning |
|---|---|
| `"row"` | Horizontal line; `index` is 0-based row number |
| `"col"` | Vertical line; `index` is 0-based column number |
| `"diagonal"` | Diagonal; `index` is `0` (top-left → bottom-right) or `1` (top-right → bottom-left) |

`gridSize` is `3`, `4`, or `5`.

---

#### `gameReset`

Broadcast when the host resets the room to lobby after a win.

```json
{ "type": "gameReset" }
```

---

#### `syncResponse`

Sent to an individual connection in response to `syncRequest` (or on reconnect). Provides full state plus the player's board, marks, and win details.

```json
{
  "type": "syncResponse",
  "state": { /* RoomState — same shape as roomState.state */ },
  "board": [ /* BoardCell[] or null if game not started */ ],
  "markedCellIds": ["…", "…"],
  "winningLine": { "type": "diagonal", "index": 0 },
  "winningCellIds": ["…"],
  "winningWords": ["…"],
  "gridSize": 5
}
```

`winningLine`, `winningCellIds`, `winningWords`, and `gridSize` are `null` / empty when the room is not in `ended` phase.

---

#### `pong`

Reply to a client `ping`.

```json
{ "type": "pong" }
```

---

#### `error`

Sent to the individual connection that triggered the error.

```json
{
  "type": "error",
  "code": "not_enough_words",
  "message": "Optional human-readable detail"
}
```

| `code` | Trigger |
|--------|---------|
| `bad_message` | JSON parse failure or Valibot schema violation |
| `game_in_progress` | `hello` sent after the game has started |
| `not_enough_words` | `startGame` with fewer than 5 words in the pool |
| `duplicate_word` | `submitWord` with text already in the pool (case-insensitive) |
| `word_limit_reached` | `submitWord` when the pool already has 200 words |
| `not_owner` | `removeWord` called by someone other than the word's submitter |

---

## Room Lifecycle

```
POST /api/rooms
      │
      ▼
  phase: lobby  ◄──── gameReset (host-only)
      │
  startGame (host-only, min 5 words)
      │
      ▼
  phase: playing
      │
  markWord → win detected
      │
      ▼
  phase: ended
```

Rooms are automatically reaped 30 minutes after the last player disconnects. During an active session, disconnected players have a 45-second slot-hold window to reconnect before being permanently removed.
