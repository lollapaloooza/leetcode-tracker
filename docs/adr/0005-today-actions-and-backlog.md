# ADR-005: Simpler Today actions, a backlog, and an optional Start drawer

**Status:** Accepted — implemented 2026-10-26
**Date:** 2026-10-26
**Deciders:** Project owner
**Design:** the "No more ⋯" boards on the [layout canvas](https://claude.ai/artifact/UfabowRsPGHZm9ZAEC3ArG)

## Context

After [ADR-004](0004-layout-redesign.md), every Today row and the Now card ended in a ⋯ menu of up to eight items. The items mixed four kinds of action:

- start it;
- move it: Do first, tomorrow, Saturday;
- open it: LeetCode, NeetCode, the solution video;
- remove it.

That was too much to scan for a daily list. The owner also wanted three more things:

- **Keep removed problems.** "Remove from today" dropped a problem silently, and Suggest could pick it again the next day.
- **No surprise refill.** Removing the problem in the Now card shouldn't pull the next one into its place.
- **Choose where to solve.** Start should ask whether to open LeetCode or NeetCode, and closing that question should just start the timer.

## Decision

1. **No ⋯ menus on Today.**
   - Queue rows have **Start** and **✕**. Tomorrow, Later and backlog rows have **✕**; backlog rows also have **+ Today**.
   - Done rows have no buttons; their mark still edits or undoes the attempt.
   - Moving between days is by dragging only, which already works with mouse, keys and touch. "Do first" and "Move to Saturday" are gone.
   - Links live in the problem drawer (click a title). While a problem is being timed, its Now card links back to the site and to the solution video.
2. **✕ sends a problem to a saved backlog.**
   - The new saved field is `backlog: number[]`: problem ids, newest first.
   - `removeFromPlan` puts unfinished problems there; finished ones aren't kept.
   - Planning, starting or logging a problem takes it off the backlog. So do **+ Today** and Undo.
   - Suggest and the "reviews due" link skip backlog problems, so a set-aside problem doesn't come straight back.
   - The backlog shows as a section at the end of Today. Its ✕ forgets a problem.
3. **Every removal can be undone from a toast instead of being confirmed first.**
   - This applies to a row's ✕ and to stopping a timer.
   - The toast stays for 5 seconds and holds while it's hovered or focused.
   - Undo puts the problem back at its old place.
4. **Taking a problem out of the Now card leaves the card empty.**
   - This happens with ✕ (not started) or ⏹ (stop the timer, keep the problem).
   - A dashed line takes the card's place: "Nothing in focus — press Start on the one you want next", with a link to show the next one.
   - The card fills again when anything starts.
   - The rule is session state (`useUI.focusClearedOn`), for that day only. A reload or a new day shows the next problem as usual.
   - Finishing a problem (Done → log) still moves on to the next.
5. **Start opens an optional drawer** that asks: LeetCode, NeetCode, or **Just start the timer**.
   - Closing the drawer any way starts nothing: ✕, Escape and a click outside all mean "not now", and focus goes back to the Start button.
   - *Changed 2026-10-27:* closing used to start only the timer, so a stray click outside started a problem by accident.
   - **Remember my choice** saves the answer on this device in a new preference store, `usePrefs`, under its own key `leetcode-tracker-prefs`. Like the theme, it's never in backups or sync, since a phone and a laptop may want different answers.
   - With a remembered answer, Start acts immediately and shows a toast with **Ask next time**. Settings › Start changes it too.
   - Every timer start goes through `beginTimer()`, which also refills an emptied Now card. That includes ⌘K and "Short on time?".
6. **Small animations, all off under reduced motion.**
   - **Rows:** they slide out and fold away before the store changes (`useRowExit`). Rows that land somewhere glow (`useUI.highlight`), and a just-logged mark pops.
   - **Now card:** it rises in when it changes problem.
   - **Toasts and drawer:** toasts slide up with a bar that drains as Undo's time runs out. The drawer slides up.
   - The keyframes live in `index.css` as Tailwind `animate-*` utilities.

## Options considered

### Removing the Now card's problem

| Option | For | Against |
|---|---|---|
| **A. Refill from the queue at once** (the old behavior) | No empty state; always a next step | The app chooses for you. ✕ sits in the same spot, so a double click removes two problems. |
| **B. Leave it empty until you start one (chosen)** | You choose. No double-remove. The queue right below already offers Start on every row. | One more decision; an empty spot on screen |
| **C. Ask what's next** | Explicit | A dialog for something one click on a row already does |

B, with a one-click way back to A ("Or show the next one here").

### Where removed problems go

| Option | For | Against |
|---|---|---|
| **A. A `backlog` list (chosen)** | Simple to validate, back up and merge. Order is meaningful (newest first). | A new field, though without a version bump |
| **B. A special "someday" day in `plans`** | No new field | Every day-based rule (history, leftovers, later plans) would need to skip it |
| **C. A status like `parked`** | Visible everywhere | Mixes planning into progress, which is a different concept, and breaks the status-based SRS rules |

## Consequences

- **Data:**
  - `backlog` defaults to `[]`, so old saves and backups load unchanged and `STORAGE_VERSION` stays at 3.
  - `normalize()` keeps unique integer ids, and exports include the field.
  - Once sync exists, it needs a merge rule. One is added to [ADR-002 §3.5](0002-hosting-auth-sync.md#35-merge-rules-merge3base-local-remote).
- **Code removed:** `today-actions.tsx` and `RowMenu`. Their behavior is now `PlanRow`'s `remove` prop plus `plan-actions.ts`: removing with Undo, stopping the timer, and planning from or forgetting a backlog problem.
- **Size:** the first load grows about 4 kB (176 kB gzipped). The Start drawer loads on demand.
- **Revisit:**
  - if the backlog grows long, add sorting or a cap;
  - if a phone and a laptop should share the Start preference, move it into the saved data.
