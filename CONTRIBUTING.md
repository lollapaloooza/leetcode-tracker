# Contributing

How to work on this codebase: the workflow, where code goes, and step-by-step guides for the changes you'll make most often. For how the app works, see [docs/architecture.md](docs/architecture.md).

## Workflow

```bash
npm install
npm run dev          # http://localhost:5173
npm run check        # type-check + lint + all tests — run before every commit
```

For a UI change, also try it in the browser:

- in **light and dark** (the toggle is in the header);
- at **phone width** and **tablet width**, since the layout changes at `sm` and `lg` (see [Layout](docs/architecture.md#layout)): a tab bar, a NowBar and hold-to-drag on phones, the sidebar's cards in the Progress tab below `lg`;
- **from the keyboard**: rows, menus and drag handles all work without a mouse.

Commit messages use a `type: summary` prefix (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).

## Where code goes

Find the first row that fits.

| You're adding… | Put it in | Import it as |
|---|---|---|
| A type that's part of the saved data | `src/types/tracker.ts` | `@/types` |
| A fixed value used in more than one place (a label, a limit, a storage key) | `src/lib/_consts/<topic>.ts` | `@/lib/_consts/labels` |
| A helper that knows nothing about this app (dates, files, formats) | `src/lib/_utils/<name>.ts` | `@/lib/_utils/date` |
| A practice rule: what to suggest, when a review is due, a stat | `src/lib/domain/<area>.ts` | `@/lib/domain` |
| Something that changes saved state | an action in `src/lib/store/tracker-store.ts` | `@/lib/store` |
| UI state that isn't saved (open dialogs, the current tab) | `src/lib/store/ui-store.ts` | `@/lib/store` |
| A preference for this device only, not backed up (like what Start opens) | `src/lib/store/prefs-store.ts` | `@/lib/store` |
| Anything that talks to Firebase (sign-in now, sync next) | `src/lib/sync/<name>.ts`, behind an interface its tests can fake (like `AuthClient`) | from components only: `withSync()` / `loadSync()` in `@/lib/sync/load` |
| A React hook that knows nothing about the tracker | `src/lib/_hooks/useName.ts` | `@/lib/_hooks/useNow` |
| A hook, constant or helper that only one feature uses | next to that feature, e.g. `src/components/today/` | relative import |
| A view, dialog or sidebar section | `src/components/`, in its feature folder (`shell/`, `today/`, `sidebar/`, `settings/`, `command-palette/`) | `@/components/…` |
| The logic behind one component (state, derived values, handlers) | a `useName.ts` hook next to the component | relative import |

Two rules come with this table. `npm run lint` enforces both ([ADR-003](docs/adr/0003-lib-layout.md)):

- **`_` folders have no index:** import the file. **Modules** (`domain`, `store`, `theme`) are imported as a folder, never by reaching into their files.
- **Imports go one way:** `domain` stays pure (no React, no store), and `_utils` imports nothing from the app.
- **Firebase stays lazy:** only `src/lib/sync/` imports `firebase`, and the rest of the app reaches it through `@/lib/sync/load`, so people who never sign in never download it.

If lint rejects an import, the code is usually in the wrong layer: move it, don't silence the rule.

## Conventions

- **Formatting:** there's no formatter, so match the surrounding code: 2 spaces, single quotes, no semicolons, trailing commas, lines up to about 130 characters.
  - **Imports:** packages first, then `@/` paths in alphabetical order, then relative paths.
- **Naming:**
  - components are `PascalCase.tsx`;
  - hooks are camelCase, file and function alike (`useNowCard.ts` exports `useNowCard`); lint rejects a `use-name.ts` file;
  - other modules are `kebab-case.ts`;
  - every export is named, except `App`.
- **Comments:**
  - say *why*, or what isn't obvious from the code;
  - exported functions get a one-line `/** … */` describing their behavior;
  - don't comment what the code already says.
- **Time:** day-based logic takes `today: string` (local `YYYY-MM-DD`) as a parameter, and domain functions never read the clock. Only store actions stamp timestamps (`at`, `updatedAt`).
- **Store access:**
  - **when rendering:** subscribe to only the field you read, `useTracker((s) => s.plans)`;
  - **in event handlers:** read the latest state with `useTracker.getState()`.
- **Interface text:** use sentence case and plain words, and name what happens ("Move to tomorrow", not "Reschedule item").
- **`src/components/ui/`** is shadcn's generated code. Leave its style alone (double quotes, `cn` imported from `'cn'`) so `shadcn add` and diffs stay clean.
- **Components:**
  - keep them small and presentational: about one screen of code, one job;
  - move state, derived values and handlers into a `useName.ts` hook beside the component;
  - rules that don't need React (what's up next, how much time is left) go in `lib/domain` as pure functions, so they're tested in Node;
  - split a file that has grown big when you touch it.
- **Tests:**
  - they sit next to the module they cover (`planning.ts` → `planning.test.ts`, `GoalStepper.tsx` → `GoalStepper.test.tsx`);
  - `*.test.ts` runs in Node; `*.test.tsx` runs in jsdom with Testing Library. Each component test starts with clean stores, storage and DOM (`src/test/setup-dom.ts`);
  - test components the way they're used: find elements by role and name, act with `userEvent`, assert on what's shown and on the stores. Seed data with `resetStores({ … })` from `@/test/stores`;
  - build data with `@/test/builders` (`idOf`, `attempt`, `progressOf`, `tracker`);
  - pass dates explicitly;
  - tests run in `America/New_York`, so date code is exercised across daylight-saving changes.
- **Dependencies:**
  - **Release age:** add or upgrade only to releases **at least two weeks old**, to reduce supply-chain risk. Check with `npm view <pkg> time`.
  - **Build-only tools** go in `devDependencies`.
  - **Audit:** `npm audit --omit=dev` should stay clean.
- **Decisions:** a change to structure, to the saved data's shape, or to infrastructure gets an ADR in `docs/adr/` (copy the format of an existing one), and the README or `docs/architecture.md` is updated in the same change.

## Common tasks

### Add a practice rule

1. **Write a pure function** in the right `src/lib/domain/` module. It takes the data it needs and `today`, and returns an answer. Accept a `Pick<TrackerData, …>` rather than the whole state, so it says what it depends on.
2. **Test it** in the module's `*.test.ts`, with the builders.
3. **Use it.** It's exported from `@/lib/domain` automatically (`index.ts` re-exports each module). Call it from a store action, or from a component inside `useMemo`.

### Add a store action

In `src/lib/store/tracker-store.ts`:

```ts
interface TrackerActions {
  /** What it does, from the user's point of view. */
  skipToday: (today: string) => void
}

// …inside create():
skipToday: (today) =>
  set((s) => ({
    plans: { ...s.plans, [today]: [] }, // keep the computation in lib/domain; the action only composes
  })),
```

- **Keep it immutable:** return only the fields that change, and use the helpers at the top of the file (`withPlanItem`, `omit`).
- **When it affects other state:** if an action changes something tied to other state (the plan, the timer, reviews), keep them in step the way `logAttempt` and `removeFromPlan` do.

### Change the shape of the saved data

Every save and every backup passes through `normalize()`, so a shape change touches these places in this order:

1. **The type:** add or change the field in `src/types/tracker.ts`.
2. **The default:** add it to `TRACKER_DEFAULTS` in `src/lib/_consts/defaults.ts`. TypeScript will insist.
3. **Validation:** read it in `normalize()` (`src/lib/store/persistence.ts`) with a guard, falling back to the default, so a bad value is dropped instead of crashing the app.
4. **Backups:** include it in `exportable()` if it should be backed up. TypeScript will insist on this too.
5. **Old saves:** if existing saves need converting (a rename, a new structure, a removed field), detect the old shape in `normalize()` and bump `STORAGE_VERSION`. Simply adding a field with a default needs no bump, because `normalize()` runs on every load.
6. **Tests:** add cases to `persistence.test.ts` for an old save converting, an invalid value dropped, and an export/import round trip.

Once cloud sync exists, the field also needs a merge rule ([ADR-002 §3.5](docs/adr/0002-hosting-auth-sync.md#35-merge-rules-merge3base-local-remote)).

### Add a dialog or sheet that loads on demand

1. **Build the component** in `src/components/MyDialog.tsx`, with a named export.
2. **Add its open state** to `useUI` (`src/lib/store/ui-store.ts`): `myDialogOpen` and `setMyDialogOpen`.
3. **Wire it up** in `src/components/shell/Overlays.tsx`:

   ```tsx
   const MyDialog = lazyComponent(() => import('@/components/MyDialog').then((m) => m.MyDialog))

   // in Overlays:
   const myDialogOpen = useUI((s) => s.myDialogOpen)
   // …
   <MountWhenOpened open={myDialogOpen}>
     <MyDialog />
   </MountWhenOpened>
   ```

The dialog now lives in its own chunk, and it's preloaded once the page is idle. A keyboard shortcut that opens it belongs in `Overlays`, like ⌘K, so it works before the chunk loads.

### Add a shadcn component

```bash
npx shadcn add <component>
```

It lands in `src/components/ui/`, and `components.json` points the CLI's `utils` and `hooks` aliases at `src/lib/_utils/cn.ts` and `src/lib/_hooks/`. Check `npm run build` afterwards. The first load is about 557 kB (177 kB gzipped), so lazy-load anything heavy that isn't needed on the first screen.

### Refresh the problem list

```bash
npm run generate:problems
git diff src/data/problems.ts
```

- **Where the data comes from:** the script reads NeetCode's site bundle and GitHub data.
- **Safety check:** it refuses to write if the data doesn't look right (250 problems, 150 core, unique LeetCode numbers).
- **Reviewing the diff:** progress is keyed by LeetCode number, so renamed or re-slugged problems are harmless. A problem *dropped* from the list disappears from the UI.

### Deploy

The owner deploys. It needs the Firebase CLI logged in once (`npx firebase login`).

```bash
npm run deploy                                                    # check, build, then Hosting + Firestore rules
curl -sI https://leetcode-tracker-lollapalooza.web.app/ | grep -i cache-control   # expect no-cache
```

A hashed file under `/assets/` should answer `public, max-age=31536000, immutable`. To try a build without touching the live site, `npx firebase hosting:channel:deploy preview` gives a temporary URL. Its domain must be added under Authentication › Settings › Authorized domains before Sign in works there.

### Try sign-in without the real project

```bash
npm run emulators      # Auth + Firestore emulators, UI at http://127.0.0.1:4000 (needs Java 21+)
```

Then put `VITE_USE_EMULATORS=true` in `.env.local` and run `npm run dev`. Sign in creates a fake account in the emulator, which you can delete from its UI.

### Add a folder to `src/lib`

1. **A module** (imported as a folder): give it an `index.ts`, and add `@/lib/<name>/*` to the root deep-import rule in `.oxlintrc.json`.
2. **Rules:** add an override for the folder listing what it may not import. Restate the deep-import pattern inside it, because an override replaces the root rule's options instead of merging with them.
3. **Check the rule works:** add a file with a forbidden import and confirm `npm run lint` fails, then delete the file.
4. **Docs:** update the tables in this file and in `docs/architecture.md`.
