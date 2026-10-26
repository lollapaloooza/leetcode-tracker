import {
  CalendarClockIcon,
  CalendarPlusIcon,
  MoonIcon,
  Settings2Icon,
  SparklesIcon,
  SunIcon,
  TargetIcon,
  ZapIcon,
} from 'lucide-react'
import { PythonIcon } from '@/components/PythonIcon'
import { NAV_TABS } from '@/components/shell/nav-tabs'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { addDays } from '@/lib/_utils/date'
import { useTracker, useUI } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import type { Run } from './useCommandPalette'

/** Where to go and what to do, before a problem is picked. */
export function RootCommands({ today, run }: { today: string; run: Run }) {
  const { theme, toggleTheme } = useTheme()
  const ui = useUI.getState()
  const suggestFor = (date: string) => () => {
    useTracker.getState().suggestForDay(date, today)
    ui.setTab('today')
  }

  return (
    <>
      <CommandGroup heading="Go to">
        {NAV_TABS.map(({ value, label, icon: Icon, narrow }) => (
          <CommandItem key={value} value={`go ${label} ${narrow?.label ?? ''}`} onSelect={() => run(() => ui.setTab(value))}>
            <Icon /> {label}
          </CommandItem>
        ))}
        <CommandItem value="python cheatsheet" onSelect={() => run(() => ui.setPythonOpen(true))}>
          <PythonIcon /> Python cheatsheet
        </CommandItem>
        <CommandItem value="settings routine goals backup export import theme" onSelect={() => run(() => ui.setSettingsOpen(true))}>
          <Settings2Icon /> Settings
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="Actions">
        <CommandItem value="suggest problems for today" onSelect={() => run(suggestFor(today))}>
          <SparklesIcon /> Suggest problems for today
        </CommandItem>
        <CommandItem value="short on time quick review watch note" onSelect={() => run(() => ui.setShortOnTimeOpen(true))}>
          <ZapIcon /> Short on time?
        </CommandItem>
        <CommandItem value="pick tomorrow's problems plan tomorrow" onSelect={() => run(suggestFor(addDays(today, 1)))}>
          <CalendarClockIcon /> Pick tomorrow's problems
        </CommandItem>
        <CommandItem value="add practice to calendar reminder ics" onSelect={() => run(() => ui.setCalendarOpen(true))}>
          <CalendarPlusIcon /> Add practice to calendar
        </CommandItem>
        <CommandItem value="set interview date" onSelect={() => run(() => ui.setSettingsOpen(true))}>
          <TargetIcon /> Set interview date
        </CommandItem>
        <CommandItem value="toggle theme dark light mode" onSelect={() => run(toggleTheme)}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />} Switch to {theme === 'dark' ? 'light' : 'dark'} theme
        </CommandItem>
      </CommandGroup>
    </>
  )
}
