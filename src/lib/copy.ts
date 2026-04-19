// Phase 6 — copy module (CONTEXT D-14, RESEARCH Pattern 2)
// Every user-facing string routes through this module. No inline ternaries in components.
import { theme } from "$lib/stores/theme.svelte";

type Theme = "sfw" | "nsfw";

const STRINGS = {
  sfw: {
    // Branding & meta
    brand: "Buzzword Bingo",
    metaDescription: "The meeting game. Mark the buzzwords, first to a line wins.",
    homeTagline: "The meeting game. Mark the buzzwords, first to a line wins.",

    // Home CTAs
    createCta: "Create a game",
    joinCta: "Join",
    modalCreateSubmit: "Create game",
    modalJoinSubmit: "Join game",
    joinModalTitle: "What should we call you?",
    joinCodeLabel: "Join with code",
    joinCodePlaceholder: "ABC234",
    orDivider: "or",
    joinModalNameHelper: "Max 20 characters. Nothing permanent — just for this game.",

    // Validation messages
    emptyName: "Pick a name first.",
    maxChars: "Max 20 characters.",
    invalidCode: "Codes are 6 letters and numbers. Try again.",
    roomNotFoundError: "Room not found. Check the code and try again.",
    genericError: "Something went wrong. Try again.",

    // Lobby
    wordInputLabel: "Add a buzzword",
    wordInputPlaceholder: "Add a buzzword…",
    duplicateWord: "Already on the list.",
    startGame: "Start Game",
    waitingForHostLobby: "Waiting for the host to start.",
    waitingForPlayers: "Waiting for players. Share the code or link to get going.",
    addWordButton: "Add",
    playersLabel: "Players",

    // Word pool
    wordPoolEmptyHeading: "No words yet",
    wordPoolEmptyBody:
      "Add buzzwords you expect to hear. The pool grows as everyone contributes.",

    // Starter packs
    packCorporate: "Corporate Classics",
    packAgile: "Agile",
    packITJargon: "IT Jargon",

    // End screen
    winHeadline: "BINGO!",
    playAgain: "Start new game",
    endWaitingForHost: "Waiting for the host to start a new game.",
    winnerCallout: "You called it.",
    winLineSuffixWinner: ".",
    winLineSuffixNonWinner: " completed.",
    nonWinnerConsolation: "Nice try. One more round?",
    playAgainHostNote: "Word pool and players are kept. You can tweak the pool before starting.",

    // Banner
    reconnectingBanner: "Reconnecting…",

    // Error page
    errorHeading: "Room not found",
    errorBody: "That game is over, the code is wrong, or the room expired. Want to kick off a new one?",
    errorCta: "Create a new game",
  },
  nsfw: {
    brand: "Bullshit Bingo",
    metaDescription: "For meetings that could've been a Teams message nobody asked for.",
    homeTagline: "For meetings that could've been a Teams message nobody asked for.",

    createCta: "Start the chaos",
    joinCta: "Pull up a chair",
    modalCreateSubmit: "Start the chaos",
    modalJoinSubmit: "Pull up a chair",
    joinModalTitle: "What are they calling you in this one?",
    joinCodeLabel: "Got a code?",
    joinCodePlaceholder: "WTF123",
    orDivider: "or drag someone in",
    joinModalNameHelper: "Max 20 characters. It's one meeting — don't overthink it.",

    emptyName: "Come on, give us something.",
    maxChars: "Max 20 characters. Keep it snappy — this isn't a performance review.",
    invalidCode: "Six letters and numbers. Try again, champ.",
    roomNotFoundError: "Room's gone or that code's wrong. Try again.",
    genericError: "Something broke. Not ideal. Try again.",

    wordInputLabel: "What corporate BS will they say?",
    wordInputPlaceholder: "What corporate BS will they say?",
    duplicateWord: "Already on the list. Dig deeper.",
    startGame: "Start the suffering",
    waitingForHostLobby: "Waiting for someone to finally hit unmute…",
    waitingForPlayers: "Who's ready to suffer? Share the code to drag someone in.",
    addWordButton: "Log it",
    playersLabel: "Attendees",

    // Word pool
    wordPoolEmptyHeading: "Pool's empty. Someone start.",
    wordPoolEmptyBody: "Drop the BS you're expecting. Everyone pitches in — it's a team sport now.",

    packCorporate: "Corporate Classics (the greatest hits)",
    packAgile: "Agile (🙄)",
    packITJargon: "IT Jargon (you poor soul)",

    winHeadline: "CALLED IT!",
    playAgain: "Back into the grinder",
    endWaitingForHost: "Waiting for the host to summon everyone back…",
    winnerCallout: "You clocked it.",
    winLineSuffixWinner: ".",
    winLineSuffixNonWinner: ". And you missed it.",
    nonWinnerConsolation: "You lost. The meeting continues.",
    playAgainHostNote: "Same suspects, same pool. Add more ammo before you start.",

    reconnectingBanner: "Hanging on for dear life…",

    errorHeading: "That room's gone.",
    errorBody: "Probably for the best. Go find another meeting to survive.",
    errorCta: "Spin up a new one",
  },
} as const;

type CopyKey = keyof typeof STRINGS.sfw;

// Proxy re-reads theme.current on every access — Svelte 5 reactivity tracks the getter call.
export const copy = new Proxy({} as Record<CopyKey, string>, {
  get(_target, key: string): string {
    const t: Theme = theme.current;
    const bundle = STRINGS[t];
    return (bundle as Record<string, string>)[key] ?? "";
  },
});

// Interpolation helpers — callers use these instead of bare `copy.*` so Svelte tracks the reactive read.
export function winnerSubhead(name: string): string {
  return theme.current === "nsfw" ? `${name} called Bullshit.` : `${name} wins!`;
}

export function nonWinnerSubhead(name: string): string {
  return theme.current === "nsfw" ? `${name} called it before you.` : `${name} called Bingo!`;
}

// For host-waiting copy that must interpolate a name (lobby):
export function waitingForHost(hostName: string): string {
  return theme.current === "nsfw"
    ? `Waiting for ${hostName} to finally hit unmute…`
    : `Waiting for ${hostName} to start the game…`;
}
