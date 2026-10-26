# ADR-002: Hosting, Google sign-in and cloud sync

**Status:** Proposed
**Date:** 2026-10-26
**Deciders:** Project owner
**Changes:** replaces item 5 of ADR-001 and the fix plan in tech-debt #7 (see [5.2](#52-sync-model))

## Summary

- **Hosting and backend:** the built app is served from **Firebase Hosting**. People sign in with **Google** through Firebase Auth, and each user's data is **one Cloud Firestore document**. Everything runs on the free Spark plan, which caps usage instead of billing.
- **Still local-first:** the UI keeps reading and writing localStorage exactly as it does today. Sync runs in the background and is downloaded only by signed-in users. It adds 62 KB gzip and is never part of the first load.
- **How devices merge:** a **three-way merge** compares each copy with the last copy both sides agreed on (the "base"). Because of that, the data model, `normalize()` and backup files stay exactly as they are: no per-record `updatedAt`, no tombstones and no storage adapter.

## 1. Requirements

### Functional

| # | Requirement |
|---|---|
| F1 | Open the app from any browser at a public URL, on a laptop or a phone. |
| F2 | Sign in with Google. Using the app signed out keeps working exactly as it does today. |
| F3 | Progress made on one device appears on the others when the tab is reopened or refocused. Live push isn't needed. |
| F4 | Practicing works offline, and the changes sync once the device is back online. |
| F5 | Nothing is lost when two devices change things while out of contact (phone offline on a train, laptop at home). |
| F6 | When a device that already has data signs in for the first time, neither its data nor the account's is silently overwritten. |
| F7 | Export and Import keep working. An import is a deliberate reset, so it replaces the data everywhere. |
| F8 | A bad sync, from a bug or the wrong import, can be undone by restoring an earlier cloud copy. |

### Non-functional

| | Target |
|---|---|
| Cost | $0 a month: Spark plan, no billing account |
| First load | No regression; sync code stays out of the first download (174 KB gzip today) |
| UI latency | The UI never waits on the network, and local writes stay synchronous |
| Sync delay | Changes are pushed within about 2 s when online; other devices pull when the tab gets focus |
| Durability | The cloud document, 14 daily cloud snapshots, and the copy on each device |
| Operations | No server code to run or patch; deploying is one command |
| Privacy | Each user can read and write only their own data, enforced by security rules |

### Constraints

- **Team:** one developer. The design shouldn't need someone who runs servers.
- **Existing stack:**
  - a Vite SPA;
  - zustand `persist` writing to localStorage, at schema version 3;
  - `normalize()`, which validates every load and every backup.
- **Safari:** it can delete script-written storage (localStorage, IndexedDB) for a site that hasn't been opened in 7 days of browsing. Home-screen web apps are exempt. Once the app is hosted, the cloud copy becomes the real backup on an iPhone.
- **Dependency age:** dependencies must be at least two weeks old. That means `firebase@13.0.0` (Oct 7); 13.1.0 came out Oct 21.

### Assumptions

- **Users:** one person with 2–3 devices, maybe a few friends later.
- **Concurrent edits:** two devices editing **different** records at the same time is normal (log on the phone, plan on the laptop). Two devices editing the **same** record while out of contact is rare.
- **Data size:** about **350 KB of JSON per year** of heavy use, meaning 3 attempts a day and a note for every problem. I measured this with a synthetic year of data, at about 233 bytes per attempt.

## 2. High-level design

```
 Each device (browser)                                     Firebase project (Spark plan)
┌───────────────────────────────────────────────┐
│ React UI ──▶ useTracker (zustand) ── persist ─┼─▶ localStorage          ┌──────────────────────────┐
│                  ▲                             │    leetcode-tracker      │ Hosting (CDN)            │
│                  │ subscribe / setState        │    leetcode-tracker-sync │   index.html, /assets/*  │
│  ┌───────────────┴──────────────────────────┐  │      { uid, rev, base,   ├──────────────────────────┤
│  │ sync engine (lib/sync, lazy chunk)       │──┼────── changedAt } ─────▶ │ Auth: Google sign-in     │
│  │   merge3(base, local, remote)            │  │                          ├──────────────────────────┤
│  │   ← lib/domain/merge.ts (pure, tested)   │──┼───── HTTPS ──────────▶  │ Firestore                │
│  └──────────────────────────────────────────┘  │                          │   users/{uid}            │
└───────────────────────────────────────────────┘                          │   users/{uid}/backups/{n}│
                                                                           └──────────────────────────┘
```

