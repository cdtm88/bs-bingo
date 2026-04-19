import { describe, it, expect, beforeEach } from "vitest";
import { theme } from "../../src/lib/stores/theme.svelte";
import { copy, winnerSubhead, nonWinnerSubhead, waitingForHost } from "../../src/lib/copy";

describe("copy module", () => {
  beforeEach(() => {
    localStorage.clear();
    theme.init();
    theme.set("sfw");
  });

  it("returns SFW brand by default", () => {
    expect(copy.brand).toBe("Buzzword Bingo");
  });

  it("returns NSFW brand when theme=nsfw", () => {
    theme.set("nsfw");
    expect(copy.brand).toBe("Bullshit Bingo");
  });

  it("returns SFW tagline", () => {
    expect(copy.homeTagline).toBe("The meeting game. Mark the buzzwords, first to a line wins.");
  });

  it("returns NSFW tagline when nsfw", () => {
    theme.set("nsfw");
    expect(copy.homeTagline).toBe("For meetings that could've been a Teams message nobody asked for.");
  });

  it("returns SFW start game label", () => {
    expect(copy.startGame).toBe("Start Game");
  });

  it("returns NSFW start game label", () => {
    theme.set("nsfw");
    expect(copy.startGame).toBe("Start the suffering");
  });

  it("returns SFW win headline BINGO!", () => {
    expect(copy.winHeadline).toBe("BINGO!");
  });

  it("returns NSFW win headline CALLED IT!", () => {
    theme.set("nsfw");
    expect(copy.winHeadline).toBe("CALLED IT!");
  });

  it("winnerSubhead interpolates name for SFW", () => {
    expect(winnerSubhead("Alice")).toBe("Alice wins!");
  });

  it("winnerSubhead interpolates name for NSFW", () => {
    theme.set("nsfw");
    expect(winnerSubhead("Alice")).toBe("Alice called Bullshit.");
  });

  it("nonWinnerSubhead interpolates name for SFW", () => {
    expect(nonWinnerSubhead("Alice")).toBe("Alice called Bingo!");
  });

  it("nonWinnerSubhead interpolates name for NSFW", () => {
    theme.set("nsfw");
    expect(nonWinnerSubhead("Alice")).toBe("Alice called it before you.");
  });

  it("returns SFW reconnecting banner copy", () => {
    expect(copy.reconnectingBanner).toBe("Reconnecting…");
  });

  it("returns NSFW reconnecting banner copy", () => {
    theme.set("nsfw");
    expect(copy.reconnectingBanner).toBe("Hanging on for dear life…");
  });

  // Phase 7 — rewritten NSFW copy coverage
  it("returns NSFW metaDescription rewrite", () => {
    theme.set("nsfw");
    expect(copy.metaDescription).toBe("For meetings that could've been a Teams message nobody asked for.");
  });

  it("returns NSFW joinCta rewrite", () => {
    theme.set("nsfw");
    expect(copy.joinCta).toBe("Pull up a chair");
  });

  it("returns NSFW modalJoinSubmit rewrite", () => {
    theme.set("nsfw");
    expect(copy.modalJoinSubmit).toBe("Pull up a chair");
  });

  it("returns NSFW joinModalTitle rewrite", () => {
    theme.set("nsfw");
    expect(copy.joinModalTitle).toBe("What are they calling you in this one?");
  });

  it("returns NSFW maxChars rewrite", () => {
    theme.set("nsfw");
    expect(copy.maxChars).toBe("Max 20 characters. Keep it snappy — this isn't a performance review.");
  });

  it("returns NSFW invalidCode rewrite", () => {
    theme.set("nsfw");
    expect(copy.invalidCode).toBe("Six letters and numbers. Try again, champ.");
  });

  it("returns NSFW duplicateWord rewrite", () => {
    theme.set("nsfw");
    expect(copy.duplicateWord).toBe("Already on the list. Dig deeper.");
  });

  it("returns NSFW waitingForHostLobby rewrite", () => {
    theme.set("nsfw");
    expect(copy.waitingForHostLobby).toBe("Waiting for someone to finally hit unmute…");
  });

  it("returns NSFW addWordButton rewrite", () => {
    theme.set("nsfw");
    expect(copy.addWordButton).toBe("Log it");
  });

  it("returns NSFW playersLabel rewrite", () => {
    theme.set("nsfw");
    expect(copy.playersLabel).toBe("Attendees");
  });

  it("returns NSFW wordPoolEmptyHeading rewrite", () => {
    theme.set("nsfw");
    expect(copy.wordPoolEmptyHeading).toBe("Pool's empty. Someone start.");
  });

  it("returns NSFW wordPoolEmptyBody rewrite", () => {
    theme.set("nsfw");
    expect(copy.wordPoolEmptyBody).toBe("Drop the BS you're expecting. Everyone pitches in — it's a team sport now.");
  });

  it("returns NSFW playAgain rewrite", () => {
    theme.set("nsfw");
    expect(copy.playAgain).toBe("Back into the grinder");
  });

  it("returns NSFW endWaitingForHost rewrite", () => {
    theme.set("nsfw");
    expect(copy.endWaitingForHost).toBe("Waiting for the host to summon everyone back…");
  });

  it("returns NSFW errorCta rewrite", () => {
    theme.set("nsfw");
    expect(copy.errorCta).toBe("Spin up a new one");
  });

  it("waitingForHost NSFW branch rewritten to 'hit unmute'", () => {
    theme.set("nsfw");
    expect(waitingForHost("Alice")).toBe("Waiting for Alice to finally hit unmute…");
  });

  it("waitingForHost SFW branch unchanged", () => {
    expect(waitingForHost("Alice")).toBe("Waiting for Alice to start the game…");
  });

  // Quality-ceiling regression guards (these must NEVER change)
  it("NSFW createCta remains 'Start the chaos'", () => {
    theme.set("nsfw");
    expect(copy.createCta).toBe("Start the chaos");
  });

  it("NSFW emptyName remains quality-ceiling", () => {
    theme.set("nsfw");
    expect(copy.emptyName).toBe("Come on, give us something.");
  });

  it("NSFW startGame remains 'Start the suffering'", () => {
    theme.set("nsfw");
    expect(copy.startGame).toBe("Start the suffering");
  });

  // --- Phase 8 new keys ---

  it("returns SFW winnerCallout", () => {
    expect(copy.winnerCallout).toBe("You called it.");
  });

  it("returns NSFW winnerCallout", () => {
    theme.set("nsfw");
    expect(copy.winnerCallout).toBe("You clocked it.");
  });

  it("returns SFW winLineSuffixWinner (period)", () => {
    expect(copy.winLineSuffixWinner).toBe(".");
  });

  it("returns NSFW winLineSuffixWinner (period — unchanged from SFW by design)", () => {
    theme.set("nsfw");
    expect(copy.winLineSuffixWinner).toBe(".");
  });

  it("returns SFW winLineSuffixNonWinner", () => {
    expect(copy.winLineSuffixNonWinner).toBe(" completed.");
  });

  it("returns NSFW winLineSuffixNonWinner", () => {
    theme.set("nsfw");
    expect(copy.winLineSuffixNonWinner).toBe(". And you missed it.");
  });

  it("returns SFW nonWinnerConsolation", () => {
    expect(copy.nonWinnerConsolation).toBe("Nice try. One more round?");
  });

  it("returns NSFW nonWinnerConsolation (deadpan contempt)", () => {
    theme.set("nsfw");
    expect(copy.nonWinnerConsolation).toBe("You lost. The meeting continues.");
  });

  it("returns SFW playAgainHostNote", () => {
    expect(copy.playAgainHostNote).toBe(
      "Word pool and players are kept. You can tweak the pool before starting."
    );
  });

  it("returns NSFW playAgainHostNote", () => {
    theme.set("nsfw");
    expect(copy.playAgainHostNote).toBe(
      "Same suspects, same pool. Add more ammo before you start."
    );
  });

  it("returns SFW joinCodeLabel", () => {
    expect(copy.joinCodeLabel).toBe("Join with code");
  });

  it("returns NSFW joinCodeLabel", () => {
    theme.set("nsfw");
    expect(copy.joinCodeLabel).toBe("Got a code?");
  });

  it("returns SFW joinCodePlaceholder", () => {
    expect(copy.joinCodePlaceholder).toBe("ABC234");
  });

  it("returns NSFW joinCodePlaceholder", () => {
    theme.set("nsfw");
    expect(copy.joinCodePlaceholder).toBe("WTF123");
  });

  it("returns SFW orDivider", () => {
    expect(copy.orDivider).toBe("or");
  });

  it("returns NSFW orDivider", () => {
    theme.set("nsfw");
    expect(copy.orDivider).toBe("or drag someone in");
  });

  it("returns SFW joinModalNameHelper", () => {
    expect(copy.joinModalNameHelper).toBe(
      "Max 20 characters. Nothing permanent — just for this game."
    );
  });

  it("returns NSFW joinModalNameHelper", () => {
    theme.set("nsfw");
    expect(copy.joinModalNameHelper).toBe(
      "Max 20 characters. It's one meeting — don't overthink it."
    );
  });

  it("returns SFW roomNotFoundError", () => {
    expect(copy.roomNotFoundError).toBe("Room not found. Check the code and try again.");
  });

  it("returns NSFW roomNotFoundError", () => {
    theme.set("nsfw");
    expect(copy.roomNotFoundError).toBe("Room's gone or that code's wrong. Try again.");
  });

  it("returns SFW genericError", () => {
    expect(copy.genericError).toBe("Something went wrong. Try again.");
  });

  it("returns NSFW genericError", () => {
    theme.set("nsfw");
    expect(copy.genericError).toBe("Something broke. Not ideal. Try again.");
  });

  // --- Phase 8 sharpened NSFW values (D-08/D-09 audit) ---

  it("sharpened NSFW addWordButton reads 'Log it' (was 'Add it')", () => {
    theme.set("nsfw");
    expect(copy.addWordButton).toBe("Log it");
  });

  it("sharpened NSFW wordPoolEmptyHeading (was generic 'Nothing in the pool yet')", () => {
    theme.set("nsfw");
    expect(copy.wordPoolEmptyHeading).toBe("Pool's empty. Someone start.");
  });

  // --- Phase 8 quality-ceiling regression guards (must NEVER change) ---

  it("NSFW winHeadline remains 'CALLED IT!' (quality ceiling)", () => {
    theme.set("nsfw");
    expect(copy.winHeadline).toBe("CALLED IT!");
  });

  it("NSFW reconnectingBanner remains 'Hanging on for dear life…' (quality ceiling)", () => {
    theme.set("nsfw");
    expect(copy.reconnectingBanner).toBe("Hanging on for dear life…");
  });

  it("NSFW playAgain remains 'Back into the grinder' (quality ceiling)", () => {
    theme.set("nsfw");
    expect(copy.playAgain).toBe("Back into the grinder");
  });

  it("NSFW modalJoinSubmit remains 'Pull up a chair' (quality ceiling)", () => {
    theme.set("nsfw");
    expect(copy.modalJoinSubmit).toBe("Pull up a chair");
  });
});
