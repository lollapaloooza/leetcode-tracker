# ADR-006: Sync one document per item

**Status:** Accepted — implemented 2026-10-28
**Date:** 2026-10-28
**Deciders:** Project owner
**Replaces:** the sync design in [ADR-002](0002-hosting-auth-sync.md): §3.1 (one document per user), §3.4–3.5 (three-way merge), §3.6's first link, §5.2–5.3, and Phases 0 and 3. Hosting and sign-in from ADR-002 stay as built.

## Context

ADR-002 planned to keep each person's data as one Firestore document: a JSON string of everything, merged with a three-way merge against the last agreed copy. Before building it, the owner asked:

- **Can it update one problem at a time?** One document means every save uploads all of it, about 350 kB after a year, and every pull downloads all of it. A document can hold at most 1 MiB.
- **Simpler choices:**
  - **First sign-in:** if this device and the cloud both have data, ask "cloud or this device" only when they conflict. Don't combine, since combining would need to show what gets combined.
  - **Timer:** a running timer doesn't follow you to other devices.
  - **Tabs:** making open tabs share one copy isn't needed.
  - **No status line:** signed in or not; sync works quietly.

## Decision

1. **One document per item** at `users/{uid}/items/{item}`, each `{ data, schema, updatedAt }`:

   | Item | Holds |
   |---|---|
   | `problem:<id>` | the problem's status, review, note and complexity, together |
   | `attempt:<key>`, `study:<key>` | one attempt or study |
   | `plan:<day>` | that day's ordered plan |
   | `backlog` | the backlog, in order |
   | `settings` | the goals, Core 150 first, and the interview date |

   - **Never synced:** the running timer and the welcome-back day. They stay on each device.
   - **Deleting** writes `data: null`, so other devices learn about it; documents are never removed.
   - **`updatedAt`** is the server's time of the write. **`schema`** is the writer's `STORAGE_VERSION`.
   - The mapping is pure and tested: [`lib/sync/items.ts`](../../src/lib/sync/items.ts) (`itemsOf`, `withItems`, `changedItemIds`).
2. **Up: upload only what changed.**
   - A store change marks the items it touched (found by reference, so it's cheap).
   - 2 s later the marked items go up in one batch.
   - The marks are saved in `leetcode-tracker-sync`, so a change made offline, or just before the tab closes, still goes up later.
3. **Down: fetch only what changed.**
   - On start, when the device comes back online, and when the tab comes back after 30 s, it asks for items with `updatedAt` after the newest one it has seen.
   - Each fetch looks 2 s further back, in case a write landed with a slightly older server time.
   - A local change not yet uploaded wins over a fetched one; it goes up next.
   - Fetched items go through `normalize()`, like a backup.
4. **Conflicts while signed in:** for one item, the last upload wins. Different items never clash, so there's no merge to write.
5. **First sign-in on a device** compares the two sides item by item. Default settings, an empty backlog and an empty day count as nothing.

   | Cloud and device | What happens |
   |---|---|
   | No item differs (one side may be empty) | Both are kept, without a question: cloud-only items come down, device-only items go up |
   | Any item differs | Ask once: **Cloud** or **This device**, with each side's solved count, attempts and last practice. The other side is replaced. |
   | The question is closed | Nothing changes; it asks again on the next visit |

6. **Newer app on another device:** if a fetched item has a higher `schema`, sync stops and a toast offers **Reload**.
7. **No sync status in the UI.** The account button shows only signed in or not. Failures are logged to the console and retried 30 s later, or when the device comes back online.
8. **Firestore Lite** stays: plain reads, queries and batched writes. Live updates and an offline cache would duplicate what the store already does.

## Options considered

| | Data per save | Merge logic | Size limit | Reads per pull |
|---|---|---|---|---|
| A. One document, three-way merge (ADR-002) | All of it (~350 kB a year) | `merge3`, with per-collection rules | 1 MiB, about 2–3 years | 1 large read |
| **B. One document per item, last write wins per item (chosen)** | Only the changed items (a log: about 3 small documents) | None | None | Only the changed items |
| C. Per-item documents with the full SDK and live listeners | Changed items | None | None | Full re-read after 30 min away; 3× the download |

B fits the owner's mental model, and with the simpler first sign-in it needs no merge at all. Its price: when two devices change the same item while one is offline, the later upload wins. That item is one problem, one day's plan, the backlog or the settings, so the loss is small and rare for one person.

## Consequences

- **Code:** `lib/sync/` gains `items.ts`, `meta.ts`, `engine.ts` (against a `RemoteStore` interface) and `remote.ts` (Firestore Lite). The engine is tested with an in-memory cloud. `account-store` holds the first-sign-in question (`choice`), and the shell shows it in `SyncChoiceDialog`.
- **Rules:** [`firestore.rules`](../../firestore.rules) allows each user only their own items, with the three fields; `updatedAt` must be the server time, and deletes are refused. `data` is exempt from indexing.
- **Size:** the sync chunk is 64.5 kB gzipped (Auth + Firestore Lite), loaded only for people who sign in. The first load grew about 5 kB gzipped for the header's account button.
- **Cost:** a log writes about 3 documents, against 20,000 free writes a day. Each device reads everything once, at its first sign-in, then only changes.
- **Changing the saved data:** a new field in `TrackerData` must be given an item in `items.ts`, or kept local like the timer. See CONTRIBUTING.
- **Known limits:**
  - **Two open tabs** still each keep their own copy, as before. Each uploads only what changed in it, so a stale tab doesn't wipe cloud data. It may overwrite the other tab's local copy, though, until the next fetch.
  - **The crash-screen reset** clears the sync state too, so the device fetches everything again.
  - **No cloud snapshots:** Export backup is the way to keep a copy.
- **Not tested end to end:** the Firestore calls themselves (`remote.ts`) run only against the real project. Emulator tests need Java 21+ and come with the integration tests.
