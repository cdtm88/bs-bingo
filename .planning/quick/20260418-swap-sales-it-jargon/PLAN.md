---
type: quick
title: Swap "sales" starter pack for "it-jargon"
autonomous: true
files_modified:
  - src/lib/util/starterPacks.ts
  - src/lib/protocol/messages.ts
  - src/lib/components/PackPills.svelte
  - src/routes/room/[code]/+page.svelte
---

<objective>
Replace the "sales" starter pack with an "it-jargon" pack across all four touch-points:
the pack data file, the Valibot message schema, the UI pill component, and the page-level
type cast. No "sales" references must remain anywhere in the codebase.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Replace pack data in starterPacks.ts</name>
  <files>src/lib/util/starterPacks.ts</files>
  <action>
    In PACK_NAMES, remove "sales" and add "it-jargon".
    Remove the "sales" key from STARTER_PACKS.
    Add "it-jargon" key with these ~20 words:
      "Kubernetes", "Microservices", "Tech debt", "Refactor", "On-call",
      "Incident", "Rollback", "CI/CD", "Observability", "Service mesh",
      "Container", "Serverless", "Latency", "Throughput", "Scalability",
      "Load balancer", "Rate limiting", "Zero downtime", "SLA", "Runbook"
    Keep the existing comment on line 1.
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep starterPacks || echo "clean"</verify>
  <done>PACK_NAMES = ["corporate-classics", "agile", "it-jargon"], STARTER_PACKS has "it-jargon" key with 20 words, no "sales" key.</done>
</task>

<task type="auto">
  <name>Task 2: Update Valibot schema in messages.ts</name>
  <files>src/lib/protocol/messages.ts</files>
  <action>
    On line 64, change:
      v.picklist(["corporate-classics", "agile", "sales"])
    to:
      v.picklist(["corporate-classics", "agile", "it-jargon"])
    No other changes.
  </action>
  <verify>npx tsc --noEmit 2>&1 | grep messages || echo "clean"</verify>
  <done>picklist no longer contains "sales"; contains "it-jargon".</done>
</task>

<task type="auto">
  <name>Task 3: Update PackPills.svelte and page type cast</name>
  <files>src/lib/components/PackPills.svelte, src/routes/room/[code]/+page.svelte</files>
  <action>
    PackPills.svelte line 12: change { id: "sales", label: "Sales" } to { id: "it-jargon", label: "IT Jargon" }.

    +page.svelte line 135: change the type cast from:
      pack as "corporate-classics" | "agile" | "sales"
    to:
      pack as "corporate-classics" | "agile" | "it-jargon"
  </action>
  <verify>npx tsc --noEmit && grep -r "sales" src/ || echo "no sales refs"</verify>
  <done>TypeScript compiles clean. grep finds zero "sales" strings in src/.</done>
</task>

</tasks>

<verification>
Run: npx tsc --noEmit
Run: grep -r "sales" src/
Expected: tsc exits 0, grep returns no matches.
</verification>

<success_criteria>
- "sales" does not appear anywhere under src/
- "it-jargon" pack is present in starterPacks.ts, messages.ts picklist, PackPills.svelte, and +page.svelte type cast
- TypeScript compiles without errors
</success_criteria>
