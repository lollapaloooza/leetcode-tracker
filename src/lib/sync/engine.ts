import { STORAGE_VERSION, useTracker } from '@/lib/store'
import type { TrackerData } from '@/types'
import { blankFor, changedItemIds, itemsOf, meaningful, same, withItems, type Items } from './items'
import { openMeta, writeMeta, type SyncMeta } from './meta'

/** One item as the cloud holds it. `data: null` marks an item that some device deleted. */
export interface RemoteItem {
  id: string
  data: unknown
  /** `STORAGE_VERSION` of the app that wrote it */
  schema: number
  /** Server time of the write, in ms */
  updatedAt: number
}

/** The cloud, as the engine needs it: Firestore in the app, a map in tests. */
export interface RemoteStore {
  /** Items written after `since` (server ms), or every item when `since` is null. */
  changedSince(uid: string, since: number | null): Promise<RemoteItem[]>
  /** Writes these items (`null` data: deleted), stamped with the server's time. */
  write(uid: string, items: { id: string; data: unknown }[]): Promise<void>
}

export type Choice = 'cloud' | 'device'

export interface SyncHooks {
  /** This device and the cloud have different progress: which to keep? null: not now, ask on the next visit. */
  ask(sides: { cloud: TrackerData; device: TrackerData }): Promise<Choice | null>
  /** Another device wrote data from a newer version of the app: this one stops until it reloads. */
  newVersion(): void
}

export interface SyncEngine {
  readonly uid: string
  stop(): void
}

const PUSH_DELAY = 2_000
const RETRY_DELAY = 30_000
/** Coming back to the tab pulls again only after this long. */
const PULL_GAP = 30_000
/** Each pull also looks this far back, in case a write landed with a slightly older server time. */
const OVERLAP = 2_000

const newest = (items: RemoteItem[], since: number | null) => items.reduce<number | null>((max, i) => Math.max(max ?? 0, i.updatedAt), since)
/** What Firestore can store: JSON without `undefined`. */
const plain = (value: unknown): unknown => (value === null || value === undefined ? null : JSON.parse(JSON.stringify(value)))

/**
 * Keeps the store and the cloud in step for one signed-in account (ADR-006):
 * - **Up:** a change marks the items it touched; 2 s later they're uploaded. The marks are saved, so
 *   nothing is lost offline or when the tab closes.
 * - **Down:** on start, when the tab comes back and when the device is back online, it fetches the
 *   items written since the last time. A local change not yet uploaded wins over a fetched one.
 * - **First sign-in on this device:** both sides are kept, unless an item differs; then `hooks.ask` decides.
 */
export function startEngine(uid: string, remote: RemoteStore, hooks: SyncHooks): SyncEngine {
  let meta: SyncMeta = openMeta(uid)
  const dirty = new Set(meta.dirty)
  let stopped = false
  let applying = false
  let lastPull = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let queue: Promise<void> = Promise.resolve()

  const state = (): TrackerData => useTracker.getState()
  const save = () => {
    if (!stopped) writeMeta((meta = { ...meta, dirty: [...dirty] }))
  }
  /** Fetched changes go into the store without counting as changes made here. */
  const apply = (next: TrackerData) => {
    applying = true
    try {
      useTracker.setState(next)
    } finally {
      applying = false
    }
  }

  /** One step at a time. A failure (offline, say) is logged and tried again later. */
  const run = (step: () => Promise<void>) =>
    (queue = queue
      .then(() => (stopped ? undefined : step()))
      .catch((error: unknown) => {
        console.error('Sync failed', error)
        schedule(cycle, RETRY_DELAY)
      }))
  const schedule = (step: () => Promise<void>, ms: number) => {
    clearTimeout(timer)
    timer = setTimeout(() => void run(step), ms)
  }

  /** A newer app wrote some of these: stop here, and say so once. */
  const tooNew = (items: RemoteItem[]) => {
    if (!items.some((i) => i.schema > STORAGE_VERSION)) return false
    stop()
    hooks.newVersion()
    return true
  }

  async function link() {
    const cloud = await remote.changedSince(uid, null)
    if (stopped || tooNew(cloud)) return
    const cloudItems: Items = new Map(cloud.filter((i) => i.data !== null).map((i) => [i.id, i.data]))
    const theirs = meaningful(cloudItems)
    const ours = meaningful(itemsOf(state()))
    const conflict = [...ours].some(([id, value]) => theirs.has(id) && !same(value, theirs.get(id)))

    let keep: Choice | 'both' = 'both'
    if (conflict) {
      const choice = await hooks.ask({ cloud: withItems(blankFor(state()), cloudItems), device: state() })
      if (stopped) return
      if (!choice) return stop()
      keep = choice
    }
    if (keep === 'cloud') {
      apply(withItems(blankFor(state()), cloudItems))
      dirty.clear()
    } else if (keep === 'device') {
      // Make the cloud a copy of this device: every item here, and "deleted" for the rest.
      for (const id of new Set([...itemsOf(state()).keys(), ...cloudItems.keys()])) dirty.add(id)
    } else {
      const missing = [...theirs].filter(([id]) => !ours.has(id))
      if (missing.length > 0) apply(withItems(state(), missing))
      for (const id of ours.keys()) if (!theirs.has(id)) dirty.add(id)
    }
    meta = { ...meta, linked: true, pulledTo: newest(cloud, null) }
    save()
  }

  async function pull() {
    const changed = await remote.changedSince(uid, meta.pulledTo === null ? null : meta.pulledTo - OVERLAP)
    lastPull = Date.now()
    if (stopped || tooNew(changed)) return
    const local = itemsOf(state())
    const updates = changed.filter((i) => !dirty.has(i.id) && !same(local.get(i.id) ?? null, i.data)).map((i) => [i.id, i.data] as const)
    if (updates.length > 0) apply(withItems(state(), updates))
    meta = { ...meta, pulledTo: newest(changed, meta.pulledTo) }
    save()
  }

  async function push() {
    if (!meta.linked || dirty.size === 0) return
    const items = itemsOf(state())
    const writes = [...dirty].map((id) => ({ id, data: plain(items.get(id)) }))
    await remote.write(uid, writes)
    if (stopped) return
    // Changed again while uploading: keep the mark. That change already scheduled the next upload.
    const now = itemsOf(state())
    for (const w of writes) if (same(now.get(w.id) ?? null, w.data)) dirty.delete(w.id)
    save()
  }

  async function cycle() {
    if (meta.linked) await pull()
    else await link()
    await push()
  }

  const unsubscribe = useTracker.subscribe((next, prev) => {
    if (applying || stopped) return
    const ids = changedItemIds(prev, next)
    if (ids.length === 0) return
    for (const id of ids) dirty.add(id)
    save()
    if (meta.linked) schedule(push, PUSH_DELAY)
  })

  const flush = () => {
    clearTimeout(timer)
    void run(push)
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') flush()
    else if (Date.now() - lastPull >= PULL_GAP) void run(cycle)
  }
  const onOnline = () => void run(cycle)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('online', onOnline)
  window.addEventListener('pagehide', flush)

  // No save here: signing out clears the saved state just before this runs.
  function stop() {
    if (stopped) return
    stopped = true
    unsubscribe()
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('online', onOnline)
    window.removeEventListener('pagehide', flush)
  }

  void run(cycle)
  return { uid, stop }
}
