// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { useAccount, useUI, type Account } from '@/lib/store'
import type { SyncHooks } from './engine'

// Firebase stays out: a sign-in provider the test drives, and an engine that records how it's used.
const auth = vi.hoisted(() => ({ report: (_: unknown) => {} }))
vi.mock('./auth', () => ({
  firebaseAuth: {
    onUserChanged: (callback: (account: unknown) => void) => {
      auth.report = callback
      return () => {}
    },
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => auth.report(null)),
  },
}))
vi.mock('./remote', () => ({ firestoreRemote: {} }))
const engines = vi.hoisted(() => [] as { uid: string; stop: ReturnType<typeof vi.fn>; hooks: SyncHooks }[])
vi.mock('./engine', () => ({
  startEngine: vi.fn((uid: string, _remote: unknown, hooks: SyncHooks) => {
    const engine = { uid, stop: vi.fn(), hooks }
    engines.push(engine)
    return engine
  }),
}))

const ada: Account = { uid: 'u1', name: 'Ada', email: 'ada@example.com', photo: null }

describe('sync wiring', () => {
  beforeEach(() => {
    localStorage.clear()
    engines.length = 0
    useAccount.setState(useAccount.getInitialState(), true)
  })

  it('syncs for whoever signs in, and stops and forgets on sign-out', async () => {
    const { startSync, signOut } = await import('./index')
    startSync()
    auth.report(ada)
    // The database code loads only now, for the signed-in account.
    await vi.waitFor(() => expect(engines.map((e) => e.uid)).toEqual(['u1']))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.sync)!)).toMatchObject({ uid: 'u1' })

    await signOut()
    expect(engines[0].stop).toHaveBeenCalledOnce()
    expect(localStorage.getItem(STORAGE_KEYS.sync)).toBeNull()
  })

  it('puts the question on screen, and passes the answer back', async () => {
    const { startSync, answerChoice } = await import('./index')
    startSync()
    auth.report(ada)
    await vi.waitFor(() => expect(engines).toHaveLength(1))
    const sides = { cloud: TRACKER_DEFAULTS, device: TRACKER_DEFAULTS }
    const answer = engines.at(-1)!.hooks.ask(sides)
    expect(useAccount.getState().choice).toBe(sides)

    answerChoice('device')
    await expect(answer).resolves.toBe('device')
    expect(useAccount.getState().choice).toBeNull()
  })

  it('offers a reload when another device runs a newer version', async () => {
    const { startSync } = await import('./index')
    startSync()
    auth.report(ada)
    await vi.waitFor(() => expect(engines).toHaveLength(1))
    engines.at(-1)!.hooks.newVersion()
    expect(useUI.getState().toast).toMatchObject({ text: 'A new version is available. Reload the page.', action: { label: 'Reload' } })
  })
})
