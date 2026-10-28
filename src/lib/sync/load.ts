import { whenIdle } from '@/lib/_utils/lazy'
import { useAccount } from '@/lib/store'

type SyncModule = typeof import('./index')

let loaded: SyncModule | undefined
let pending: Promise<SyncModule> | undefined

/** The sign-in code, with Firebase Auth, in its own chunk: never part of the first screen. */
export function loadSync(): Promise<SyncModule> {
  return (pending ??= import('./index').then(
    (sync) => (loaded = sync),
    (error: unknown) => {
      pending = undefined // offline, or a deploy replaced the chunk: try again next time
      throw error
    },
  ))
}

/**
 * Runs `run` with the sync module. When it's already loaded that happens right away, inside the
 * click that asked for it, so the browser doesn't block the sign-in popup.
 */
export function withSync(run: (sync: SyncModule) => unknown) {
  if (loaded) {
    run(loaded)
    return
  }
  loadSync().then(run, () =>
    useAccount.setState((s) => ({
      status: s.account ? 'signed-in' : 'signed-out',
      error: 'Cannot load sign-in. Try again.',
    })),
  )
}

/**
 * Once the page is idle, start sign-in on every visit, so a session Firebase still has comes back by
 * itself, even when this device forgot it was signed in (cleared storage, the crash-screen reset).
 * Offline, a visit that was signed in before says so; otherwise it stays quiet until Sign in.
 */
export function resumeSync() {
  whenIdle(() =>
    loadSync().then(
      (sync) => sync.startSync(),
      () => {
        if (useAccount.getState().status === 'checking') useAccount.setState({ status: 'signed-out', error: 'Cannot load sign-in. Try again.' })
      },
    ),
  )
}
