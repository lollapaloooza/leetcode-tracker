# ADR-004: Build the "focus first" layout on the current code, in slices

**Status:** Accepted — all five slices implemented 2026-10-26
**Date:** 2026-10-26
**Deciders:** Project owner
**Design:** [LeetCode Tracker layout canvas](https://claude.ai/artifact/UfabowRsPGHZm9ZAEC3ArG) (Today on desktop and phone, Progress on phone, Settings sheet)

## Context

A layout redesign is drawn up for the Today screen and the app shell:

- **A "Now" card** at the top for the problem being worked on (or the one up next): a large timer and a single main action (log the attempt, or Start).
- **A day heading** showing done / goal and how much time is left.
- **One-line rows** in the queue. The LeetCode, NeetCode and video links move into the ⋯ menu and the drawer.
- **Finished problems** collapse into a "Done today" group.
- **The sidebar keeps only daily signals:** progress with the interview pace, this week, and weakest topics. Routine, calendar, interview date, theme and backup move into a **Settings sheet**.
- **On phones:**
  - a bottom tab bar;
  - a **Progress** tab where History was, with the sidebar's cards above the activity history;
  - a mini timer bar above the tabs;
  - long-press to reorder.

Should this be built from scratch or on the current code? Here is how the code splits today:

| Layer | Lines | What the redesign needs from it |
|---|---|---|
| Domain, store, types, data (`src/lib`, `src/types`, `src/data`) | ~2,040 | **Nothing new** except a "time left" estimate. The data model and the store actions stay as they are. |
| Unit tests | ~800 | All still apply, since the rules don't change. |
| shadcn components (`components/ui`) | ~1,680 | Reused as they are. `Sheet` is already there for the Settings sheet. |
| Views, dialogs, other components | ~4,150 | About 2,050 lines aren't touched: the Problems, Patterns and History views, the dialogs, ⌘K, the Python sheet and the error boundary. About 750 are heavily reworked (the app shell, Today, the Today list and row). The rest are moved or lightly edited. |

The redesign changes **how** existing data and actions are shown, not **what** the app knows or does. Every number on the canvas (done / goal, pace, streak, weak topics, review due dates) is already computed by a tested function in `lib/domain`.

## Decision

**Work on top of the current code** and deliver the layout in **five vertical slices**. Each slice passes `npm run check`, works on its own, and can be committed separately.

What happens to the current code, design element by element:

| Design element | Current code | Change |
|---|---|---|
| **Now card** | The lead row in `TodayList`, plus `TimerControls` and `TimerProgress` | **New** `today/NowCard.tsx` composing the existing timer pieces. The board's `pinned` setting already keeps the problem being worked on out of the drag list; it extends to the up-next problem when no timer runs. |
| **Day heading and time left** | `DayProgress`, plus the header row in `TodayView` | **New pure function** `minutesLeft(plan, timer, now)` in `lib/domain`, with tests. It builds on `TARGET_MINUTES` and `timerElapsed`. `TodayView` lays it out. |
| **One-line rows** | `TodayRow` (212 lines, 7 controls) | **Slimmed down.** `ProblemLinks` move into `RowMenu` actions; only Start, difficulty and ⋯ stay. |
| **"Done today" group** | Finished problems are rendered inside `TodayList` | **Split out** to a `<details>` group in `TodayView`. |
| **Reviews as a line, not a banner** | `Notice` in `TodayView` | The same data and action, shown as a heading link. "Add to today" adds what fits the goal, using the existing `suggestNext`. |
| **Start opens LeetCode** | `startTimer` | `TimerControls` also calls `openInNewTab(leetcodeUrl(problem))`. One line, from the click handler, so browsers don't block it. |
| **Tabs in the header** | `TopBar` and the `Tabs` list in `App.tsx` | Moved into the header. The Radix `Tabs` stay, so keyboard behavior is unchanged. |
| **Settings sheet** | `RoutineSection`, `BackupSection`, `InterviewSection` (date picker), the theme toggle | **New lazy** `SettingsSheet.tsx`, mounted the same way as the other dialogs (`MountWhenOpened`). The section bodies move into it unchanged. `useUI` gains `settingsOpen`. |
| **"System" theme option** | `lib/theme` (light/dark only) | Add `followSystem()`: it clears the stored choice and re-applies the OS theme, as the script in `index.html` already does. |
| **Slimmer sidebar** | `Sidebar.tsx` with 6 sections | 3 sections, restyled as cards. The interview pace moves into the Progress card. |
| **Phone bottom tabs** | Tabs at the top at every width | **New** `MobileNav.tsx`, below the `sm` breakpoint only, driving the same `useUI.tab`. |
| **Phone Progress tab** | `HistoryView`; the sidebar is pushed below the list on phones | Below `lg`, the History tab shows the sidebar cards above the history. The sidebar is hidden there. |
| **Mini timer bar** | `TimerPill` in the header | **New** `NowBar.tsx` on phones, shown when a timer runs and you're not on Today. The pill stays on desktop. |
| **Long-press to reorder (phone)** | `PointerSensor` with a visible drag handle | Add dnd-kit's `TouchSensor` with a press delay (it's already in `@dnd-kit/core`). Hide the handle on phones. Keyboard ↑/↓ stays. |

