import { STORAGE_KEYS } from '@/lib/_consts/storage'

/** What this device remembers about syncing, under `leetcode-tracker-sync`. */
export interface SyncMeta {
  uid: string
  /** Whether the first sign-in on this device was settled (both sides kept, or one chosen) */
  linked: boolean
  /** Server time (ms) of the newest item seen; the next pull asks only for items after it */
  pulledTo: number | null
  /** Items changed here and not yet uploaded */
  dirty: string[]
}

const fresh = (uid: string): SyncMeta => ({ uid, linked: false, pulledTo: null, dirty: [] })

/** This device's sync state for `uid`. Another account, or none yet, starts fresh. */
export function openMeta(uid: string): SyncMeta {
  const saved = read()
  if (saved?.uid === uid) return saved
  const meta = fresh(uid)
  writeMeta(meta)
  return meta
}

export function writeMeta(meta: SyncMeta) {
  try {
    localStorage.setItem(STORAGE_KEYS.sync, JSON.stringify(meta))
  } catch {
    // Blocked storage: sync still runs; this device just starts over on the next visit.
  }
}

/** Signed out: forget the account. The progress itself stays. */
export function clearMeta() {
  try {
    localStorage.removeItem(STORAGE_KEYS.sync)
  } catch {
    // Nothing saved to clear.
  }
}

function read(): SyncMeta | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.sync) ?? 'null')
    if (typeof raw !== 'object' || raw === null) return null
    const r = raw as Record<string, unknown>
    if (typeof r.uid !== 'string' || r.uid === '') return null
    return {
      uid: r.uid,
      linked: r.linked === true,
      pulledTo: typeof r.pulledTo === 'number' && Number.isFinite(r.pulledTo) ? r.pulledTo : null,
      dirty: Array.isArray(r.dirty) ? r.dirty.filter((d): d is string => typeof d === 'string') : [],
    }
  } catch {
    return null
  }
}
