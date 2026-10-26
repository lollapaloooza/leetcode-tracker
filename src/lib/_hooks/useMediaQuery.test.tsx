import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useMediaQuery } from './useMediaQuery'

/** A media query list we can flip, like a window being resized past a breakpoint. */
function fakeMediaQuery(initially: boolean) {
  const listeners = new Set<() => void>()
  const list = {
    matches: initially,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(list as unknown as MediaQueryList)
  return {
    listeners,
    flip(matches: boolean) {
      list.matches = matches
      listeners.forEach((fn) => fn())
    },
  }
}

describe('useMediaQuery', () => {
  it('follows the query as it starts and stops matching', () => {
    const media = fakeMediaQuery(false)
    const { result } = renderHook(() => useMediaQuery('(min-width: 64rem)'))
    expect(result.current).toBe(false)

    act(() => media.flip(true))
    expect(result.current).toBe(true)
    act(() => media.flip(false))
    expect(result.current).toBe(false)
  })

  it('stops listening once unmounted', () => {
    const media = fakeMediaQuery(true)
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 64rem)'))
    expect(media.listeners.size).toBe(1)
    unmount()
    expect(media.listeners.size).toBe(0)
  })
})
