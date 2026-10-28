import { whenIdle } from '@/lib/_utils/lazy'
import { useAccount } from '@/lib/store'

type SyncModule = typeof import('./index')

let loaded: SyncModule | undefined
let pending: Promise<SyncModule> | undefined

/** The account and sync code, with Firebase, in its own chunk: only people who sign in download it. */
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

/** Signed in on an earlier visit: restore the session once the page is idle. */
export function resumeSync() {
  if (useAccount.getState().status === 'checking') whenIdle(() => withSync((sync) => sync.startSync()))
}
