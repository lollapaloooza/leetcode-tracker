import { create } from 'zustand'

export type Tab = 'today' | 'all' | 'patterns' | 'history'

export interface LogTarget {
  id: number
  /** Editing an existing attempt instead of logging a new one */
  editKey?: string
}

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
}

/** Session-only UI state shared across components (not persisted). */
export const useUI = create<UIState>()((set) => ({
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
}))
