import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

/** Also read by the inline script in index.html, which applies the theme before first paint. */
const STORAGE_KEY = 'leetcode-tracker-theme'

const root = () => document.documentElement

function subscribe(onChange: () => void) {
  // The `dark` class is the source of truth — it's also flipped by the OS-theme listener in index.html.
  const observer = new MutationObserver(onChange)
  observer.observe(root(), { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}

const getTheme = (): Theme => (root().classList.contains('dark') ? 'dark' : 'light')

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme)
  const setTheme = (next: Theme) => {
    root().classList.toggle('dark', next === 'dark')
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Private mode or blocked storage: the choice just won't survive a reload.
    }
  }
  return { theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
