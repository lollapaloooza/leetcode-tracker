// Light/dark theme without React. The `dark` class on <html> is the source of truth: the inline
// script in index.html sets it before first paint and keeps following the OS until you choose.
import { STORAGE_KEYS } from '@/lib/_consts/storage'

export type Theme = 'light' | 'dark'
/** What you picked: a fixed theme, or whatever the OS uses. */
export type ThemeChoice = Theme | 'system'

const root = () => document.documentElement
const osTheme = (): Theme => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
// Choosing "system" may leave the class as it was, so choices also notify directly.
const listeners = new Set<() => void>()

export const currentTheme = (): Theme => (root().classList.contains('dark') ? 'dark' : 'light')

export function themeChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.theme)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** Apply a choice and remember it. "system" forgets the choice, so the OS theme applies again. */
export function chooseTheme(choice: ThemeChoice) {
  root().classList.toggle('dark', (choice === 'system' ? osTheme() : choice) === 'dark')
  try {
    if (choice === 'system') localStorage.removeItem(STORAGE_KEYS.theme)
    else localStorage.setItem(STORAGE_KEYS.theme, choice)
  } catch {
    // Private mode or blocked storage: the choice just won't survive a reload.
  }
  listeners.forEach((notify) => notify())
}

/** Calls `onChange` whenever the theme or the choice changes, whoever changed it. Returns the unsubscribe. */
export function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(root(), { attributes: true, attributeFilter: ['class'] })
  listeners.add(onChange)
  return () => {
    observer.disconnect()
    listeners.delete(onChange)
  }
}
