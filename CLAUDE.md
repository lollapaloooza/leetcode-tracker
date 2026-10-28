# CLAUDE.md

A local-first React SPA for practicing the NeetCode 250. The saved data lives in localStorage. Firebase (Hosting, Google sign-in) is set up; sync isn't built yet.

**Read before changing code:**

- [CONTRIBUTING.md](CONTRIBUTING.md): where code goes, conventions, step-by-step common tasks
- [docs/architecture.md](docs/architecture.md): how the app works

Don't duplicate them here; update them.

## Commands

```bash
npm run check                                   # type-check + lint + tests; must pass before you finish
npx vitest run src/lib/domain/planning.test.ts  # one test file
npx vitest run --project dom                    # only component tests (*.test.tsx, jsdom)
npm run dev                                     # http://localhost:5173
npm run build                                   # also prints chunk sizes; first load is ~557 kB (177 kB gzip)
npm run deploy                                  # check, build, then Firebase Hosting + Firestore rules; only when the owner asks
npm run emulators                               # local Auth + Firestore (needs Java 21+); pair with VITE_USE_EMULATORS=true
```

## Rules

- **Git:** never commit or push. The owner handles git; leave changes in the working tree.
- **Dependencies:** add or upgrade only to releases at least 14 days old (`npm view <pkg> time`). Build-only tools go in `devDependencies`.
- **Layering:** lint enforces it ([ADR-003](docs/adr/0003-lib-layout.md)).
  - Firebase lives only in `src/lib/sync/`, a lazy chunk. Everything else reaches it through `loadSync()` / `withSync()` in `@/lib/sync/load`.
  - `domain` stays pure: no React, no store, no clock.
  - `_utils` imports nothing from the app.
  - Import `@/lib/domain`, `@/lib/store` and `@/lib/theme` as folders.
  - Never disable `no-restricted-imports`. If it fires, the code belongs in another layer.
- **Naming:** components are `PascalCase.tsx`, hooks are camelCase (`useNowCard.ts`), and other modules are `kebab-case.ts`. Keep components small, with their logic in a hook beside them.
- **Time:** day-based logic takes `today` (local `YYYY-MM-DD`) as a parameter. Only store actions stamp timestamps.
- **Saved data:** every save and backup goes through `normalize()`. To change the shape, follow "Change the shape of the saved data" in CONTRIBUTING. Old saves must keep loading.
- **Hands off:**
  - `src/data/problems.ts` is generated; run `npm run generate:problems` instead of editing it.
  - Don't reformat shadcn's `src/components/ui/`.
- **Docs:** structural, data-shape or infrastructure decisions get an ADR in `docs/adr/`. Update README, architecture.md and CONTRIBUTING's tables in the same change.

## Verifying UI changes

- **Try it in the running app:** light and dark; phone, tablet and wide widths (the layout changes at `sm` and `lg`); and keyboard only (drag handles take ↑/↓).
- **Clean up after:** browser checks write to localStorage under `leetcode-tracker`, `leetcode-tracker-theme`, `leetcode-tracker-prefs` and `leetcode-tracker-sync`, and Firebase adds IndexedDB databases once Settings opens. Remove any test data.
- **Sign-in:** the in-app browser blocks the Google popup. The owner tests signing in.

## Where things stand

- **Cloud sync** (Firebase: Hosting, Google sign-in, Firestore) is designed in [ADR-002](docs/adr/0002-hosting-auth-sync.md).
  - Project `leetcode-tracker-lollapalooza`; the owner's console steps are in [docs/firebase-setup.md](docs/firebase-setup.md).
  - Done: hosting config, `npm run deploy`, Firestore rules, and Google sign-in in Settings › Your data (account only, no data sync yet).
  - The owner runs the first deploy. Never deploy without being asked.
  - Before sync itself, Phase 0:
  - make open tabs share one copy (they currently overwrite each other);
  - add `merge3()` with tests;
  - make the crash-screen reset clear the sync state.
- **shadcn upgrade:** move the CLI to 4.22.x in early November 2026. It clears the remaining dev-only `npm audit` advisories.
- **Layout redesign:** [ADR-004](docs/adr/0004-layout-redesign.md) is done: all five slices (Settings sheet, Now card and day heading, one-line rows with "Done today", tabs in the header, the phone layout). How the layout changes by width is in [architecture.md](docs/architecture.md#layout).
- **Today's actions:** [ADR-005](docs/adr/0005-today-actions-and-backlog.md), done.
  - Rows have Start and ✕, with no ⋯ menus.
  - ✕ sends a problem to a saved `backlog`, with Undo in a toast.
  - Start opens an optional LeetCode/NeetCode drawer, which this device can remember.
  - Emptying the Now card keeps it empty until something starts.
- **Open debt:** see [docs/tech-debt.md](docs/tech-debt.md).
