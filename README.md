# LeetCode Tracker

A personal practice tracker for the [NeetCode 250](https://neetcode.io/) list, built for preparing for interviews after work.

It answers one question each evening: what should I solve tonight? You plan the day, time each attempt against an interview time box, re-solve problems on a spaced-repetition schedule, and keep a one-line note of each problem's key idea. It runs entirely in the browser, and your data stays on your machine. Signing in with Google is optional; syncing your progress between devices through it is the next step.

## Quick start

You need Node 22.18 or newer. The problem-list script relies on Node running TypeScript directly.

```bash
npm install
npm run dev
```

Open http://localhost:5173. A fresh start plans one problem on weekdays and three on weekends; press **Suggest** on Today to fill the list.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run check` | Type-check, lint and all tests; run before every commit |
| `npm test` / `npm run test:watch` | Logic tests (Node) and component tests (jsdom), once or on every change |
| `npm run lint` | oxlint, including the folder boundaries in `src/lib` |
| `npm run generate:problems` | Rebuild `src/data/problems.ts` from NeetCode's data, then review the diff |
| `npm run deploy` | Check, build, then publish to Firebase Hosting with the Firestore rules (needs `npx firebase login` once) |
| `npm run emulators` | Local Firebase Auth and Firestore for trying sign-in (needs Java 21+) |

## Features

- **Today:** pick problems, or press **Suggest** for due reviews first and then the next new ones. Time each one against an interview target (Easy 15, Medium 25, Hard 40 min), then log the attempt: the result, your confidence and the key idea. Pick **Tomorrow**'s problems the night before, so after work you only press Start.
- **Priority:** the list order is the priority.
  - Drag a row by its grip to reorder it, or across into Tomorrow and back. From the keyboard, focus the grip and press ↑/↓. On a phone, hold a row for a moment, then drag.
  - Each row has just **Start** and **✕**. ✕ sets the problem aside in the **Backlog**, with **Undo** in a toast for a few seconds.
  - Problems put off past tomorrow show under **Later**.
- **Now:** the day opens with its date, how many are done, and about how many minutes the goal still needs. Below it, one card holds the problem to work on:
  - **Up next**, with **Start**. Start asks whether to open the problem on LeetCode or NeetCode, or **Just start the timer**. Close the drawer to change your mind, or tick **Remember my choice** to skip the question next time;
  - once started, a big clock against the time box, **Done — log attempt**, Pause, links back to the problem and its solution video, and ⏹ to stop the timer and keep the problem for later;
  - take the problem out of the card (✕ or ⏹) and the card stays empty until you start the next one yourself;
  - on other tabs the timer stays in sight: a pill in the header, or on phones a bar above the tab bar with Pause and Log. The browser tab's title shows it too while you're on LeetCode.
- **Then:** the rest of today's problems, one line each, in order. Due reviews are a link above the list that adds as many as the goal has room for.
- **Backlog:** problems you took off a plan, kept in view so they aren't lost. Suggest skips them; **+ Today** brings one back.
- **Done today:** finished problems fold into their own group: how each went, the minutes against its time box, and when it comes back for review.
- **Daily goal line:** a **Bonus** line marks where today's goal ends (1 problem on weekdays, 3 on weekends by default). The day is done when the goal is, and anything below the line is extra.
- **Short on time?** One task of about 20 minutes:
  - a quick review, with the timer starting right away;
  - or **watch & note**: watch NeetCode's video, then write the key idea in your own words. It counts toward the week and lands on tomorrow's list for you to solve yourself.
- **Welcome back:** after 3 or more days away, you restart small instead of facing a wall: one easy re-solve today, overdue reviews spread out at 1–2 a day, and the interview pace restarted from today.
- **Reviews:** a clean solve comes back after 3, then 7, 21 and 60 days, and is then mastered. Shaky confidence repeats the interval; needing help or failing brings the problem back tomorrow.
- **Patterns:** every key idea with its time and space complexity, grouped by topic, with **Copy as Markdown** for Obsidian.
- **History** (called **Progress** on phones and tablets, where it also holds the sidebar's cards):
  - a GitHub-style activity grid, a summary of the last 7 days, and a day-by-day log;
  - click any problem title to open its details: every attempt with its time against the target, the key idea, the complexity and the next review.
- **Focus:** the sidebar ranks your weakest topics from the last 60 days and adds a problem from one in a click. Needing help or failing counts most, then running over time, then shaky solves.
- **Progress:** an overall bar in the sidebar with a marker for the pace your interview date needs, and how many a day it takes to finish. Today's bar sits above the task list.
- **This week:**
  - a weekly goal of N practice days, with Mon–Sun dots and a weekly streak that one skipped evening can't break;
  - separate weekday and weekend amounts, and **Core 150 first** for Suggest;
  - **Add to calendar** downloads an .ics file with recurring practice blocks and a 5-minute reminder.
- **Layout:** on wide screens the tabs sit in the header and the sidebar beside the list. Below laptop width the sidebar's cards move to the top of the Progress tab, and phones get a tab bar at the bottom.
- **Settings** (the gear in the header): the routine above, the interview date, what Start opens, the theme (System, Light or Dark) and backups.
- **Account:** the person icon at the end of the header signs you in with Google. Then it shows your photo, with Settings, Export backup and Sign out.
- **⌘K:** find any problem and act on it: add it to today, start the timer, log an attempt, open it on LeetCode or NeetCode or watch the video, or set its status.
- **Python:** a slide-out cheatsheet of Python for LeetCode, with the JavaScript equivalent next to each item.

## Your data

- **Where it's stored:** progress is saved in this browser's localStorage under the key `leetcode-tracker`.
- **Cloud:** sign in with Google from the person icon at the top right, and your progress is kept in Firestore too, so it's on all your devices ([ADR-006](docs/adr/0006-sync-per-item.md)).
  - Each change uploads only what it touched, about 2 seconds later. Other devices fetch it when you open them or come back to them.
  - The first sign-in on a device keeps both sides, unless they differ; then it asks once which one to keep.
  - A running timer stays on its device.
  - Signed out, clearing site data or switching browsers starts from scratch.
- **Backups:** **Export backup** in Settings downloads everything as JSON. **Import** shows what a file contains before it replaces anything.
- **Old and damaged saves:** older saves are upgraded on load, and a damaged one loses only its bad entries, not the whole save.
- **If the app ever crashes:** the error screen offers to download your raw saved data, reload, or reset.

## Project layout

```
src/
  components/   React UI by feature: shell/, today/, sidebar/, settings/, command-palette/, ui/ (shadcn)
  lib/          everything below the UI: _consts, _utils, _hooks, domain, store, theme, sync (Firebase, lazy)
  types/        the saved data model (types only)
  data/         the 250 problems (generated) and the Python cheatsheet
  test/         test builders, store reset, and the jsdom setup
scripts/        generate-problems.ts
docs/           architecture overview, decisions (ADRs), Firebase setup, tech-debt audit
firebase.json   hosting, cache headers and emulators; firestore.rules and .env sit beside it
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): conventions, where new code goes, and step-by-step common tasks
- [docs/architecture.md](docs/architecture.md): how the app works, including its data flow, state, loading and theme
- Decisions:
  - [ADR-001](docs/adr/0001-code-structure.md): layered structure
  - [ADR-002](docs/adr/0002-hosting-auth-sync.md): hosting and sign-in (its sync design is replaced by ADR-006)
  - [ADR-003](docs/adr/0003-lib-layout.md): `lib` layout and lint-enforced boundaries
  - [ADR-004](docs/adr/0004-layout-redesign.md): the "focus first" layout, built on the current code in slices
  - [ADR-005](docs/adr/0005-today-actions-and-backlog.md): simpler Today actions, the backlog and the Start drawer
  - [ADR-006](docs/adr/0006-sync-per-item.md): cloud sync, one document per item
- [docs/firebase-setup.md](docs/firebase-setup.md): the one-time Firebase console steps
- [docs/tech-debt.md](docs/tech-debt.md): the debt audit and what's still open

## Stack

Vite 8, React 19, TypeScript 6, shadcn/ui (Radix, Nova preset) on Tailwind v4, zustand 5 with `persist`, dnd-kit, Firebase (Hosting, Auth), Vitest, oxlint.

## License

[MIT](LICENSE)
