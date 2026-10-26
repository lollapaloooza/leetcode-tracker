# ADR-001: Keep the layered structure, tighten its boundaries before adding cloud sync

**Status:** Accepted — implemented 2026-10-25 except item 8
**Date:** 2026-10-25
**Deciders:** Project owner

## Context

The app is a local-first React SPA (~5,000 lines of app code, plus ~1,900 lines of shadcn UI and ~800 lines of static data). Today it is organized in layers:

```
src/
  data/          static catalog (problems.ts, python-cheatsheet.ts)
  lib/           mostly pure domain logic: srs, insights, calendar, date, theme, plan-board (dnd hook)
  store.ts       zustand + persist: state shape, migrations, 20 actions, ~10 domain queries
  ui-store.ts    session-only UI state (tabs, dialogs)
  components/    20 feature components in one flat folder + ui/ (shadcn)
```

What works well:

- **Dependencies point one way:** `data → lib → store → components`. Domain functions take `today` as an argument instead of reading the clock, so they are deterministic.
- **Persisted vs session state are separate stores.** Persistence is versioned (`version: 3`, `normalize()` migrates old saves), and backups use the same shape.
- **Vendor UI is isolated** in `components/ui/`, and design tokens live in one CSS file.

What is straining:

- **`store.ts` (476 lines) does four jobs:** the data model, migration, actions, and planning queries (`suggestNext`, `quickReview`, `nextToStudy`, `restartPick`, `dueReviews`, `plannedFrom`). The queries are pure, but they can only be reached through the store module.
- **Shared lookups are re-created per file.** The id → problem map is built in 11 files. "Suggest N for a day" is computed in 4 components, "open in new tab" and "download a file" in 2 each.
- **Two files hold most of the UI.** `Sidebar.tsx` (414 lines, 8 components) and `TodayView.tsx` (394 lines, 9 components) carry it, while `components/` mixes views, rows, dialogs and helper bits at one level.
- **There is a type-only import cycle.** `store.ts ↔ lib/insights.ts` import each other's types (`InterviewTarget` one way, `Attempt`/`PlanItem` the other), because the domain types live in the store.
- **Cloud sync is planned** (Google sign-in plus a hosted database). Persistence is wired straight into `zustand/persist` → `localStorage`, with no boundary where a remote adapter or merge step could sit.

## Decision

Keep the layered architecture and tighten it incrementally (Option C):

1. Move domain types (`Problem` ids, `PlanItem`, `Attempt`, `Study`, `ReviewState`, …) into `src/types.ts`, which breaks the cycle.
2. Move the pure planning queries out of `store.ts` into `src/lib/planning.ts`. The store keeps state, actions and migration. Add store actions for repeated workflows such as `suggestForDay(date)`.
3. Export one `problemById` from `src/data/problems.ts`, and shared `openInNewTab` / `downloadFile` helpers from `src/lib/browser.ts`.
4. Use feature folders only where files have outgrown one module: `components/today/` (TodayView, TodayList, TodayRow, WelcomeBack, UpcomingSections, PlanBoard) and `components/sidebar/` (one file per section). Leave the small views flat.
5. Before sync work, put persistence behind a `StorageAdapter` (local now, local + remote later). Give records the metadata that merging needs (`updatedAt` per map entry, tombstones for removed attempts). *Replaced by [ADR-002](0002-hosting-auth-sync.md): a three-way merge against the last synced copy needs neither the adapter nor the record metadata.*

## Options Considered

### Option A: Status quo — fix bugs only

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | None now; grows with each feature |
| Scalability | Weak — sync and tests both have to pry logic out of `store.ts` and components |
| Team familiarity | Highest — nothing moves |

**Pros:** No churn. The structure is still navigable at ~25 files.
**Cons:** Duplication keeps spreading (every new view rebuilds `byId`). Sync would be bolted onto `persist` with no merge point. Planning logic stays untestable without importing the store.

