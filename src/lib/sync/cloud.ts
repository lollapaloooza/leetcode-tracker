import { startEngine, type SyncHooks } from './engine'
import { firestoreRemote } from './remote'

/** Sync with Firestore for `uid`. Its own chunk: only signed-in people download the database code. */
export function startCloudSync(uid: string, hooks: SyncHooks) {
  return startEngine(uid, firestoreRemote, hooks)
}
