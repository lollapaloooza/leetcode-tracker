// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { savedUid } from './account-store'

const save = (raw: string) => localStorage.setItem(STORAGE_KEYS.sync, raw)

describe('saved uid', () => {
  beforeEach(() => localStorage.clear())

  it('reads the uid that sync saved for this device', () => {
    save(JSON.stringify({ uid: 'u1', linked: true, pulledTo: 5, dirty: [] }))
    expect(savedUid()).toBe('u1')
    localStorage.removeItem(STORAGE_KEYS.sync)
    expect(savedUid()).toBeNull()
  })

  it.each(['not json', '"u1"', '{"uid":42}', '{"uid":""}', 'null'])('reads %s as signed out', (raw) => {
    save(raw)
    expect(savedUid()).toBeNull()
  })

  it('makes the next visit start by checking the sign-in', async () => {
    save(JSON.stringify({ uid: 'u1' }))
    vi.resetModules()
    const { useAccount } = await import('./account-store')
    expect(useAccount.getState().status).toBe('checking')
  })
})