**Flow of one change**

1. **Local write, same as today.** A UI action updates zustand, which persists to localStorage. The sync engine sees the change and waits for 2 s with no further changes.
2. **Push.** Inside a Firestore transaction the engine:
   - reads the remote document;
   - merges it into local (`merge3`);
   - writes the result with `rev + 1`;
   - applies the merged result locally and saves it as the new base.
3. **Pull.** It runs on app start, when the tab comes back into view, when the device comes back online, and at sign-in. If the remote `rev` equals the base's, there's nothing to do. Otherwise the engine merges the remote copy, applies it, and pushes if this device also had changes.
4. **No outbox.** "Not yet synced" simply means the local data differs from the base. The base is saved in localStorage, so unsynced changes survive a reload. If a tab closes mid-push, the next open pushes again.

**Two devices, one of them offline**

```
Laptop                                   users/{uid}            Phone (offline since rev 7)
log attempt on #1                         rev 7                  log attempt on #42
 └ 2 s later: tx get ───────────────────▶ rev 7
   merge3(base7, laptop, r7) = laptop
   set rev 8 ───────────────────────────▶ rev 8
                                                                 back online: tx get ─▶ rev 8
                                                                 merge3(base7, phone, r8)
                                          rev 9 ◀─────────────── = both attempts; set rev 9
tab refocused: get ─────────────────────▶ rev 9
merge3(base8, laptop, r9) → applied, both attempts shown
```

## 3. Deep dive

### 3.1 Firestore data model

**`users/{uid}`**: the user's data.

| Field | Type | Meaning |
|---|---|---|
| `schema` | int | `STORAGE_VERSION` of the client that wrote it (3 today) |
| `rev` | int | Increases by 1 on every write; the rules enforce it |
| `savedAt` | timestamp | `serverTimestamp()` |
| `changedAt` | string | ISO time of the writing device's last local change; used as the conflict tie-break |
| `data` | string | JSON of `TrackerData`: the backup shape plus the running timer |

Why a single document holding a JSON string:

- **Quota:** loading everything is one read, and a push is one read plus one write.
- **No index work:** a string isn't indexed field by field. A nested map would index every attempt's fields, run toward Firestore's per-document index-entry limit as attempts pile up, and reject `undefined` values (a plan item has `attempt: undefined` after an undo). JSON drops `undefined`, as backups already do. `firestore.indexes.json` exempts `data` from indexing anyway.
- **One validation path:** pulled data goes through `normalize()`, the same check a backup file gets.
- **Debuggable:** the data stays readable in the Firebase console.
- **Limit:** a Firestore document can be at most 1 MiB. That's about 2.5–3 years of heavy use.
  - A size guard warns at 600 KB.
  - At that point the fix is to gzip the field (`CompressionStream` to `Bytes`, several times smaller) or move attempts into one document per year.

**`users/{uid}/backups/{0..13}`**: daily snapshots, `{ day, rev, schema, data }`.

- The first push of each day copies the remote document, as it was before that push, into slot `dayNumber % 14`, in the same transaction.
- It's a ring, so there's never anything to list or delete.

