import { create } from 'zustand'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import type { TrackerData } from '@/types'

/** The Google account someone signed in with. */
export interface Account {
  uid: string
  name: string | null
  email: string | null
  photo: string | null
}

/** `checking` while a sign-in from an earlier visit is restored; `signing-in` while the Google popup is open. */
export type AccountStatus = 'signed-out' | 'checking' | 'signing-in' | 'signed-in'

interface AccountState {
  status: AccountStatus
  account: Account | null
  /** Why the last sign-in failed, in words for the person. Null when it worked, or they closed the popup. */
  error: string | null
  /** First sign-in on this device, and its progress differs from the cloud's: both sides, to pick one */
  choice: { cloud: TrackerData; device: TrackerData } | null
}

/**
 * Who's signed in. Firebase itself loads in its own chunk (`@/lib/sync`), and only for people who
 * sign in: this store and the saved uid are all the first download knows about accounts.
 */
export const useAccount = create<AccountState>()(() => ({
  status: savedUid() ? 'checking' : 'signed-out',
  account: null,
  error: null,
  choice: null,
}))

/** The uid this device was last signed in with, so the next visit knows to restore the session. */
export function savedUid(): string | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEYS.sync) ?? 'null')
    if (typeof saved !== 'object' || saved === null || !('uid' in saved)) return null
    return typeof saved.uid === 'string' && saved.uid !== '' ? saved.uid : null
  } catch {
    return null // unreadable or blocked storage: treat it as signed out
  }
}
