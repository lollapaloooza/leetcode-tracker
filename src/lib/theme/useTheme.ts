import { useSyncExternalStore } from 'react'
import { chooseTheme, currentTheme, subscribeTheme, themeChoice } from './theme'

/** The theme on screen, what you chose (a theme or "system"), and ways to change it. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme)
  const choice = useSyncExternalStore(subscribeTheme, themeChoice)
  return { theme, choice, chooseTheme, toggleTheme: () => chooseTheme(theme === 'dark' ? 'light' : 'dark') }
}
