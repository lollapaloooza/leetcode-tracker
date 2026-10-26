import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '@/lib/_consts/storage'
import { useTheme } from './useTheme'

const html = document.documentElement
const osPrefersDark = (dark: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: dark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }))

describe('useTheme', () => {
  it('follows the system until you choose', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.choice).toBe('system')
    expect(result.current.theme).toBe('light')
  })

  it('applies and remembers a fixed choice', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.chooseTheme('dark'))
    expect(html).toHaveClass('dark')
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
    expect(result.current).toMatchObject({ theme: 'dark', choice: 'dark' })
  })

  it('goes back to the OS theme and forgets the choice', () => {
    osPrefersDark(true)
    localStorage.setItem(STORAGE_KEYS.theme, 'light')
    const { result } = renderHook(() => useTheme())
    expect(result.current.choice).toBe('light')

    act(() => result.current.chooseTheme('system'))
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBeNull()
    expect(result.current).toMatchObject({ theme: 'dark', choice: 'system' })
  })

  it('updates when something else flips the class, like the OS listener in index.html', async () => {
    const { result } = renderHook(() => useTheme())
    await act(async () => html.classList.add('dark'))
    expect(result.current.theme).toBe('dark')
  })

  it('toggles to the other theme and makes it the choice', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggleTheme())
    expect(result.current).toMatchObject({ theme: 'dark', choice: 'dark' })
    act(() => result.current.toggleTheme())
    expect(result.current).toMatchObject({ theme: 'light', choice: 'light' })
  })
})
