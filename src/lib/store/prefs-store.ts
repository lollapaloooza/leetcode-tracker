import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/_consts/storage'

/** What Start does: ask where to solve the problem, open one site straight away, or only start the timer. */
export type StartOpens = 'ask' | 'leetcode' | 'neetcode' | 'nothing'

const START_OPENS: readonly StartOpens[] = ['ask', 'leetcode', 'neetcode', 'nothing']

interface PrefsState {
  startOpens: StartOpens
  setStartOpens: (value: StartOpens) => void
}

/**
 * Preferences for this device only, like the theme: not in backups and never synced, since your
 * phone and your laptop may well want different answers.
 */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      startOpens: 'ask',
      setStartOpens: (startOpens) => set({ startOpens }),
    }),
    {
      name: STORAGE_KEYS.prefs,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ startOpens: s.startOpens }),
      merge: (persisted, current) => {
        const saved = (persisted as Partial<PrefsState> | undefined)?.startOpens
        return { ...current, startOpens: START_OPENS.includes(saved as StartOpens) ? (saved as StartOpens) : current.startOpens }
      },
    },
  ),
)
