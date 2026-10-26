# Architecture

How the app works today. Why it's built this way is recorded in the ADRs ([001](adr/0001-code-structure.md), [002](adr/0002-hosting-auth-sync.md), [003](adr/0003-lib-layout.md)); where to put new code is in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Overview

A local-first single-page app with no backend. Everything runs in the browser, and the saved data is one JSON document in localStorage.

```
index.html  critical CSS + theme script (paint the right background before any JS loads)
   │
main.tsx ─▶ ErrorBoundary ─▶ App
                               ├─ header: tabs, timer pill, ⌘K, Python, theme toggle
                               ├─ Today | Problems | Patterns* | History*        (* lazy)
                               ├─ Sidebar: Progress, Focus, Interview, This week, Routine, Backup
                               └─ Overlays: log dialog, ⌘K*, problem drawer*, Python*, dialogs*

components ──read/write──▶ lib/store ──rules──▶ lib/domain ──▶ lib/_consts, lib/_utils
                               │
                               └─ persist ──▶ localStorage["leetcode-tracker"]  (version 3)
```

## Layers

`src/lib` is split by role, and `npm run lint` enforces which layer may import which (see [ADR-003](adr/0003-lib-layout.md) for the full rules).

```
types → _consts → _utils → domain → store → _hooks / theme → components → App
```

| Layer | Holds | Must not |
|---|---|---|
| `types/` | The saved data model, types only | Contain runtime code |
| `lib/_consts` | Storage keys, enum lists, labels, practice numbers, defaults | Import anything but types |
| `lib/_utils` | Date math, file download, .ics, code splitting, `cn` | Import anything from the app |
| `lib/domain` | The practice rules: planning, SRS, insights, status, timer | Use React, the store or the clock |
| `lib/store` | `useTracker` (saved), `useUI` (session), `normalize()` | Use React or components |
| `lib/_hooks`, `lib/theme` | Hooks with no feature knowledge; light/dark | Import components |
| `components/` | Views and dialogs; hooks that only one feature uses (`today/`, `sidebar/`) | — |

## Data model

One `TrackerData` object ([`src/types/tracker.ts`](../src/types/tracker.ts)). Problems are keyed by their LeetCode number, and days are local `YYYY-MM-DD` strings.

| Field | What it is |
|---|---|
| `progress[id]` | Status (`todo`, `attempted`, `solved`, `helped`) and when it last changed |
| `attempts[]` | Every logged attempt: result, confidence, seconds, and a `prev` snapshot so it can be undone |
| `studies[]` | "Watch & note" sessions: practice that doesn't mark the problem solved |
| `reviews[id]` | SRS state: step in the 3 → 7 → 21 → 60-day ladder, and the next due date |
| `plans[day]` | Ordered list of `{ id, done, attempt? }` per day; past days are kept as history |
| `notes[id]`, `complexity[id]` | The key idea, and time/space Big-O as typed |
| `weekdayGoal`, `weekendGoal`, `weeklyDays`, `coreFirst` | Routine settings |
| `interview` | Target date, plus the solved count when it was set (the start of the pace line) |
| `timer` | The problem being worked on: when the current stretch started, and time banked before it |
| `comebackAt` | When the welcome-back prompt was last handled |

The problem catalog isn't saved. It's generated into [`src/data/problems.ts`](../src/data/problems.ts) by `npm run generate:problems`, and you look problems up with `problemById`.

## Data flow

**Startup.** `persist` reads `localStorage["leetcode-tracker"]` synchronously when the store is created. Its `merge` passes the saved JSON through `normalize()` on **every** load, not only on version changes:

- missing fields get defaults;
- each invalid entry is dropped on its own;
- older shapes are converted (v1 had no reviews; v2 had a single `dailyGoal`).

A damaged save loses its bad entries, never the whole app.

**A change.** A component calls a store action, for example `logAttempt(id, input, today)`:

1. The action computes the new state with pure domain functions (`nextReview`, `statusAfter`, …).
2. It calls `set()`.
3. `persist` writes the whole document back. It stores `exportable()` plus the running timer.

Components subscribe to the fields they read (`useTracker((s) => s.plans)`). Event handlers read the latest state with `useTracker.getState()`.

