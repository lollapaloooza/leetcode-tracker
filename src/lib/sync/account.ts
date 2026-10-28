import { useAccount, type Account } from '@/lib/store'
import { clearMeta, openMeta } from './meta'

/** What the account code needs from a sign-in provider: Firebase in the app, a fake in tests. */
export interface AuthClient {
  /** Calls back with the signed-in account, or null, now and after every change. Returns a way to stop. */
  onUserChanged(callback: (account: Account | null) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
}

/** Keeps the account store, and the uid saved for the next visit, in step with the provider. */
export function watchAccount(client: AuthClient) {
  return client.onUserChanged((account) => {
    // Signing out forgets the account and its sync state; the progress stays on this device.
    if (account) openMeta(account.uid)
    else clearMeta()
    // The provider reports "nobody" once it has loaded, which can land while the popup is still open.
    useAccount.setState((s) => ({ account, status: account ? 'signed-in' : s.status === 'signing-in' ? 'signing-in' : 'signed-out' }))
  })
}

export async function signInWith(client: AuthClient) {
  useAccount.setState({ status: 'signing-in', error: null })
  try {
    await client.signIn() // watchAccount picks up the account
  } catch (error) {
    useAccount.setState((s) => ({ status: s.account ? 'signed-in' : 'signed-out', error: signInError(error) }))
  }
}

export async function signOutWith(client: AuthClient) {
  try {
    await client.signOut()
  } catch (error) {
    console.error('Sign-out failed', error)
  }
}

/** Closing the popup is changing your mind, not an error. */
const CANCELLED = new Set(['auth/popup-closed-by-user', 'auth/cancelled-popup-request', 'auth/user-cancelled'])

// Short and plain (ASD-STE100 style). The console gets the full error for the owner.
const MESSAGES: Record<string, string> = {
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site.',
  'auth/network-request-failed': 'No connection. Try again when you are online.',
  'auth/unauthorized-domain': 'Sign-in is not set up for this address.',
  'auth/operation-not-allowed': 'Google sign-in is off for this app.',
}

/** What to tell the person when sign-in fails, or null when they closed the popup. */
export function signInError(error: unknown): string | null {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (CANCELLED.has(code)) return null
  console.error('Sign-in failed', error)
  return MESSAGES[code] ?? 'Sign-in failed. Try again.'
}
