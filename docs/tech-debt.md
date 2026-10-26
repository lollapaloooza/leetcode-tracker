# Tech debt audit — 2026-10-25

Scope: the whole app (`src/`, config, dependencies), ahead of the planned move to hosting + Google sign-in + cloud sync.

**Scoring:** Impact and Risk run 1–5, higher is worse. Effort runs 1–5, lower is easier.
**Priority = (Impact + Risk) × (6 − Effort)**

## Progress

**Done on 2026-10-25:** #1 (git, by the owner), #2, #3, #4, #5, #6, #8, #9, #10 and #11.

- 93 unit tests sit next to each module in `src/lib/`.
- Saved data is validated field by field on every load, and there's an error screen with download and reset.
- Import uses the app's own dialogs and shows a summary of the backup.
- Lookups and helpers exist once.
- The store holds only state and actions.
- Today and the Sidebar have their own folders.

**Also done:**
- **#6:** `shadcn`, `tailwindcss` and `@tailwindcss/vite` moved to devDependencies (they're build-time only). `date-fns` (still installed by react-day-picker) and the unused `ui/card` and `ui/checkbox` were removed. Vite went 8.3.0 → 8.3.4 and `source-map-js` → 1.2.2 for advisory fixes. `npm audit --omit=dev` is now clean. The 8 advisories left are all inside the shadcn CLI's own tooling (MCP SDK, express, zod, undici), which runs only when you invoke the CLI. Its fix, shadcn 4.22.x, was a week old at the time, so upgrade once it's settled (early November).
- **#8:** `npm run generate:problems` rebuilds the list from neetcode.io's bundle (now also the source of the NeetCode 150 flag) plus GitHub's premium flags. It reproduced all 250 rows exactly, and it refuses to write if the data looks wrong.
- **#11:** the first load went from 680 kB to 549 kB (gzip 211 → 174 kB). The date picker (72 kB), ⌘K, the Python sheet, the dialogs, History and Patterns load in the background after the first paint.
- **Lint:** the last warning (`RESULT_TEXT`) became a `<ResultLabel>` component.

**Still open:** #7 (sync readiness). [ADR-002](adr/0002-hosting-auth-sync.md) (proposed) replaces its fix plan. A three-way merge against the last synced copy handles every point below without changing the data model, so what's left is Phase 0 of that ADR: tabs sharing one copy, `merge3()` with tests, and the reset clearing the sync state.

## Prioritized list

| # | Item | Type | Impact | Risk | Effort | Priority |
|---|------|------|:-:|:-:|:-:|:-:|
| 1 | No version control | Infrastructure | 4 | 5 | 1 | **45** |
| 2 | No automated tests for the domain logic | Test | 4 | 4 | 2 | **32** |
| 3 | Bad saved data can blank the app on every load | Code | 3 | 4 | 2 | **28** |
| 4 | Duplicated lookups and workflows | Code | 3 | 2 | 1 | **25** |
| 5 | `store.ts` does too much, and a type import cycle | Architecture | 3 | 2 | 2 | **20** |
| 6 | Dependency hygiene | Dependency | 2 | 2 | 1 | **20** |
| 7 | Persistence has no seam; data model not ready to merge | Architecture | 4 | 5 | 4 | **18** |
| 8 | Problem-list generator isn't in the repo | Documentation | 2 | 2 | 2 | **16** |
| 9 | State read without subscribing, during render | Code | 1 | 2 | 1 | **15** |
| 10 | Two oversized files; flat `components/` folder | Code | 2 | 1 | 2 | **12** |
| 11 | One 660 KB JavaScript bundle | Infrastructure | 2 | 1 | 2 | **12** |

## Details and why each one matters

### 1. No version control — Effort: 15 min

