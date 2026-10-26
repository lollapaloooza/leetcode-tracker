import { CalendarCheckIcon, ChartColumnIcon, HistoryIcon, LayoutListIcon, NotebookPenIcon, type LucideIcon } from 'lucide-react'
import type { Tab } from '@/lib/store'

export interface NavTabInfo {
  value: Tab
  label: string
  icon: LucideIcon
  /** Its name below `lg`, where there's no sidebar and the tab carries the progress cards too */
  narrow?: { label: string; icon: LucideIcon }
}

/** The four tabs, as the header, the phone tab bar and ⌘K name them. */
export const NAV_TABS: NavTabInfo[] = [
  { value: 'today', label: 'Today', icon: CalendarCheckIcon },
  { value: 'all', label: 'Problems', icon: LayoutListIcon },
  { value: 'patterns', label: 'Patterns', icon: NotebookPenIcon },
  { value: 'history', label: 'History', icon: HistoryIcon, narrow: { label: 'Progress', icon: ChartColumnIcon } },
]
