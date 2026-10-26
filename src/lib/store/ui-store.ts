import { create } from 'zustand'
import type { Site } from '@/lib/domain'

export type Tab = 'today' | 'all' | 'patterns' | 'history'

export interface LogTarget {
  id: number
  /** Editing an existing attempt instead of logging a new one */
  editKey?: string
}

/** A short message at the bottom of the screen, often with a way to undo what just happened. */
export interface Toast {
  id: number
  text: string
  action?: { label: string; run: () => void }
}

/** How long a highlighted row glows after it lands somewhere new. */
const HIGHLIGHT_MS = 1400

interface UIState {
  tab: Tab
  setTab: (tab: Tab) => void
  log: LogTarget | null
  openLog: (target: LogTarget) => void
  closeLog: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  /** Problem whose details & attempt history are open in the side drawer */
  detailFor: number | null
  openDetail: (id: number) => void
  closeDetail: () => void
  pythonOpen: boolean
  setPythonOpen: (open: boolean) => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  shortOnTimeOpen: boolean
  setShortOnTimeOpen: (open: boolean) => void
  calendarOpen: boolean
  setCalendarOpen: (open: boolean) => void
  /** Problem whose Start drawer ("open it on LeetCode or NeetCode?") is open */
  startFor: number | null
  openStart: (id: number) => void
  closeStart: () => void
  /** Where the problem on the clock was opened, so the Now card links back to the same site */
  openedOn: { id: number; site: Site } | null
  setOpenedOn: (opened: { id: number; site: Site } | null) => void
  /** Day the Now card was emptied by hand (✕ or stop); the next problem waits until you start one */
  focusClearedOn: string | null
  clearFocus: (today: string) => void
  restoreFocus: () => void
  toast: Toast | null
  showToast: (toast: Omit<Toast, 'id'>) => void
  dismissToast: (id: number) => void
  /** A row that just landed somewhere (put back, added, finished) glows for a moment */
  highlighted: number | null
  highlight: (id: number) => void
}

let toastIds = 0

/** Session-only UI state shared across components (not persisted). */
export const useUI = create<UIState>()((set, get) => ({
  tab: 'today',
  setTab: (tab) => set({ tab }),
  log: null,
  openLog: (log) => set({ log }),
  closeLog: () => set({ log: null }),
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  detailFor: null,
  openDetail: (detailFor) => set({ detailFor }),
  closeDetail: () => set({ detailFor: null }),
  pythonOpen: false,
  setPythonOpen: (pythonOpen) => set({ pythonOpen }),
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  shortOnTimeOpen: false,
  setShortOnTimeOpen: (shortOnTimeOpen) => set({ shortOnTimeOpen }),
  calendarOpen: false,
  setCalendarOpen: (calendarOpen) => set({ calendarOpen }),
  startFor: null,
  openStart: (startFor) => set({ startFor }),
  closeStart: () => set({ startFor: null }),
  openedOn: null,
  setOpenedOn: (openedOn) => set({ openedOn }),
  focusClearedOn: null,
  clearFocus: (today) => set({ focusClearedOn: today }),
  restoreFocus: () => set({ focusClearedOn: null }),
  toast: null,
  showToast: (toast) => set({ toast: { ...toast, id: ++toastIds } }),
  dismissToast: (id) => set((s) => (s.toast?.id === id ? { toast: null } : s)),
  highlighted: null,
  highlight: (id) => {
    set({ highlighted: id })
    setTimeout(() => {
      if (get().highlighted === id) set({ highlighted: null })
    }, HIGHLIGHT_MS)
  },
}))
