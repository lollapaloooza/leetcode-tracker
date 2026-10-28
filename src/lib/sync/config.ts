const env = import.meta.env

/**
 * The web app registered in the Firebase console, from `.env`. Sign-in uses a popup, which works
 * with the project's own auth domain in every browser, so `authDomain` needs no per-host setup.
 */
export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
}

/** Sign in against `npm run emulators` instead of the real project, so test accounts never touch it. */
export const withEmulators = env.VITE_USE_EMULATORS === 'true'
