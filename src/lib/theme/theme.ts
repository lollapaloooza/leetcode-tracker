// Light/dark theme without React. The `dark` class on <html> is the source of truth: the inline
// script in index.html sets it before first paint and flips it when the OS theme changes.
import { STORAGE_KEYS } from '@/lib/_consts/storage'

export type Theme = 'light' | 'dark'

const root = () => document.documentElement

export const currentTheme = (): Theme => (root().classList.contains('dark') ? 'dark' : 'light')

/** Apply a theme and remember it as the user's choice, which wins over the OS from then on. */
export function setTheme(next: Theme) {
  root().classList.toggle('dark', next === 'dark')
  try {
    localStorage.setItem(STORAGE_KEYS.theme, next)
  } catch {
    // Private mode or blocked storage: the choice just won't survive a reload.
  }
}

/** Calls `onChange` whenever the theme changes, whoever changed it. Returns the unsubscribe. */
export function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(root(), { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