The project isn't a git repository. The last few sessions changed the store, the data format (v1 → v3) and most components, and none of that can be diffed or rolled back. Most hosting platforms (Firebase, Vercel, Netlify) also expect a repo for deploys and preview builds.
**Fix:** `git init`, a `.gitignore` check (it already ignores `dist`, `node_modules`, `.idea`), and a baseline commit. Push to a private GitHub repo.

### 2. No automated tests — Effort: half a day

The code that matters most is pure, deterministic logic, which is ideal for unit tests:

- the spaced-repetition intervals and spreading of overdue reviews;
- the weekly goal, streak and interview pace;
- DST-safe date math;
- `.ics` escaping;
- the suggestion, restart and quick-review picks.

Several bugs here were only caught by hand:

- overdue reviews were spread at 4 a day instead of the promised 1–2;
- the `.ics` escape regex lost its backslash;
- History counted a "watch & note" session as an attempt.

Cloud sync will add merge logic that can't realistically be checked by hand.
**Fix:**
- Add Vitest. Start with `lib/srs`, `lib/date`, `lib/insights` and `lib/calendar`, then the planning queries in `store.ts`.
- Add `npm test` to the scripts.

### 3. Bad saved data can blank the app on every load — Effort: 2–3 hours

- **Shallow import check:** `isTrackerData()` only checks that `progress` and `plans` are objects. `normalize()` then spreads whatever else the file contains over the defaults.
- **How it breaks:** a backup with, say, `"attempts": {}` passes the check and is saved to localStorage. The next render throws: Today's activity count loops over `attempts`, which is now a plain object.
- **No way out from the UI:** there's no error boundary, so the page stays blank on every reload until the storage is cleared from devtools.
- **Sync makes it likelier**, since remote data will flow through the same path.

**Fix:**
- Validate each field's type in `normalize()`, falling back to the default per field.
- Add a top-level error boundary that offers "Download my data" and "Reset". The data can't be lost silently.
- Replace `confirm()`/`alert()` with the app's dialog.

### 4. Duplicated lookups and workflows — Effort: 1 hour

- The id → problem `Map` is built separately in **11 files**.
- "Suggest N problems for a day" (`suggestNext` + `plannedFrom` + goal arithmetic) is assembled in **4 places**: TodayView, UpcomingSections and ⌘K ×2. These copies have already drifted once: Tomorrow's "already taken" set differed from Today's until `plannedFrom` was added.
- `openInNewTab`, the blob-download code and `lastTouched` each exist **twice**.

**Fix:**
- Export `problemById` from `data/problems.ts`.
- Add `lib/browser.ts` (`openInNewTab`, `downloadFile`).
- Add a store action `suggestForDay(date, count?)`.

### 5. `store.ts` does too much, and a type import cycle — Effort: 2 hours

At 476 lines, `store.ts` holds four things:

- the data model types;
- migration;
- 20 actions;
- about 10 pure planning queries.

The queries can only be imported together with the zustand store. The domain types live there too, so `store.ts` and `lib/insights.ts` import each other's types.
**Fix (ADR-001):**
- Create `src/types.ts` for the domain types.
- Create `src/lib/planning.ts` for the pure queries.
- The store keeps state, actions and migration.

### 6. Dependency hygiene — Effort: 20 min

- **Every `npm audit` warning comes from `shadcn` being a runtime dependency** (high-severity ones in `@modelcontextprotocol/sdk`, `express` and `body-parser`). The app only uses its stylesheet at build time. Move it to `devDependencies`; nothing vulnerable ships to the browser either way.
- **Unused code:**
  - `date-fns` is installed but never imported;
  - `ui/card`, `ui/checkbox` and `ui/input-group` are never used.
- **Updates:** only patch/minor ones are pending (radix-ui 1.8, lucide-react 1.61, vite 8.3.5). TypeScript 7 is out; there's no reason to jump yet.

### 7. Persistence has no seam; data model not ready to merge — Effort: 1–2 days

This doesn't hurt today, but it is the main risk for the sync project.

