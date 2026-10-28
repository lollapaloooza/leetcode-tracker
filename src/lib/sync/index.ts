// Accounts and sync (ADR-002, ADR-006). This is its own chunk with Firebase in it: reach it through
// `loadSync()` / `withSync()` in './load', never with a static import.
import { useAccount, useUI } from '@/lib/store'
import { signInWith, signOutWith, watchAccount } from './account'
import { firebaseAuth } from './auth'
import type { Choice, SyncEngine, SyncHooks } from './engine'

let watching = false
let engine: SyncEngine | null = null
/** The account sync is for, while its code loads too */
let syncing: string | null = null
let answer: ((choice: Choice | null) => void) | null = null

const hooks: SyncHooks = {
  ask: (sides) =>
    new Promise((resolve) => {
      answer = resolve
      useAccount.setState({ choice: sides })
    }),
  newVersion: () =>
    useUI.getState().showToast({ text: 'A new version is available. Reload the page.', action: { label: 'Reload', run: () => location.reload() } }),
}

/** Sync runs for whoever is signed in, and stops on sign-out. */
function follow(uid: string | null) {
  if (syncing === uid) return
  engine?.stop()
  engine = null
  syncing = uid
  answerChoice(null)
  if (uid) startCloud(uid)
}

/** The database code loads only now, for a signed-in account. Offline, it tries again once back online. */
function startCloud(uid: string) {
  import('./cloud').then(
    ({ startCloudSync }) => {
      if (syncing === uid && !engine) engine = startCloudSync(uid, hooks)
    },
    (error: unknown) => {
      console.error('Sync failed to load', error)
      window.addEventListener('online', () => syncing === uid && !engine && startCloud(uid), { once: true })
    },
  )
}

/** Restores an earlier sign-in, then follows every sign-in and sign-out. */
export function startSync() {
  if (watching) return
  watching = true
  watchAccount(firebaseAuth)
  follow(useAccount.getState().account?.uid ?? null)
  useAccount.subscribe((s) => follow(s.account?.uid ?? null))
}

export function signIn() {
  startSync()
  return signInWith(firebaseAuth)
}

export function signOut() {
  return signOutWith(firebaseAuth)
}

/** The answer to "this device or the cloud?"; null puts the question off until the next visit. */
export function answerChoice(choice: Choice | null) {
  if (useAccount.getState().choice) useAccount.setState({ choice: null })
  const pending = answer
  answer = null
  pending?.(choice)
}
