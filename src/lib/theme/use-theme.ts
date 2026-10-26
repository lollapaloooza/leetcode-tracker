import { useSyncExternalStore } from 'react'
import { currentTheme, setTheme, subscribeTheme } from './theme'

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme)
  return { theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