### 3.2 Security rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function owner(uid) { return request.auth != null && request.auth.uid == uid; }

    function validUser() {
      let d = request.resource.data;
      return d.keys().hasOnly(['schema', 'rev', 'savedAt', 'changedAt', 'data'])
        && d.schema is int && d.rev is int && d.changedAt is string
        && d.data is string && d.data.size() < 1000000
        && d.savedAt == request.time;
    }

    match /users/{uid} {
      allow read: if owner(uid);
      allow create: if owner(uid) && validUser() && request.resource.data.rev == 1;
      allow update: if owner(uid) && validUser()
        && request.resource.data.rev == resource.data.rev + 1       // no blind overwrites
        && request.resource.data.schema >= resource.data.schema;    // an outdated tab can't downgrade
      allow delete: if false;                                       // delete the account from the console for now

      match /backups/{slot} {
        allow read: if owner(uid);
        allow write: if owner(uid) && slot.matches('^([0-9]|1[0-3])$')
          && request.resource.data.data is string && request.resource.data.data.size() < 1000000;
      }
    }
  }
}
```

- **Who can sign in:** anyone with a Google account, and each person gets their own isolated document. Spark has no bill to run up; the worst abuse is using up a day's free quota. If that ever happens, add App Check or an email allowlist to the rules (open question 1).
- **The Firebase API key isn't a secret:** it identifies the project, and the rules protect the data. Still restrict it in the Google Cloud console to the hosting domain and `localhost`.

### 3.3 Module boundaries and contracts

```
src/lib/domain/merge.ts (+ test)     pure: merge3(); the domain rules, no Firebase
src/lib/store/sync-store.ts          tiny zustand store the UI reads; no Firebase (eager)
src/lib/_consts/storage.ts           + STORAGE_KEYS.sync = 'leetcode-tracker-sync'
src/lib/sync/                        module, lazy chunk, imported only by signed-in users (ADR-003 rules)
  index.ts      startSync(): wires auth, engine and store
  config.ts     Firebase config; emulator switch in dev
  auth.ts       signIn, signOut, onUserChanged     → firebase/auth
  remote.ts     RemoteStore over Firestore         → firebase/firestore/lite (the only importer)
  engine.ts     triggers, debounce, lock, guards, first link; depends on RemoteStore only
  engine.test.ts  with an in-memory RemoteStore
  meta.ts       read/write STORAGE_KEYS.sync
```

```ts
// src/lib/domain/merge.ts
export interface Side { data: TrackerData; changedAt: string }
export function merge3(base: TrackerData, local: Side, remote: Side): TrackerData

// src/lib/sync/remote.ts
export interface RemoteDoc { schema: number; rev: number; changedAt: string; data: TrackerData }
export interface RemoteStore {
  read(uid: string): Promise<RemoteDoc | null>
  /** Runs `next` in a transaction (retried on contention); returns what was written, or null to abort. */
  update(uid: string, next: (remote: RemoteDoc | null) => RemoteDoc | null): Promise<RemoteDoc | null>
}

// src/lib/sync/meta.ts — localStorage STORAGE_KEYS.sync
export interface SyncMeta { uid: string; rev: number; base: TrackerData; changedAt: string }
```

- **Dependencies point one way**, as in ADR-003: `domain → store → sync → components`. A `sync` override in `.oxlintrc.json` keeps it out of components, and only `remote.ts` and `auth.ts` know about Firebase.
- **Testable without Firebase:** the merge and the engine can be tested without Firebase or the network.

### 3.4 Sync engine

**Triggers**

| Event | Action |
|---|---|
| Store changes, not caused by applying a pull | Set `changedAt`; push after 2 s of quiet |
| App start, signed in (idle callback) | Pull |
| Tab becomes visible, at least 30 s after the last pull | Pull |
| `online` | Pull, then push |
| Tab hidden or `pagehide` | Flush a pending push (best effort; anything lost goes out on the next open) |
| Sign-in | First link (3.6) |

**Push**

```
if local deep-equals meta.base → done
navigator.locks.request('leetcode-tracker-sync') →   // one push at a time across tabs
  RemoteStore.update(uid, remote =>
    if remote.schema > STORAGE_VERSION → abort, status "Reload to update"
    merged = remote.rev == meta.rev ? local : merge3(meta.base, local, normalize(remote))
    if merged removes > 20% (and > 5) of the attempts or solved problems in remote → abort, ask
    return { schema: STORAGE_VERSION, rev: remote.rev + 1, data: merged, … }   // + daily snapshot
  )
  apply: current store == local snapshot ? merged : merge3(local, current, merged)   // keep edits made mid-push
  meta = { rev, base: merged, changedAt }
