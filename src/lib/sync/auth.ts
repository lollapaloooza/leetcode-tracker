import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import type { Account } from '@/lib/store'
import type { AuthClient } from './account'
import { app } from './app'
import { withEmulators } from './config'

// Only the pieces popup sign-in needs, which keeps the chunk small (ADR-002 §3.7).
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
})
if (withEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })

const google = new GoogleAuthProvider()
google.setCustomParameters({ prompt: 'select_account' }) // always ask which Google account

const toAccount = (user: User): Account => ({ uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL })

/**
 * Google sign-in through Firebase Auth. A popup rather than a redirect: it keeps the page (and any
 * running timer) where it was, and it works in browsers that block third-party storage.
 */
export const firebaseAuth: AuthClient = {
  onUserChanged: (callback) => onAuthStateChanged(auth, (user) => callback(user && toAccount(user))),
  signIn: async () => {
    await signInWithPopup(auth, google)
  },
  signOut: () => signOut(auth),
}
