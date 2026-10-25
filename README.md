# LeetCode Tracker

Personal tracker for the NeetCode 250 list — plan the day, time each attempt, re-solve on a spaced-repetition schedule, and keep a one-line pattern note per problem.

```bash
npm install
npm run dev
```

## Features

- **Today** — pick problems (or **Suggest**: due reviews first, then the next new ones), time them against interview targets (Easy 15 / Medium 25 / Hard 40 min), and log each attempt: result, confidence, key idea. Pick **Tomorrow**'s problems the night before, so after work you only press Start.
- **Priority** — the list order is the priority. Drag a row by its grip (or focus the grip and press ↑/↓) to reorder it, or across into Tomorrow and back. Each row's ⋯ menu has **Do first**, **Move to tomorrow**, **Move to Saturday** (for a Hard that deserves the weekend session) and **Remove**; problems put off past tomorrow show under **Later**.
- **Up next & working on it** — the top unfinished problem is **Up next**, with Start as the main button. Once started it's the one you're **working on**: it leads the list with a live timer and a bar against the target time, and the header pill and browser tab title show it while you're on LeetCode.
- **Daily goal line** — a **Bonus** line marks where today's goal ends (1 problem on weekdays, 3 on weekends by default). The day is done when the goal is; anything below the line is extra.
- **Short on time?** — one ~20-minute task: a quick review (timer starts right away) or **watch & note** (NeetCode's video, then the key idea in your own words — it counts for the week and lands on tomorrow's list to solve yourself).
- **Welcome back** — after 3+ days away, restart small instead of facing a wall: one easy re-solve today, overdue reviews spread out (1–2 a day), interview pace restarted from today.
- **Reviews** — a clean solve comes back after 3 → 7 → 21 → 60 days, then it's mastered. Shaky confidence repeats the interval; needing help or failing brings it back tomorrow.
- **Patterns** — every key idea and its time/space complexity, grouped by topic, with **Copy as Markdown** for Obsidian.
- **History** — GitHub-style activity grid, a last-7-days summary, and a day-by-day log. Click any problem title for its details drawer: every attempt with time against the target, key idea, complexity, next review.
- **Focus** — the sidebar ranks your weakest topics from the last 60 days (needed help or failed > over time > shaky) and adds a problem from one in a click.
- **Progress** — sidebar with overall bar and interview-date pace marker; today's bar sits above the task list.
- **This week / Routine** — a weekly goal (practice N days) with Mon–Sun dots and a weekly streak that a skipped evening can't break; separate weekday/weekend amounts; **Core 150 first** for Suggest; **Add to calendar** downloads an .ics with recurring practice blocks and a 5-minute reminder.
- **⌘K** — find any problem and act on it: add to today, start timer, log, open LC/NC/video, set status.
- **Python** — slide-out cheatsheet for LeetCode Python with the JS equivalent next to each item.

## Stack

Vite + React 19 + TypeScript, shadcn/ui (Radix, Nova preset) on Tailwind v4, zustand with `persist` → `localStorage` (key `leetcode-tracker`, version 3 — older saves migrate automatically).

## Where things live

- `src/data/problems.ts` — the 250 problems, generated from neetcode.io's own `neetcode250` list: both slugs (NeetCode's often differ, `contains-duplicate` → `duplicate-integer`) and the solution video id; `core` marks the NeetCode 150. `id` is the LeetCode number.
- `src/data/python-cheatsheet.ts` — cheatsheet content.
- `src/lib/srs.ts` — review intervals, scheduling, spreading overdue reviews; `src/lib/insights.ts` — pace, activity, weekly goal & streak, weekly summary, weak topics; `src/lib/calendar.ts` — .ics export; `src/lib/plan-board.ts` — drag & drop between today and tomorrow (dnd-kit) and the ↑/↓ keyboard moves.
- `src/store.ts` — persisted data and actions; `src/ui-store.ts` — session UI state (tab, dialogs).
- `src/components/` — views, rows, dialogs; `src/components/ui/` — shadcn components.

Progress lives only in this browser; use **Export backup** at the bottom of the sidebar now and then.