**Unchanged:** the data model, `normalize()` and backups, every store action, the SRS and planning rules, drag-and-drop announcements and keyboard moves, code splitting, the error boundary, and the theme's pre-paint script. **No new dependencies.**

## Options considered

### Option A: Rebuild from scratch

| Dimension | Assessment |
|---|---|
| Complexity | High: rebuild ~8,700 lines to change ~1,000 |
| Cost | About 2–3 weeks to get back to feature parity before any of the redesign shows |
| Risk | High: the edge cases in the domain, data migration, drag and drop, and timer would be re-solved |
| Familiarity | Low: a new structure to learn again |

**Pros:** a blank page, and no leftovers from the old layout.

**Cons:**
- The 96 tests and the v1 → v3 data migrations would have to be redone.
- The keyboard drag-and-drop and screen-reader announcements took several iterations to get right, and would be redone too.
- Nothing ships until it's all done.
- The redesign doesn't call for a different stack, state model or data shape, so a rebuild would end up with the same layers.

### Option B: Work on top, in slices (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low to medium: ~750 lines reworked, ~400 new, the rest untouched |
| Cost | About 3 days in total, in five steps of half a day to a day each |
| Risk | Low: domain and data untouched, `npm run check` after every slice |
| Familiarity | High: the same layers, conventions and lint boundaries (ADR-003) |

**Pros:** usable value after each slice, and the risky parts (data, rules) never move. New logic, such as `minutesLeft`, lands in `lib/domain` with tests, like everything else.

**Cons:**
- During the transition, some screens are in the new style and some in the old.
- `TodayRow` and `TodayList` change a lot, so their diffs are large.

### Option C: Build a parallel "v2" UI next to the old one, then switch

| Dimension | Assessment |
|---|---|
| Complexity | Medium: two UIs on one store until the switch |
| Cost | About 4–5 days, plus the cost of keeping both in step |
| Risk | Medium: one big switch at the end |
| Familiarity | High |

**Pros:** the old UI keeps working untouched until the new one is complete.

**Cons:**
- Twice the components for a while.
- Features added in the meantime need building twice.
- There's no real need: it's a single-user app with no users to protect from a half-finished state, and git already provides rollback.

## Trade-off analysis

The deciding fact is **where the change lives**. The redesign touches presentation, which is about a quarter of the code, while the expensive and fragile parts sit in layers it doesn't touch:

- **Rules:** SRS, planning, pace.
- **Data handling:** validation, migrations, backups.
- **Interaction:** drag and drop with keyboard and screen-reader support, code splitting.

Rebuilding would put that fragile three-quarters at risk to change the cheap quarter.

Slices (B) beat a parallel UI (C) here because the app has one user and changes are easy to roll back. C makes sense when real users must never see a half-finished state.

## Consequences

**Easier**

- Each slice is small enough to review and test in the browser on its own.
- New UI components follow the existing pattern: pure logic in `lib/domain`, state in `lib/store`, lazy dialogs mounted through `MountWhenOpened`.
- Settings that change rarely leave the always-visible sidebar, which frees room for future daily signals.

**Harder**

- For a few days the screens won't match in style; the slices are ordered so Today, the main screen, comes together first.
- Below the `sm` breakpoint there are two navigations (bottom tabs, and the header on wider screens) to keep in sync. Both drive the same `useUI.tab`.

**To revisit**

- If the Now card and the mini bar grow (notes while solving, hints), give them a shared `useCurrentProblem()` hook in `components/today/`.
- If a second screen needs one-line rows, extract `TodayRow`'s compact form into a shared `ProblemRow`.

## Action items

Each slice ends with `npm run check`. It's then checked in the browser in light and dark, at phone width and from the keyboard, and the README and `docs/architecture.md` are updated where the slice changes them.

1. [x] **Settings sheet** (half a day), done 2026-10-26:
   - `SettingsSheet.tsx` (lazy) with Routine, calendar, interview date, theme (with `followSystem()`) and backup;
   - a gear button in the header;
   - the sidebar cut to Progress, This week and Focus.

   *Notes:*
   - `followSystem()` became `chooseTheme('system')` in `lib/theme`, and `useTheme()` now also returns the choice.
   - Backup parsing and summaries moved into `lib/store/persistence.ts` (`parseBackup`, `summarizeBackup`), with tests.
   - `App.tsx` and `CommandPalette.tsx`, the two largest components touched, were split into `components/shell/` and `components/command-palette/`.
   - Component tests arrived with this slice: a `dom` Vitest project with jsdom and Testing Library, at 46 tests. `useUI.interviewPickerOpen` was removed, and ⌘K's "Set interview date" opens Settings instead.
