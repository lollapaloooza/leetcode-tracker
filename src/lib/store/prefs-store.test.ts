// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { usePrefs } from './prefs-store'

const save = (state: unknown) => localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify({ state, version: 1 }))

describe('usePrefs', () => {
  beforeEach(() => {
    localStorage.clear()
    usePrefs.setState(usePrefs.getInitialState(), true)
  })

  it('saves what Start opens on this device, and reads it back', async () => {
    usePrefs.getState().setStartOpens('leetcode')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.prefs)!).state).toEqual({ startOpens: 'leetcode' })

    save({ startOpens: 'neetcode' })
    await usePrefs.persist.rehydrate()
    expect(usePrefs.getState().startOpens).toBe('neetcode')
  })

  it('falls back to asking when the saved value is unknown', async () => {
    save({ startOpens: 'hackerrank' })
    await usePrefs.persist.rehydrate()
    expect(usePrefs.getState().startOpens).toBe('ask')
  })
})
