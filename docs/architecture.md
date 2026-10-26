# Architecture

How the app works today. Why it's built this way is recorded in the ADRs ([001](adr/0001-code-structure.md), [002](adr/0002-hosting-auth-sync.md), [003](adr/0003-lib-layout.md), [004](adr/0004-layout-redesign.md), [005](adr/0005-today-actions-and-backlog.md)); where to put new code is in [CONTRIBUTING.md](../CONTRIBUTING.md).

## Overview

A local-first single-page app with no backend. Everything runs in the browser, and the saved data is one JSON document in localStorage.

```
index.html  critical CSS + theme script (paint the right background before any JS loads)
   │
main.tsx ─▶ ErrorBoundary ─▶ App
                               ├─ header (components/shell): title, tabs, timer pill, ⌘K, Python, theme, Settings
                               ├─ Today | Problems | Patterns* | History*        (* lazy)
                               ├─ Sidebar: Progress (with interview pace), This week, Focus
                               ├─ phones: NowBar + tab bar, sticky at the bottom
                               └─ Overlays: log dialog, ⌘K*, problem drawer*, Python*, Settings*, dialogs*

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
| `components/` | Views and dialogs by feature: `shell/` (header, tabs, phone dock, overlays), `today/`, `sidebar/`, `settings/`, `command-palette/`. Logic a component needs sits in a camelCase `useName.ts` hook beside it. | — |

## Data model

One `TrackerData` object ([`src/types/tracker.ts`](../src/types/tracker.ts)). Problems are keyed by their LeetCode number, and days are local `YYYY-MM-DD` strings.

| Field | What it is |
|---|---|
| `progress[id]` | Status (`todo`, `attempted`, `solved`, `helped`) and when it last changed |
| `attempts[]` | Every logged attempt: result, confidence, seconds, and a `prev` snapshot so it can be undone |
| `studies[]` | "Watch & note" sessions: practice that doesn't mark the problem solved |
| `reviews[id]` | SRS state: step in the 3 → 7 → 21 → 60-day ladder, and the next due date |
| `plans[day]` | Ordered list of `{ id, done, attempt? }` per day; past days are kept as history |
| `backlog[]` | Problems taken off a plan to come back to, newest first. Suggest skips them; planning one takes it off. |
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
| `useUI` | No | Current tab; which dialog, drawer or sheet is open (Settings, the Start drawer); the log-attempt target; the toast; the row that just landed (it glows); and whether the Now card was emptied today |
| `usePrefs` | Yes, `leetcode-tracker-prefs`, this device only | What Start opens: ask, LeetCode, NeetCode, or only the timer. Never backed up or synced. |

**Today's order.** `dayOrder()` in [`domain/day.ts`](../src/lib/domain/day.ts) turns the plan, the goal and the timer into what the Today screen shows:

- **Now:** the problem being timed, else the first unfinished one. It gets the Now card with the clock and the one next step (Start, or Done — log attempt). Start also opens the problem: on LeetCode, or on NeetCode when LeetCode needs Premium (`practiceLink()`).
- **The queue:** everything else still to do, in order, with a line where today's goal ends.
- **Done:** finished problems, in a "Done today" group under the queue that folds away.

Every row in Today, Tomorrow and Later is one `PlanRow`: grip, mark, title and meta, difficulty, an action, and ⋯. The ⋯ menu holds the rest, including the problem's links.

The heading's "about N min to go" is `minutesLeft()`: the time boxes the goal still needs, less what the clock already has.

**Drag and drop** for the queue and Tomorrow lives in [`components/today/usePlanBoard.ts`](../src/components/today/usePlanBoard.ts), with the list arithmetic (where a drop or an arrow key puts a row) in pure, tested [`board-lists.ts`](../src/components/today/board-lists.ts):

- **Pinned:** the Now problem isn't in the drag list; it stays first. "Do first" in a row's ⋯ menu brings a problem up to it.
- **During a drag:** a draft copy of both lists drives the UI.
- **On drop:** the change is written to the store (`moveToDay` + `reorderPlan`).
- **Keyboard:** ↑/↓ on a row's grip moves it one place, crossing between the days at the ends of a list.
- **Screen readers:** every move is announced.

## Layout

One set of tabs is laid out three ways. Radix `Tabs` wraps the whole page, so the tab list can sit in the header while the panels sit in the main column; `useUI.tab` drives it.

| Width | Tabs | Progress cards | Timer, away from Today | Reordering |
|---|---|---|---|---|
| Phone (below `sm`, 640 px) | Tab bar at the bottom (`MobileNav`) | Top of the Progress tab | `NowBar` above the tab bar: clock, Pause, Log | Hold a row, then drag |
| Tablet (`sm` to `lg`) | Header, on a row of their own | Top of the Progress tab | Timer pill in the header | The grip, or ↑/↓ on it |
| Wide (`lg`, 1024 px, and up) | Header, between the title and the tools | Sidebar | Timer pill in the header | The grip, or ↑/↓ on it |

- **One sidebar:** `App` reads `useMediaQuery(WIDE_SCREEN)` and renders the sidebar in one place only: beside the main column, or at the top of the History tab ([`shell/ProgressTab.tsx`](../src/components/shell/ProgressTab.tsx)), which is then called Progress. Everything else switches with Tailwind classes.
- **One list of tabs:** the header tabs and the phone tab bar are two views of `useUI.tab`. Their names and icons come from [`shell/nav-tabs.ts`](../src/components/shell/nav-tabs.ts), which ⌘K's "Go to" list uses too.
- **The phone dock** (NowBar and tab bar) is `sticky`, not `fixed`: it takes up room at the end of the page, so it never covers the last row.
- **Away from Today:** [`useAwayTimer`](../src/components/shell/useAwayTimer.ts) decides when the pill and the NowBar show. Both mount when they appear, so their clocks start from the current time. The NowBar reuses the Now card's `useNowCard` and `useNowClock`.
- **Drag sensors:** `PointerSensor` starts from the grip and `TouchSensor` (a 250 ms hold, 5 px of give) from anywhere on the row; `useSortableRow` splits dnd-kit's listeners between the two. Phones hide the grip, so a quick swipe scrolls and a hold picks the row up.

## Today's actions

[ADR-005](adr/0005-today-actions-and-backlog.md) has the reasons; this is how they fit together.

- **Start:** every Start button calls `requestStart()` ([`timer/start-problem.ts`](../src/components/timer/start-problem.ts)).
  - It opens the Start drawer, or uses the answer this device remembered.
  - `startProblem()` starts the timer and opens the chosen site from the click itself, so browsers don't treat the tab as a popup.
  - All timer starts go through `beginTimer()`, which also refills an emptied Now card.
- **Removing and undoing:** [`today/plan-actions.ts`](../src/components/today/plan-actions.ts) holds what a ✕ or ⏹ does.
  - It changes the store, then shows a toast whose Undo restores the old state: the plan position, the timer, or the backlog position.
  - Rows play their exit animation first (`useRowExit`), and only then call the action.
- **The Now slot:** `dayOrder(plan, goal, timerId, pickNext)` picks the problem in the spotlight. `useDayPlan` passes `pickNext = false` after the card was emptied by hand today, so the card stays empty until something starts.

## Loading

- **First load:** about 556 kB of JavaScript (176 kB gzipped).
- **What's split out:** anything not needed for the first screen goes into its own chunk through `lazyComponent()` ([`_utils/lazy.ts`](../src/lib/_utils/lazy.ts)): History, Patterns, ⌘K, the problem drawer, the Python sheet, the Settings sheet, the short-on-time and calendar dialogs, the Start drawer, and the date picker (72 kB on its own).
- **When it loads:** each chunk registers a preloader, and `App` runs them all once the browser is idle. In practice, nothing waits on the network when you open it. A failed load is retried the next time.
- **How dialogs mount:** `MountWhenOpened` ([`shell/Overlays.tsx`](../src/components/shell/Overlays.tsx)) mounts a lazy dialog the first time it opens, and keeps it mounted so the close animation still plays.
- **Shortcuts:** they live outside the lazy part. The ⌘K listener (`usePaletteShortcut`) is registered by `Overlays`, so it works before the palette's code has arrived.

## Theme

- **The source of truth:** the `dark` class on `<html>`.
- **Before first paint:** an inline script in `index.html` sets the class, using your saved choice (`STORAGE_KEYS.theme`) or the OS setting, and keeps following the OS until you choose. Inline CSS paints the matching background before the stylesheet arrives, which stops a white flash in dev.
- **In the app:** [`lib/theme`](../src/lib/theme) reads and changes the class and re-renders through a `MutationObserver`. `useTheme()` also exposes the *choice* (`light`, `dark` or `system`): Settings offers all three, and choosing `system` forgets the saved choice so the OS decides again. The header button toggles light and dark.
- **Colors:** design tokens are CSS variables in [`src/index.css`](../src/index.css) (Tailwind v4, shadcn).

## Testing

Tests sit next to the code they cover, in two Vitest projects:

- **`unit` (`*.test.ts`, Node):** `_consts` (enum lists against their labels), `_utils` (dates, .ics), `domain` (SRS, status, planning, insights) and `store/persistence` (`normalize`, export, backup parsing).
- **`dom` (`*.test.tsx`, jsdom + Testing Library):** components and hooks, tested the way they're used — by role and accessible name, through clicks and keys, asserting on the screen and the stores. Covered: the layout by width (`App`), the shell (header tabs, phone tab bar, timer pill, NowBar), Settings, the sidebar, the command palette, the Today view (Now card, heading, queue, keyboard and long-press reordering, the empty Now card, the backlog), the Start drawer and toasts, `useTheme`, `useMediaQuery` and `useRetained`. Store actions and preferences have unit tests too.
- **Support:** [`src/test/builders.ts`](../src/test/builders.ts) builds test data (`idOf`, `attempt`, `progressOf`, `tracker`); [`src/test/stores.ts`](../src/test/stores.ts) resets both stores; [`src/test/setup-dom.ts`](../src/test/setup-dom.ts) gives each component test a clean DOM, storage and stores, plus the browser APIs jsdom lacks.
- **Not covered yet:** pointer dragging, the other views and dialogs, and store actions on their own. They get tests as later slices of [ADR-004](adr/0004-layout-redesign.md) touch them; end-to-end tests are planned.

## Known limits

- **One browser, one tab:** two open tabs each keep their own copy, so the last tab to change something overwrites the other's changes. The fix (reloading saved data on `storage` events) is Phase 0 of [ADR-002](adr/0002-hosting-auth-sync.md).
- **Local only:** a cleared browser loses everything since the last export. Once the app is hosted, Safari can also clear a site's storage after 7 days without a visit. Cloud sync ([ADR-002](adr/0002-hosting-auth-sync.md)) addresses both.
