import { useEffect } from 'react'
import { useUI } from '@/lib/store'

/** ⌘K / Ctrl+K toggles the command palette. Registered by the shell, so it works before the palette has loaded. */
export function usePaletteShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        const ui = useUI.getState()
        ui.setPaletteOpen(!ui.paletteOpen)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