- **No seam:** `zustand/persist` writes one JSON blob straight to localStorage, so there's no place to add a remote copy or merge two copies.
- **Fields that make merging hard:**
  - `Attempt.prev` stores a snapshot of the old status and review so undo can restore them. After a merge from another device, an undo would restore stale data.
  - `notes`, `reviews` and `complexity` have no per-entry `updatedAt`, so last-write-wins can't be done per problem.
  - Removing an attempt leaves no trace (no tombstone), so a merge would bring it back.
  - `plans` are ordered arrays, so reordering on two devices conflicts.

**Fix:** write ADR-002 (sync) first, then:

- add a `StorageAdapter`;
- add per-entry `updatedAt` and tombstones;
- add a pure `merge(a, b)` with tests (depends on #2).

### 8. Problem-list generator isn't in the repo — Effort: 1–2 hours

`data/problems.ts` was generated from neetcode.io's bundle (the `neetcode250` flag, slugs, video ids) plus NeetCode's GitHub data (the `neetcode150` flag). The scripts lived in a temporary folder and are gone. When NeetCode changes its list or links, regenerating means rebuilding the script from scratch.
**Fix:** commit `scripts/generate-problems.ts` and a README note on how to run it.

### 9. State read without subscribing, during render — Effort: 15 min

`WelcomeBack` calls `restartPick(useTracker.getState())` while rendering. It depends on `attempts` and `coreFirst`, which the component doesn't subscribe to, so the "easy win" it names can be stale until something else re-renders it.
**Fix:** subscribe to the fields it uses, or compute it with a selector.

### 10. Two oversized files; flat `components/` folder — Effort: 1–2 hours

`Sidebar.tsx` (414 lines, 8 components) and `TodayView.tsx` (394 lines, 9 components) are the slowest files to change. `components/` mixes views, rows, dialogs and helpers at one level.
**Fix (ADR-001):** create `components/sidebar/` (one file per section) and `components/today/`.

### 11. One 660 KB JavaScript bundle — Effort: 1 hour

Everything loads upfront, including the Python cheatsheet, the ⌘K palette, the calendar dialog and the problem drawer. That's fine locally, but on a phone over mobile data it is the first thing to fix after hosting.
**Fix:** `React.lazy` for PythonSheet, CommandPalette, CalendarDialog and ProblemSheet.

## Remediation plan, alongside feature work

**Phase 0 — now, under 1 hour**

- #1 `git init` and a baseline commit.
- #6 Move `shadcn` to devDependencies; remove `date-fns` and the unused UI components.
- #9 Fix the stale read in WelcomeBack.

**Phase 1 — with the next small feature, about 1 day**

- #2 Vitest plus tests for `lib/*` and the planning queries.
- #3 Per-field validation in `normalize()`, an error boundary with export and reset, and no more `alert()`/`confirm()`.
- #4 `problemById`, `lib/browser.ts`, `suggestForDay`.

**Phase 2 — before starting sync, about 1–2 days**

- #5 and #10, the ADR-001 restructure (`types.ts`, `lib/planning.ts`, feature folders for Today and Sidebar).
- #7 Write ADR-002 for sync; add a `StorageAdapter`, merge metadata and a tested `merge()`.

**Phase 3 — with hosting**

- CI on push: build, lint, test.
- #11 Lazy-load the heavy dialogs.
- #8 Commit the problem-list generator.

## Not debt (checked)

- **TypeScript strictness:** `tsconfig` has no `strict` flag, but TypeScript 6 is strict by default (verified: implicit `any` and null-assignment errors fire).
- **Lint:** clean apart from shadcn's fast-refresh notes and two constants exported from `problem-bits.tsx`.
- **Storage size:** about 250 bytes per attempt; even 5,000 attempts is about 1.3 MB, well under localStorage's ~5 MB.
- **Dates:** local `YYYY-MM-DD` strings, `today` passed in rather than read inside domain logic, DST-safe `diffDays`.