```

**Pull** follows the same path, except it applies the merged result first and pushes only if local had changes.

**Feedback loops:** applying a pull changes the store, which wakes the debounce. The push then finds local equal to the base and does nothing.

**Tabs on one device**

- **The bug today:** each open tab holds its own copy in memory, and `persist` writes the whole state, so the last tab to change anything overwrites the other tab's changes.
- **Why sync makes it worse:** a stale tab's differences from the base would look like deletions.
- **Fix, before sync:** call `useTracker.persist.rehydrate()` on `storage` events for `leetcode-tracker`, so every tab shares one copy. The base is read from localStorage on every push, never cached in memory.

### 3.5 Merge rules: `merge3(base, local, remote)`

Each record in local and remote is compared with the base:

- **Unchanged on both sides:** keep the base.
- **Changed on one side:** take that side. A record that's in the base but missing on that side counts as **deleted**, so no tombstones are needed.
- **Changed on both sides:** use the rule in the table below.

| Data | Record key | When both sides changed it |
|---|---|---|
| `attempts`, `studies` | `key` | Never in place: keys are unique and attempts are immutable (editing one is undo + a new key). The result is the union, minus deletions. |
| `progress`, `reviews` | problem id | **If both sides logged attempts for that problem:** take the base's status and review, then replay every new attempt in `at` order with `statusAfter` / `nextReview`. Each replayed attempt's `prev` is rewritten from the replay too, so undo stays correct. **Otherwise:** the newer side wins. |
| `notes`, `complexity` | problem id | The newer side wins. |
| `plans` | day, then item id | Items added on either side are kept, and items removed on either side are removed. Each item's `done`/`attempt` comes from the side that changed it, or the newer side if both did. Order follows the newer side, with the other side's additions appended. |
| goals, `coreFirst`, `interview`, `comebackAt`, `timer` | field | The newer side wins. |

- **"Newer side":** the side with the later `changedAt`, meaning the time of that device's last local change. Device clocks are trusted to agree within a few seconds. A wrong pick only matters when the same record changed on two devices while they were out of contact.
- **First link (no base):** the base is empty `DEFAULTS`, so every record looks added. Collisions fall back to the table. It only runs after the user chooses it (3.6).
- **Import:** `importData` replaces local, and the diff against the base turns that into changes and deletions. Pushing makes it the cloud copy too. Any remote change made since the last sync still merges in.
- **Crash-screen reset:** it must also clear `leetcode-tracker-sync`. Otherwise an empty local copy against a full base reads as "delete everything." The mass-deletion guard is the backstop.

**Tests**, in `merge.test.ts` and table-driven like the rest of `lib/`:

- per collection: a one-sided add, update and delete;
- both sides changing different records;
- each rule in the table when both sides change the same record;
- identities: `merge3(b, x, x) = x`, `merge3(b, b, r) = r`, `merge3(b, l, b) = l`;
- logging attempts on two devices and merging matches logging them all on one device;
- plan order;
- first link with an empty base.

### 3.6 Sign-in and first link

- **Sign-in:** Firebase Auth's Google provider, using `signInWithPopup` from the button click. If the popup is blocked, it falls back to `signInWithRedirect`. The session lives in IndexedDB, and tokens refresh by themselves.
- **`authDomain`:** set it to the domain the app is served from (`<project>.web.app` or a custom domain), and register `https://<that domain>/__/auth/handler` as a redirect URI. That's Firebase's guidance for browsers that partition third-party storage; without it, redirect sign-in can fail.
- **Where it shows up:** the sidebar's Backup section. "Saved in this browser · Sign in to sync" becomes "Synced 2 min ago · you@gmail.com", or Offline, or an error with a retry.
- **First link** (no base for this uid on this device):

  | Cloud | This device | What happens |
  |---|---|---|
  | No document | anything | Create the document from this device |
  | Has data | empty (no attempts, progress, plans or notes) | Take the cloud data |
  | Has data | has data | Ask: **Combine** (recommended), **Use cloud data**, or **Use this device's data**, with a `BackupSummary` for each side |

- **Sign out:** local data stays, and `leetcode-tracker-sync` is cleared. Signing in later with a different account counts as a first link.

### 3.7 What sync costs to load

Measured with `firebase@13.0.0` + Vite 8, minified and gzipped:

| Bundle | gzip |
|---|---|
| `firebase/app` + `firebase/auth` (popup/redirect resolver) | 29 KB |
| `firebase/app` + `firebase/firestore/lite` | 41 KB |
| **auth + Firestore Lite together** | **62 KB** |
| `firebase/firestore`, the full SDK with offline cache (for comparison) | 173 KB |
| The app's whole first load today | 174 KB |

- **Who downloads it:** the sync chunk loads through the existing idle preloader, and only when `leetcode-tracker-sync` holds a uid (signed in before) or when the user presses Sign in. Signed-out visitors download none of it.
- **Lite rather than the full SDK:** the full SDK's offline cache and live listeners duplicate what localStorage and zustand already do, at about three times the size. Lite has everything the protocol needs: `getDoc`, `setDoc`, `runTransaction` and `writeBatch`. The price is no live updates; other devices catch up when the tab gets focus.

