import { SearchIcon, Settings2Icon } from 'lucide-react'
import { PythonIcon } from '@/components/PythonIcon'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { useUI } from '@/lib/store'
import { MainNav } from './MainNav'
import { ThemeToggle } from './ThemeToggle'
import { TimerPill } from './TimerPill'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
// Button labels make way for the tabs where both share one row (lg, before xl's extra room).
const LABEL = 'max-sm:hidden lg:max-xl:hidden'

/**
 * Title, tabs and tools. The tabs sit between the two on wide screens and wrap onto a row of their
 * own below `lg`; phones have the tab bar at the bottom instead, and keep only Search and Settings.
 */
export function TopBar({ today }: { today: string }) {
  const setPaletteOpen = useUI((s) => s.setPaletteOpen)
  const setPythonOpen = useUI((s) => s.setPythonOpen)
  const setSettingsOpen = useUI((s) => s.setSettingsOpen)
  const shortcut = `${isMac ? '⌘' : 'Ctrl'} K`

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 px-5 max-sm:px-4">
        <div className="flex h-14 min-w-0 items-center gap-2.5">
          <Logo />
          <span className="truncate font-semibold tracking-tight">LeetCode Tracker</span>
          <span className="hidden text-[13px] text-muted-foreground md:max-lg:inline">NeetCode 250</span>
        </div>
        <MainNav today={today} className="order-last w-full max-sm:hidden lg:order-none lg:w-auto" />
        <div className="ml-auto flex items-center gap-2">
          <TimerPill />
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground max-sm:size-9"
            aria-label={`Search (${shortcut})`}
            onClick={() => setPaletteOpen(true)}
          >
            <SearchIcon />
            <span className={LABEL}>Search</span>
            <Kbd className="max-md:hidden lg:max-xl:hidden">{shortcut}</Kbd>
          </Button>
          {/* On phones the cheatsheet is in Search (⌘K), and the theme in Settings. */}
          <Button variant="outline" size="sm" className="max-sm:hidden" onClick={() => setPythonOpen(true)} aria-label="Open Python cheatsheet">
            <PythonIcon />
            <span className={LABEL}>Python</span>
          </Button>
          <ThemeToggle className="max-sm:hidden" />
          <Button
            variant="outline"
            size="icon-sm"
            className="text-muted-foreground max-sm:size-9"
            aria-label="Settings"
            title="Settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2Icon />
          </Button>
        </div>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-6 shrink-0" aria-hidden>
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
