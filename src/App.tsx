import { useEffect } from 'react'
import { CalendarCheckIcon, HistoryIcon, LayoutListIcon, MoonIcon, NotebookPenIcon, SearchIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDialog } from '@/components/CalendarDialog'
import { CommandPalette } from '@/components/CommandPalette'
import { HistoryView } from '@/components/HistoryView'
import { LogAttemptDialog } from '@/components/LogAttemptDialog'
import { PatternsView } from '@/components/PatternsView'
import { ProblemSheet } from '@/components/ProblemSheet'
import { ProblemsView } from '@/components/ProblemsView'
import { PythonIcon } from '@/components/PythonIcon'
import { PythonSheet } from '@/components/PythonSheet'
import { ShortOnTimeDialog } from '@/components/ShortOnTimeDialog'
import { Sidebar } from '@/components/Sidebar'
import { LiveDot } from '@/components/TimerControls'
import { TodayView } from '@/components/TodayView'
import { PROBLEMS } from '@/data/problems'
import { formatDuration, useNow, useToday } from '@/lib/date'
import { useTheme } from '@/lib/theme'
import { timerElapsed, useTracker } from '@/store'
import { useUI, type Tab } from '@/ui-store'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function App() {
  const today = useToday()
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const plannedCount = useTracker((s) => s.plans[today]?.length ?? 0)
  const notesCount = useTracker((s) => Object.keys(s.notes).length)

  return (
    <div className="min-h-svh">
      <DocumentTitle />
      <TopBar />

      {/* Tasks get the main column; progress lives in a quiet sidebar (below the tasks on smaller screens). */}
      <div className="mx-auto grid max-w-6xl gap-8 px-5 pt-5 pb-14 max-sm:px-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10">
        <main className="min-w-0">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
            <TabsList variant="line" className="w-full justify-start gap-5 border-b px-0 max-sm:gap-4">
              <NavTab value="today" icon={CalendarCheckIcon} label="Today" count={plannedCount} />
              <NavTab value="all" icon={LayoutListIcon} label="All problems" shortLabel="Problems" />
              <NavTab value="patterns" icon={NotebookPenIcon} label="Patterns" count={notesCount} />
              <NavTab value="history" icon={HistoryIcon} label="History" />
            </TabsList>
            <TabsContent value="today">
              <TodayView today={today} />
            </TabsContent>
            <TabsContent value="all">
              <ProblemsView today={today} />
            </TabsContent>
            <TabsContent value="patterns">
              <PatternsView />
            </TabsContent>
            <TabsContent value="history">
              <HistoryView today={today} />
            </TabsContent>
          </Tabs>
        </main>

        <aside aria-label="Progress" className="lg:sticky lg:top-20 lg:self-start lg:pt-1">
          <Sidebar today={today} />
        </aside>
      </div>

      <ProblemSheet today={today} />
      <LogAttemptDialog today={today} />
      <CommandPalette today={today} />
      <PythonSheet />
      <ShortOnTimeDialog today={today} />
      <CalendarDialog />
    </div>
  )
}

/** GitHub UnderlineNav: muted icon, label, counter — coral underline on the active tab. */
function NavTab({
  value,
  icon: Icon,
  label,
  shortLabel,
  count,
}: {
  value: Tab
  icon: typeof SearchIcon
  label: string
  /** Used on phones, where all four tabs have to fit on one line */
  shortLabel?: string
  count?: number
}) {
  return (
    <TabsTrigger value={value} className="group/nav flex-none px-0 after:bg-nav-active">
      <Icon className="text-muted-foreground group-data-[state=active]/nav:text-foreground max-sm:hidden" />
      <span className={shortLabel ? 'max-sm:hidden' : undefined}>{label}</span>
      {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
      {count !== undefined && count > 0 && (
        <span className="min-w-[18px] rounded-full bg-muted px-1.5 text-[11px] leading-[18px] text-muted-foreground tabular-nums">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}

function TopBar() {
  const setPaletteOpen = useUI((s) => s.setPaletteOpen)
  const setPythonOpen = useUI((s) => s.setPythonOpen)
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-5 max-sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo />
          <span className="truncate font-semibold tracking-tight">LeetCode Tracker</span>
          <span className="text-[13px] text-muted-foreground max-sm:hidden">NeetCode 250</span>
        </div>
        <div className="flex items-center gap-2">
          <TimerPill />
          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground"
            aria-label={`Search (${isMac ? '⌘' : 'Ctrl'} K)`}
            onClick={() => setPaletteOpen(true)}
          >
            <SearchIcon />
            <span className="max-sm:hidden">Search</span>
            <Kbd className="max-sm:hidden">{isMac ? '⌘' : 'Ctrl'} K</Kbd>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPythonOpen(true)} aria-label="Open Python cheatsheet">
            <PythonIcon />
            <span className="max-sm:hidden">Python</span>
          </Button>
          <ThemeToggle />
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

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="relative text-muted-foreground"
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      onClick={toggleTheme}
    >
      <SunIcon className="scale-100 rotate-0 transition-transform duration-300 dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute scale-0 rotate-90 transition-transform duration-300 dark:scale-100 dark:rotate-0" />
    </Button>
  )
}

/** Keeps the problem you're working on visible while you browse other tabs. */
function TimerPill() {
  const timer = useTracker((s) => s.timer)
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const running = Boolean(timer?.startedAt)
  const now = useNow(running)
  if (!timer || tab === 'today') return null
  const problem = PROBLEMS.find((p) => p.id === timer.id)
  return (
    <Button
      variant="ghost"
      size="sm"
      className="bg-primary/10 text-link hover:bg-primary/15 hover:text-link"
      onClick={() => setTab('today')}
      aria-label={`${running ? 'Working on' : 'Paused'} ${problem?.title ?? 'a problem'}, ${formatDuration(timerElapsed(timer, now))}. Go to Today`}
    >
      <LiveDot running={running} />
      {problem && <span className="max-w-40 truncate max-md:hidden">{problem.title}</span>}
      <span className="tabular-nums">{formatDuration(timerElapsed(timer, now))}</span>
    </Button>
  )
}

const BASE_TITLE = 'LeetCode Tracker'

/** The browser tab shows what you're working on — handy while you're over on LeetCode. */
function DocumentTitle() {
  const timer = useTracker((s) => s.timer)
  const running = Boolean(timer?.startedAt)
  const now = useNow(running)
  const problem = timer ? PROBLEMS.find((p) => p.id === timer.id) : undefined
  const title =
    timer && problem
      ? `${running ? `▶ ${formatDuration(timerElapsed(timer, now))}` : '⏸ Paused'} · ${problem.title} — ${BASE_TITLE}`
      : BASE_TITLE
  useEffect(() => {
    document.title = title
  }, [title])
  return null
}