### 3.8 Hosting

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["**/.*"],
    "headers": [
      { "source": "/assets/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
      { "source": "/", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
      { "source": "**/*.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
    ]
  },
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }
}
```

- **No SPA rewrite.** The app has no URL routes, and a rewrite would answer a missing old chunk with `index.html` (200, wrong type) instead of a clear 404.
- **Chunks gone after a deploy:** a tab left open across a deploy loses its old lazy chunks. They are preloaded at idle, so this rarely matters. `lazyComponent` retries, and the error boundary offers a reload.
- **Deploying:** add `npm run deploy` = `npm run build && firebase deploy`. After the first deploy, check the cache headers with `curl -I`.
- **Dev:** the Firebase Emulator Suite (Auth + Firestore; needs Java), switched on with `VITE_USE_EMULATORS`, so test data never touches the real account.

## 4. Scale and reliability

### Load estimate: one user, 3 devices, a heavy day, after a year of data

| | Per day | Spark free quota | Headroom |
|---|---|---|---|
| Writes (pushes plus daily snapshot) | ≤ 100 | 20,000 | 200× |
| Reads (one per push, ≤ 200 pulls) | ≤ 300 | 50,000 | 150× |
| Firestore download (≤ 350 KB × 300 reads) | ≤ 105 MB | 10 GiB a month, about 330 MB a day | 3× |
| Stored, with 14 snapshots | < 10 MB | 1 GiB | 100× |

- **First limit to hit:** download volume, which grows with document size × pulls.
- **Fix when needed:** read a tiny `users/{uid}/meta` document holding `rev` first, and fetch the big document only when the `rev` changed.
- **With friends:** each additional user costs about the same. Reads and writes stay far from the limits even for 10 active users, but download volume needs that fix first.
- **Over quota:** on Spark the product just stops for the rest of the period. There's no bill, and the app keeps working locally.

### Failure modes

| Failure | Handling |
|---|---|
| Offline | Status shows "Offline — saved on this device". Retries on `online`. Nothing to queue: the diff against the base is the queue. |
| Two devices push at once | Firestore retries the transaction, and each retry merges again. |
| Tab closed mid-push | Local still differs from the base, so it's pushed on the next open. |
| Token can't refresh | Status says "Sign in again". Local work continues. |
| Quota used up (`resource-exhausted`) | Back off until the next day. The app is unaffected. |
| Document too large | Warning at 600 KB (see 3.1); a write over 1 MiB is rejected. |
| Outdated tab after a schema bump | It stops syncing and shows "Reload to update". The rules reject a lower `schema`. |
| Bug or wrong import removes data | The mass-deletion guard asks first; the 14 daily snapshots allow a restore. |
| Crash-screen reset | Clears the sync state too, so the device pulls again. |
| Clocks differ between devices | Affects only "newer side" picks for one record changed on two devices while out of contact. |
| Firebase outage | No sync; the app works locally. |

### Monitoring

There's no paging; it's a personal app.

- **Main signal:** the in-app sync status line.
- **Errors:** logged to the console with the Firestore error code.
- **Quota use:** the Firebase console's usage pages for Firestore and Hosting.

## 5. Options considered

### 5.1 Platform

| | **A. Firebase** (chosen) | B. Supabase + static host | C. Google Drive app folder + static host | D. Cloudflare Pages + Worker + D1 |
|---|---|---|---|---|
| Server code | None; security rules only | None; row-level security | None | A Worker API plus sessions |
| Google sign-in | Built in | Built in | Google Identity token client; hourly tokens | Built yourself (OAuth + sessions) |
| Free tier for a personal app | Spark: hard caps, no bill | Free projects pause after a week idle | The user's own Drive quota | Generous |
| Safe concurrent writes | Transactions | Postgres transactions | Up to you | D1 transactions |
| Client cost | 62 KB gzip, lazy | Similar | Small | Small |
| To learn | Rules, Firestore basics | SQL, RLS | Drive API, OAuth details | Workers, D1, OAuth, sessions |

**A** is the only option with sign-in, storage, rules and hosting in one free project and no server code. **B** comes closest, but an idle-paused database is a poor fit for an app used in bursts. **C** keeps data in the user's own Drive, but token handling and concurrency checks are on us. **D** gives the most control for the most code.

### 5.2 Sync model

| | Loses data? | Change to data model | Complexity |
|---|---|---|---|
| A. Whole-state last-write-wins | **Yes**: the phone's offline attempts vanish when the laptop pushes (fails F5) | None | Lowest |
| B. Per-record `updatedAt` + tombstones (ADR-001 item 5) | No | Every record type, every store action, `normalize()`, backups; tombstones kept or garbage-collected | High |
| **C. Three-way merge against the base** (chosen) | No | **None** | One pure function and a saved base |
| D. Firestore as the store (full SDK, a document per record) | No | zustand persist replaced; Firestore in every action; signed-out mode needs a second path | High, plus 173 KB |

**C** gets B's correctness without touching the model. Deletions come out of the diff against the base, and the conflict rules live in one tested function. Its costs:

- a second copy of the data in localStorage (about 350 KB a year, against a quota of about 5 MB);
- "newer side" decided per device rather than per record.

### 5.3 Document layout

- **One document (chosen):** a pull costs one read.
- **One document per problem and per attempt:** a full pull costs 250+ reads per device, and incremental pulls need a per-record `updatedAt`, which is option B again.
- **When to revisit:** only when the document size forces it (3.1).

## 6. Consequences

**Easier**

- The same data is on every device, and Safari clearing storage no longer loses progress.
- The merge is a pure function, tested like the rest of `lib/`.
- Backups have the same format before and after sync.

**Harder**

- Each device keeps two copies (the data and the base) that must stay paired. Sign-out and reset must clear the base.
- Every schema change has to keep old remote documents readable (`normalize()` already does) and bump `STORAGE_VERSION`, so outdated tabs stop syncing.
- Deploys now matter: a broken build is live on every device.

**Revisit when**

| Trigger | Change |
|---|---|
| Document over 600 KB | gzip `data`, or move attempts into one document per year |
| Download volume over half the quota | Check `rev` in a small meta document before the full pull |
| Want live updates between open devices | `onSnapshot` on the meta document |
| Friends start using it | App Check, maybe an email allowlist |
| Real same-record conflicts show up | Per-record timestamps for notes only |
| Want it to open offline on the phone | A PWA: service worker and manifest |

## 7. Action items

**Phase 0: prerequisites, no Firebase (about half a day)**

1. [ ] Make tabs share one copy: rehydrate on `storage` events. This fixes today's two-tab overwrite.
2. [ ] Add `src/lib/domain/merge.ts` (`merge3`) and `merge.test.ts`.
3. [ ] Make the crash-screen reset also clear `leetcode-tracker-sync`.

**Phase 1: hosting (about an hour; can ship before sync)**

4. [ ] Create the Firebase project (Spark), add `firebase.json` and `npm run deploy`, and check the headers.
5. [ ] Until Phase 2 ships, the only backup is Export, and Safari can wipe a site's storage after 7 days without a visit.

**Phase 2: sign-in and sync (about 2 days)**

6. [ ] Install `firebase@13.0.0`, add `src/lib/sync/*` (lazy) and `src/lib/store/sync-store.ts`.
7. [ ] Add `firestore.rules` and `firestore.indexes.json` (exempt `data`).
8. [ ] Add the first-link dialog, the status line in the Backup section, and the schema and mass-deletion guards.
9. [ ] Write engine tests with an in-memory `RemoteStore`. Rules tests against the emulator come with the integration-test setup.

**Phase 3: safety net (about half a day)**

10. [ ] Add the daily snapshot ring and a "Restore from cloud" list in the Backup section.

**Later, optional:** a PWA, and deploys with preview channels from GitHub Actions.

## 8. Open questions

1. **Who can sign in?** Anyone, each with their own data (the default; Spark keeps the cost at $0), or only you, via an allowlist in the rules?
2. **Domain:** the free `<project>.web.app`, or a custom domain?
3. **Should the running timer sync?** Start it on the laptop and see it on the phone. Default: yes, the newer side wins.

## References

- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans): Spark quotas and what happens when they run out
- [Firestore Lite Web SDK](https://firebase.google.com/docs/firestore/solutions/firestore-lite): what Lite leaves out (`onSnapshot`, persistence, bundles)
- [Best practices for signInWithRedirect](https://firebase.google.com/docs/auth/web/redirect-best-practices): setting `authDomain` on Firebase Hosting
- Bundle sizes measured on 2026-10-26 with `firebase@13.0.0`, Vite 8.3.4, `gzip -9`
