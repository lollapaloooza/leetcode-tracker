# ADR-003: Split `src/lib` by role, with lint-enforced boundaries

**Status:** Accepted, implemented 2026-10-26
**Date:** 2026-10-26
**Deciders:** Project owner
**Builds on:** ADR-001 (layered structure)

## Context

After ADR-001, `src/lib/` was a flat folder of 11 modules that did different jobs:

- **Constants buried in logic modules.** Labels and time boxes sat in `srs.ts`, status labels in `status.ts`, storage keys and goal limits in `persistence.ts`. A component that only wanted a label imported the SRS module.
- **Hooks mixed into pure code.** `date.ts` held both date math and `useToday`/`useNow`, so "lib is pure" was only mostly true.
- **The stores lived outside lib** (`src/store.ts`, `src/ui-store.ts`), next to the app shell.
- **Values listed twice.** The allowed results and confidences were typed out again in `persistence.ts`, and the theme's storage key was a private string in `theme.ts`.
- **Nothing enforced the layering.** "Domain logic doesn't import the store" was a convention that one import could break.

## Decision

Split `src/lib` by role. Underscore folders are shared building blocks; plain folders are modules.

```
src/lib/
  _consts/   plain values               storage keys, enum lists, labels, practice numbers, defaults
  _utils/    app-agnostic helpers       date, browser, ics, lazy, cn
  _hooks/    app-agnostic React hooks   useToday, useNow, useElementWidth
  domain/    pure practice rules        planning, srs, insights, status, timer
  store/     state                      useTracker, useUI, persistence (normalize)
  theme/     light/dark                 theme (DOM + storage), useTheme
src/test/builders.ts                    shared builders for unit tests
```

**Rules**

1. **`_` folders are bags of independent files** with no `index.ts`. Import the file: `@/lib/_utils/date`. The underscore also sorts them first, so the shared layer reads as the base.
2. **Plain folders are modules** with a public API in `index.ts`. Import the folder (`@/lib/store`), never a file inside it. Files within a module import each other relatively.
3. **Dependencies point one way:**
   `types → _consts → _utils → domain → store → _hooks / theme → components`
4. **Shared means no feature knowledge.** A hook or helper that only one feature uses stays with that feature, for example `useDaysAway.ts` and `usePlanBoard.ts` in `components/today/` (hook files are camelCase since 2026-10-26). It moves to `lib` once a second feature needs it, and only if it knows nothing about the first.

**Enforced by `npm run lint`** (oxlint `no-restricted-imports`, per-folder overrides in `.oxlintrc.json`):

| Folder | May not import |
|---|---|
| everywhere | files inside `domain/`, `store/`, `theme/` (use the module) |
| `_consts` | anything from the app except `@/types` |
| `_utils` | anything from the app (`@/…`) |
| `_hooks` | components |
| `domain` | React, zustand, the store, the theme, hooks, components |
| `store` | React, the theme, hooks, components |
| `theme` | the domain, the store, components |

Each rule was checked by adding a file that breaks it and confirming that lint fails.

## Options considered

**A. Keep `lib` flat.**

- Pros: no churn, and 11 files are still easy to scan.
- Cons: the problems listed under Context stay. The sync work in ADR-002 adds `merge`, a remote adapter and a sync store, which would make 15 or more files at one level.

**B. Split by role, as convention only.**

- Pros: the same layout, without the lint configuration.
- Cons: the layering erodes the first time someone imports the store from `domain` to save a parameter.

**C. Split by role, enforced by lint (chosen).**

- Pros: the structure can't drift, and a wrong import fails with a message saying where the code belongs.
- Cons: about 100 lines of lint config, and the overrides must restate the shared rule, because an override replaces a rule's options instead of merging them.

**D. A feature-sliced layout (`features/today/{model,ui,lib}` …).**

- Pros: it scales to a team.
- Cons: for one developer and about 9k lines, the extra nesting costs more than it saves. ADR-001 already rejected it.

## Consequences

**Easier**

- A component that needs a label imports `_consts/labels` and nothing else.
- `domain` is guaranteed pure, so every rule can be unit-tested without React or a store.
- Every localStorage key is in one file, which matters once sync adds its own key (ADR-002).
- The lists `normalize()` validates against (`RESULTS`, `CONFIDENCES`, …) are tested against their exhaustive label maps, so a status that's added but not listed fails a test. Before, every save would have silently dropped it.

**Harder**

- Imports are longer: `@/lib/_utils/date` instead of `@/lib/date`.
- A new top-level folder in `lib` needs a matching override in `.oxlintrc.json`.

**Revisit when**

- `_utils` or `_consts` grows past about 10 files: group them by topic, or promote a cohesive group to a module.
- A second feature needs `useSolvedStats`, `useDaysAway` or the `usePlanBoard` hooks: move them to `_hooks` or `store`.

## What changed

- **Constants:**
  - `RESULT_LABEL`, `CONFIDENCE_LABEL` and `STATUS_LABEL` moved to `_consts/labels`.
  - `TARGET_MINUTES`, `REVIEW_INTERVALS` and `GOAL_LIMITS` moved to `_consts/practice`.
  - `STATUSES` and `DIFFICULTIES` moved to `_consts/enums`, which gained `RESULTS` and `CONFIDENCES`.
  - `DEFAULTS` became `TRACKER_DEFAULTS` in `_consts/defaults`.
  - `STORAGE_KEY` and the theme key became `STORAGE_KEYS` in `_consts/storage`.
- **Hooks:** `useToday` and `useNow` left `date.ts` for `_hooks`, and `useElementWidth` left `HistoryView`.
- **Utils:** `calendar.ts` became `_utils/ics.ts`, so it doesn't read like the date-picker component; `components/lazy.ts` became `_utils/lazy.ts`.
- **Store:** `store.ts` and `ui-store.ts` became `store/tracker-store.ts` and `store/ui-store.ts`, with `persistence.ts` beside them.
- **Theme:** `theme.ts` split into a framework-free `theme/theme.ts` and the `useTheme` binding.
- **Tests:** `lib/test-utils.ts` became `src/test/builders.ts`.
- **shadcn:** `components.json` aliases now point `utils` at `@/lib/_utils/cn` and `hooks` at `@/lib/_hooks`, so `shadcn add` writes to the new places.