### Option B: Full feature-sliced restructure

| Dimension | Assessment |
|-----------|------------|
| Complexity | High |
| Cost | Touches every file; ~1–2 days |
| Scalability | Strong for a large team or many features |
| Team familiarity | Lower — new conventions (slices, public APIs per slice) |

**Pros:** Clear ownership per feature, and each feature hides its internals.
**Cons:** Oversized for a one-person, ~5k-line app. Most logic is cross-feature (planning feeds Today, Tomorrow, ⌘K, Sidebar and Short-on-time), so the slices would import each other constantly.

### Option C: Layered core + targeted feature folders (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Low–Medium |
| Cost | ~half a day, in small independent steps |
| Scalability | Good — a pure domain layer is ready for tests and for a sync adapter |
| Team familiarity | High — keeps today's mental model |

**Pros:** Each step ships on its own and is behavior-neutral. It removes the cycle and the duplication, makes planning logic unit-testable, and creates the seam sync needs.
**Cons:** Mixed conventions for a while (some folders feature-based, some flat). The store still holds the data model and actions together.

## Trade-off Analysis

The deciding factor is the **next big change: cloud sync**. Sync needs three things the code doesn't have yet:

- a seam between state and storage;
- pure functions that can merge two copies of the data;
- tests that prove a merge doesn't lose attempts.

Option C provides all three without paying Option B's restructuring cost. Option B's main benefit (isolated features) matters little here, because the features share one data model and one planning engine. Option A is the cheapest today, but it makes sync the riskiest change in the project's history.

## Consequences

- **Easier:**
  - unit-testing `lib/` with Vitest (no React, no storage);
  - adding Firebase/Supabase as a storage adapter;
  - finding Today-related code in one folder;
  - adding a view without re-deriving lookups.
- **Harder:** nothing material. Imports change paths, a one-time cost.
- **Revisit:**
  - If the store passes ~600 lines again, split actions by area (plans, attempts, settings) using zustand slices.
  - If more features arrive (auth, sharing), reconsider feature folders for the rest of `components/`.

## Action Items

1. [x] `git init` and commit the current state as a baseline.
2. [x] Add Vitest. Cover `lib/srs`, `lib/insights`, `lib/date` and the planning queries. *(Also covers `calendar`, `status` and `persistence`.)*
3. [x] Move domain types out of `store.ts`. *(They went into a `src/types/` folder rather than a single `types.ts`.)*
4. [x] Create `src/lib/planning.ts`, then move the pure queries out of `store.ts` and add `suggestForDay`.
5. [x] Export `problemById` from `data/problems.ts` and replace the 11 local maps.
6. [x] Create `src/lib/browser.ts` (`openInNewTab`, `downloadFile`) and replace the 4 copies.
7. [x] Split `Sidebar.tsx` into `components/sidebar/*`, and group Today files under `components/today/`.
8. [ ] Before sync: add a `StorageAdapter` interface plus record metadata for merging (separate ADR).

## Implementation notes

- **Types as `.ts`, not `.d.ts`.** The `src/types/` modules hold only `export type`/`interface`, so they compile to nothing anyway. `.d.ts` files would be skipped by `skipLibCheck: true`, and mistakes in them would never be reported. Catalog types (`Problem`, `Topic`, `Difficulty`) stay with the catalog in `data/problems.ts`, because `Topic` is derived from its `TOPICS` list. `@/types` re-exports them, so there is one import path for every type.
- **`normalize()` moved out of the store**, unlike the plan above. It now lives in `lib/persistence.ts` with the defaults and limits, so it can be tested without zustand. The store runs it on every load through `persist`'s `merge`, not only on version upgrades.
- **`plan-board.ts` moved from `lib/` to `components/today/`.** It is React and dnd-kit wiring for one view, not domain logic.
- **Status rules got their own module.** `isSolved`, `statusAfter` and the status labels live in `lib/status.ts`, and the timer arithmetic in `lib/timer.ts`.
