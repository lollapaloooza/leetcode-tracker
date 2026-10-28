import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore/lite'
import { STORAGE_VERSION } from '@/lib/store'
import { app } from './app'
import { withEmulators } from './config'
import type { RemoteItem, RemoteStore } from './engine'

// Firestore Lite: plain reads and writes, a third the size of the full SDK. The store and the engine
// already do what its offline cache and live updates would.
const db = getFirestore(app)
if (withEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080)

/** Each person's items: `users/{uid}/items/{item}` (rules in firestore.rules). */
const itemsOf = (uid: string) => collection(db, 'users', uid, 'items')
/** Firestore takes at most 500 writes in one batch. */
const BATCH = 450

export const firestoreRemote: RemoteStore = {
  async changedSince(uid, since) {
    const items = itemsOf(uid)
    const changed = since === null ? query(items) : query(items, where('updatedAt', '>', Timestamp.fromMillis(since)), orderBy('updatedAt'))
    const snapshot = await getDocs(changed)
    return snapshot.docs.map((d): RemoteItem => {
      const { data, schema, updatedAt } = d.data()
      return {
        id: d.id,
        data: data ?? null,
        schema: typeof schema === 'number' ? schema : 0,
        updatedAt: updatedAt instanceof Timestamp ? updatedAt.toMillis() : 0,
      }
    })
  },

  async write(uid, items) {
    for (let start = 0; start < items.length; start += BATCH) {
      const batch = writeBatch(db)
      for (const { id, data } of items.slice(start, start + BATCH)) {
        batch.set(doc(itemsOf(uid), id), { data, schema: STORAGE_VERSION, updatedAt: serverTimestamp() })
      }
      await batch.commit()
    }
  },
}