2. [x] **Now card and day heading** (1 day), done 2026-10-26:
   - `minutesLeft()` in `lib/domain`, with tests;
   - `NowCard.tsx`, with the board's `pinned` extended to the up-next problem;
   - the date heading, and reviews as a heading link;
   - Start opens LeetCode.

   *Notes:*
   - **Domain:** "what's on now / queued / where the goal ends" became a pure `dayOrder()` (in `domain/day.ts`, next to `minutesLeft`, `reviewsThatFit` and `leftovers`). The components only lay it out.
   - **Start:** opens NeetCode's free copy when LeetCode needs Premium (`practiceLink()`).
   - **Splits:** `TodayRow` (212 lines) became `TodayRow`, `RowMeta`, `DoneControl`, `today-actions.tsx` and `useTodayRow`. `TodayView` gained `useDayPlan`, `useTodayNotices`, `useSuggest`, `DayHeading`, `QueueHeading` and `Notice`. `TimerControls.tsx` gave way to `components/timer/` (`LiveDot`, `StartButton`, `useStartProblem`).
   - **Naming:** hook files are camelCase now (`useGoal.ts`, not `use-goal.ts`), enforced by `unicorn/filename-case` for `use-*` files.
3. [x] **Queue rows and "Done today"** (half a day): slim `TodayRow`, links into `RowMenu`, a `<details>` group for finished problems. Done 2026-10-26.

   *Notes:*
   - **One row component:** every Today row is a `PlanRow` (grip, mark, title and meta, difficulty, action, ⋯). `QueueRow`, `DoneRow` and the Tomorrow and Later rows only fill it in.
   - **On phones:** the difficulty joins the meta line and Start moves into ⋯, so each row is one line.
   - **Menus:** every row's ⋯ menu has its open-on-LeetCode/NeetCode and video links; queue rows also have Start.
   - **Splits:** `UpcomingSections.tsx` (169 lines) became `TomorrowSection`, `LaterSection` and `useTomorrow`, plus a pure `laterPlans()` in `domain/day.ts`. `usePlanBoard.ts` (208 lines) became the hook (136), `useSortableRow`, `useZone`, `board-keys.ts`, and `board-lists.ts`, which holds pure, tested list arithmetic for drags and ↑/↓.
   - **Start:** now a plain `startProblem()`, so menu items can call it too.
4. [x] **App shell** (a quarter of a day): tabs in the header. Done 2026-10-26.

   *Notes:*
   - **Tabs around the page:** Radix `Tabs` now wraps the whole app, so the list (`shell/MainNav.tsx`) sits in the header and the panels in the main column. Keyboard behavior is Radix's, unchanged.
   - **By width:** between the title and the tools from `lg`; on a row of their own below it; hidden on phones, which use the tab bar.
   - **Fitting one row:** the Search and Python labels and the "NeetCode 250" subtitle give way where the tabs share the row. The timer pill shows only the clock; its tooltip and the browser tab name the problem.
   - **One list of tabs:** `shell/nav-tabs.ts` names them for the header, the tab bar and ⌘K. "All problems" became "Problems", as in the design.
5. [x] **Phone** (1 day): `MobileNav`, the Progress tab (sidebar cards above History below `lg`), `NowBar`, and `TouchSensor` with a press delay. Done 2026-10-26.

   *Notes:*
   - **Sidebar:** `App` reads `useMediaQuery(WIDE_SCREEN)` (new in `_hooks`, with `_consts/layout.ts`) and renders the sidebar once: beside the list from `lg`, otherwise at the top of `ProgressTab`, where the History tab is called Progress.
   - **Phone dock:** NowBar and tab bar are `sticky` at the bottom rather than `fixed`, so they never cover the end of the page. The header keeps only Search and Settings; Python is in ⌘K and the theme in Settings.
   - **NowBar:** reuses the Now card's `useNowCard` and `useNowClock`. It shares `useAwayTimer` with the timer pill, and both mount when they appear, which fixed a pill that showed the time from page load for its first second.
   - **Touch:** `TouchSensor` with a 250 ms hold and 5 px tolerance, started from anywhere on the row; the grip, hidden on phones, keeps the mouse and ↑/↓.
   - **Tests:** the layout by width (`App.test.tsx`), the header tabs, tab bar, NowBar, pill, Progress tab, `useMediaQuery`, and long-press versus a quick swipe.
6. [ ] **Independent of this ADR:** ADR-002 Phase 0 (tabs sharing one copy of the data) can land before or between these slices.
