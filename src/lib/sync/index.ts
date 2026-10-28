// Accounts now, and sync next (ADR-002). This is its own chunk with Firebase in it: reach it through
// `loadSync()` / `withSync()` in './load', never with a static import.
import { signInWith, signOutWith, watchAccount } from './account'
import { firebaseAuth } from './auth'

let watching = false

/** Restores an earlier sign-in, then follows every sign-in and sign-out. */
export function startSync() {
  if (watching) return
  watching = true
  watchAccount(firebaseAuth)
}

export function signIn() {
  startSync()
  return signInWith(firebaseAuth)
}

export function signOut() {
  return signOutWith(firebaseAuth)
}