**Backups.**

- **Export** writes `exportable(state)` as JSON.
- **Import:**
  1. `isTrackerData()` checks that the file is a backup at all.
  2. `normalize()` cleans it.
  3. The confirm dialog shows a summary of what's in it.
  4. `importData()` replaces the state.

Backups and saves share one shape and one validator.

**Crashes.** `ErrorBoundary` replaces a blank page with a screen that reads localStorage directly, without going through the store, which may be what's broken. It offers to download the raw saved JSON, reload, or reset in two steps (removing the saved key).

## Time

- **Where "today" comes from:** `useToday()` in `App` produces it. It re-checks every minute and when the tab becomes visible, so the date rolls over at local midnight even if the tab stays open.
- **How it reaches the code:** it's passed down as a prop. Domain functions and store actions take `today` as an argument and never read the clock, which keeps them deterministic and easy to test.
- **Day arithmetic:** dates are local calendar days. `diffDays` counts through UTC, so daylight-saving changes don't make a day 23 or 25 hours long, and unit tests run in `America/New_York` to exercise that.

## State

| Store | Persisted | Holds |
|---|---|---|
| `useTracker` | Yes, localStorage | `TrackerData` plus the actions that change it |
| `useUI` | No | Current tab, which dialog or drawer is open, the log-attempt target |

**Drag and drop** for Today and Tomorrow lives in [`components/today/plan-board.ts`](../src/components/today/plan-board.ts):

- **During a drag:** a draft copy of both lists drives the UI.
- **On drop:** the change is written to the store (`moveToDay` + `reorderPlan`).
- **Keyboard:** ↑/↓ on a row's grip moves it one place, crossing between the days at the ends of a list.
- **Screen readers:** every move is announced.

## Loading

- **First load:** about 550 kB of JavaScript (175 kB gzipped).
- **What's split out:** anything not needed for the first screen goes into its own chunk through `lazyComponent()` ([`_utils/lazy.ts`](../src/lib/_utils/lazy.ts)): History, Patterns, ⌘K, the problem drawer, the Python sheet, the short-on-time and calendar dialogs, and the date picker (72 kB on its own).
- **When it loads:** each chunk registers a preloader, and `App` runs them all once the browser is idle. In practice, nothing waits on the network when you open it. A failed load is retried the next time.
- **How dialogs mount:** `MountWhenOpened` in `App.tsx` mounts a lazy dialog the first time it opens, and keeps it mounted so the close animation still plays.
- **Shortcuts:** they live outside the lazy part. The ⌘K listener is registered in `App`, so it works before the palette's code has arrived.

## Theme

- **The source of truth:** the `dark` class on `<html>`.
- **Before first paint:** an inline script in `index.html` sets the class, using your saved choice (`STORAGE_KEYS.theme`) or the OS setting, and keeps following the OS until you choose. Inline CSS paints the matching background before the stylesheet arrives, which stops a white flash in dev.
- **In the app:** [`lib/theme`](../src/lib/theme) reads and changes the class and re-renders through a `MutationObserver`.
- **Colors:** design tokens are CSS variables in [`src/index.css`](../src/index.css) (Tailwind v4, shadcn).

## Testing

- **Unit tests (Vitest) sit next to the code they cover:** `_consts` (enum lists against their labels), `_utils` (dates, .ics), `domain` (SRS, status, planning, insights) and `store/persistence` (`normalize`, export).
- **Shared builders** for test data (`idOf`, `attempt`, `progressOf`, `tracker`) are in [`src/test/builders.ts`](../src/test/builders.ts).
- **Not covered yet:** store actions and components. Integration tests are planned.

## Known limits

- **One browser, one tab:** two open tabs each keep their own copy, so the last tab to change something overwrites the other's changes. The fix (reloading saved data on `storage` events) is Phase 0 of [ADR-002](adr/0002-hosting-auth-sync.md).
- **Local only:** a cleared browser loses everything since the last export. Once the app is hosted, Safari can also clear a site's storage after 7 days without a visit. Cloud sync ([ADR-002](adr/0002-hosting-auth-sync.md)) addresses both.
