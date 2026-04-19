// Imported only by party/game-room.ts — must NOT be re-exported through client-visible modules.

export const PACK_NAMES = ["corporate-classics", "agile", "it-jargon"] as const;
export type PackName = (typeof PACK_NAMES)[number];

export const STARTER_PACKS: Record<PackName, string[]> = {
  "corporate-classics": [
    "Circle back", "Move the needle", "Low-hanging fruit",
    "Deep dive", "Bandwidth", "Alignment", "Leverage", "Pain point",
    "Boil the ocean", "Action item", "Touch base",
    "Blue-sky thinking", "Drill down", "Holistic approach", "Take offline",
    "Best practices", "Core competency", "Value add",
  ],
  "agile": [
    "Sprint", "Velocity", "Backlog", "Stand-up", "Retrospective",
    "Story points", "Epic", "User story", "Prioritisation",
    "Definition of done", "MVP", "Pivot", "Ship it", "Capacity",
    "Fail fast", "Continuous delivery", "Stakeholder",
  ],
  "it-jargon": [
    "Microservices", "Tech debt", "Refactor", "On-call",
    "Incident", "Runbook", "CI/CD", "Containerize", "Scalability",
    "Latency", "Throughput", "Failover", "Single point of failure", "Observability",
    "Infrastructure as code", "Deprecate", "Breaking change", "Legacy system",
  ],
};
