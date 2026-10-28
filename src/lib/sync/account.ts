import { saveUid, useAccount, type Account } from '@/lib/store'

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
    saveUid(account?.uid ?? null)
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

const MESSAGES: Record<string, string> = {
  'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups for this site, then try again.',
  'auth/network-request-failed': 'Couldn’t reach Google. Check your connection, then try again.',
  'auth/unauthorized-domain': 'This address can’t sign in yet. Add it in the Firebase console under Authentication › Settings › Authorized domains.',
  'auth/operation-not-allowed': 'Google sign-in is turned off for this project. Turn it on in the Firebase console under Authentication › Sign-in method.',
}

/** What to tell the person when sign-in fails, or null when they closed the popup. */
export function signInError(error: unknown): string | null {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  if (CANCELLED.has(code)) return null
  if (!(code in MESSAGES)) console.error('Sign-in failed', error)
  return MESSAGES[code] ?? 'Sign-in didn’t work. Try again in a moment.'
}
