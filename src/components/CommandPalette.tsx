import { useEffect, useState } from 'react'
import {
  CalendarCheckIcon,
  CalendarPlusIcon,
  CalendarClockIcon,
  ExternalLinkIcon,
  HistoryIcon,
  LayoutListIcon,
  MoonIcon,
  NotebookPenIcon,
  PencilLineIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  SunIcon,
  TargetIcon,
  TimerIcon,
  XIcon,
  ZapIcon,
} from 'lucide-react'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { leetcodeUrl, neetcodeUrl, PROBLEMS, videoUrl, type Problem } from '@/data/problems'
import { addDays } from '@/lib/date'
import { useTheme } from '@/lib/theme'
import { goalFor, plannedFrom, STATUS_LABEL, suggestNext, useTracker } from '@/store'
import { useUI, type Tab } from '@/ui-store'
import { DifficultyDot } from './DifficultyTag'
import { PythonIcon } from './PythonIcon'
import { STATUSES, StatusGlyph } from './problem-bits'

const byId = new Map(PROBLEMS.map((p) => [p.id, p]))

const NAV: { tab: Tab; label: string; icon: typeof PlusIcon }[] = [
  { tab: 'today', label: 'Today', icon: CalendarCheckIcon },
  { tab: 'all', label: 'All problems', icon: LayoutListIcon },
  { tab: 'patterns', label: 'Patterns', icon: NotebookPenIcon },
  { tab: 'history', label: 'History', icon: HistoryIcon },
]

export function CommandPalette({ today }: { today: string }) {
  const open = useUI((s) => s.paletteOpen)
  const setOpen = useUI((s) => s.setPaletteOpen)
  const [problemId, setProblemId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!useUI.getState().paletteOpen)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setOpen])

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setProblemId(null)
      setSearch('')
    }
  }
  const run = (fn: () => void) => {
    fn()
    onOpenChange(false)
  }
  const problem = problemId !== null ? byId.get(problemId) : undefined

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command palette" description="Find a problem or run a command">
      <Command
        onKeyDown={(e) => {
          // Backspace on an empty search steps back out of a problem's actions.
          if (e.key === 'Backspace' && search === '' && problemId !== null) {
            e.preventDefault()
            setProblemId(null)
          }
        }}
      >
        <CommandInput
          placeholder={problem ? `${problem.title} — choose an action…` : 'Search problems, #number, or commands…'}
          value={search}
          onValueChange={(v) => setSearch(v.replace(/^#/, ''))}
        />
        <CommandList className="max-h-96">
          <CommandEmpty>No results.</CommandEmpty>
          {problem ? (
            <ProblemActions
              problem={problem}
              today={today}
              run={run}
              onBack={() => {
                setProblemId(null)
                setSearch('')
              }}
            />
          ) : (
            <RootPage
              today={today}
              run={run}
              onPick={(id) => {
                setProblemId(id)
                setSearch('')
              }}
            />
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

function RootPage({ today, run, onPick }: { today: string; run: (fn: () => void) => void; onPick: (id: number) => void }) {
  const progress = useTracker((s) => s.progress)
  const { theme, toggleTheme } = useTheme()
  const ui = useUI.getState()

  return (
    <>
      <CommandGroup heading="Go to">
        {NAV.map(({ tab, label, icon: Icon }) => (
          <CommandItem key={tab} value={`go ${label}`} onSelect={() => run(() => ui.setTab(tab))}>
            <Icon /> {label}
          </CommandItem>
        ))}
        <CommandItem value="python cheatsheet" onSelect={() => run(() => ui.setPythonOpen(true))}>
          <PythonIcon /> Python cheatsheet
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="Actions">
        <CommandItem
          value="suggest problems for today"
          onSelect={() =>
            run(() => {
              const s = useTracker.getState()
              const plan = s.plans[today] ?? []
              s.addToPlan(suggestNext(s, plannedFrom(s.plans, today), Math.max(goalFor(s, today) - plan.length, 1), today), today)
              ui.setTab('today')
            })
          }
        >
          <SparklesIcon /> Suggest problems for today
        </CommandItem>
        <CommandItem value="short on time quick review watch note" onSelect={() => run(() => ui.setShortOnTimeOpen(true))}>
          <ZapIcon /> Short on time?
        </CommandItem>
        <CommandItem
          value="pick tomorrow's problems plan tomorrow"
          onSelect={() =>
            run(() => {
              const s = useTracker.getState()
              const tomorrow = addDays(today, 1)
              const planned = s.plans[tomorrow] ?? []
              s.addToPlan(suggestNext(s, plannedFrom(s.plans, today), Math.max(goalFor(s, tomorrow) - planned.length, 1), tomorrow), tomorrow)
              ui.setTab('today')
            })
          }
        >
          <CalendarClockIcon /> Pick tomorrow's problems
        </CommandItem>
        <CommandItem value="add practice to calendar reminder ics" onSelect={() => run(() => ui.setCalendarOpen(true))}>
          <CalendarPlusIcon /> Add practice to calendar
        </CommandItem>
        <CommandItem
          value="set interview date"
          onSelect={() =>
            run(() => {
              // On small screens the sidebar sits below the tasks — bring the picker's anchor into view first.
              document.getElementById('interview-date')?.scrollIntoView({ block: 'center' })
              ui.setInterviewPickerOpen(true)
            })
          }
        >
          <TargetIcon /> Set interview date
        </CommandItem>
        <CommandItem value="toggle theme dark light mode" onSelect={() => run(toggleTheme)}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />} Switch to {theme === 'dark' ? 'light' : 'dark'} theme
        </CommandItem>
      </CommandGroup>
      <CommandSeparator />
      <CommandGroup heading="Problems">
        {PROBLEMS.map((p) => (
          <CommandItem key={p.id} value={`${p.id} ${p.title} ${p.topic}`} onSelect={() => onPick(p.id)}>
            <StatusGlyph status={progress[p.id]?.status ?? 'todo'} className="size-4 [&_svg]:size-2.5" />
            <span className="truncate">{p.title}</span>
            <span className="ml-auto flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="max-sm:hidden">{p.topic}</span>
              <DifficultyDot difficulty={p.difficulty} />
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  )
}

function ProblemActions({
  problem,
  today,
  run,
  onBack,
}: {
  problem: Problem
  today: string
  run: (fn: () => void) => void
  onBack: () => void
}) {
  const planned = useTracker((s) => Boolean(s.plans[today]?.some((p) => p.id === problem.id)))
  const tomorrow = addDays(today, 1)
  const plannedTomorrow = useTracker((s) => Boolean(s.plans[tomorrow]?.some((p) => p.id === problem.id)))
  const status = useTracker((s) => s.progress[problem.id]?.status ?? 'todo')
  const timerBusy = useTracker((s) => s.timer !== null)
  const t = useTracker.getState()
  const ui = useUI.getState()
  // A real link click always opens a tab; window.open with a features string can open a popup window instead.
  const open = (url: string) => {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.click()
  }

  return (
    <>
      <CommandGroup heading={problem.title}>
        <CommandItem
          value="today plan add remove"
          onSelect={() => run(() => (planned ? t.removeFromPlan(problem.id, today) : t.addToPlan([problem.id], today)))}
        >
          {planned ? <XIcon /> : <PlusIcon />} {planned ? 'Remove from today' : 'Add to today'}
        </CommandItem>
        <CommandItem
          value="tomorrow plan add remove"
          onSelect={() =>
            run(() => (plannedTomorrow ? t.removeFromPlan(problem.id, tomorrow) : t.addToPlan([problem.id], tomorrow)))
          }
        >
          <CalendarClockIcon /> {plannedTomorrow ? 'Remove from tomorrow' : 'Add to tomorrow'}
        </CommandItem>
        {!timerBusy && (
          <CommandItem
            value="start timer"
            onSelect={() =>
              run(() => {
                t.startTimer(problem.id, today)
                ui.setTab('today')
              })
            }
          >
            <TimerIcon /> Start timer
          </CommandItem>
        )}
        <CommandItem value="log attempt" onSelect={() => run(() => ui.openLog({ id: problem.id }))}>
          <PencilLineIcon /> Log attempt…
        </CommandItem>
        <CommandItem value="details history notes" onSelect={() => run(() => ui.openDetail(problem.id))}>
          <HistoryIcon /> Details & history
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="Open">
        <CommandItem value="open leetcode" onSelect={() => run(() => open(leetcodeUrl(problem)))}>
          <ExternalLinkIcon /> Open on LeetCode{problem.premium && ' (Premium)'}
        </CommandItem>
        <CommandItem value="open neetcode" onSelect={() => run(() => open(neetcodeUrl(problem)))}>
          <ExternalLinkIcon /> Open on NeetCode
        </CommandItem>
        <CommandItem value="watch solution video" onSelect={() => run(() => open(videoUrl(problem)))}>
          <PlayIcon /> Watch solution video
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="Set status">
        {STATUSES.map((s) => (
          <CommandItem
            key={s}
            value={`status ${STATUS_LABEL[s]}`}
            data-checked={s === status}
            onSelect={() => run(() => t.setStatus(problem.id, s, today))}
          >
            <StatusGlyph status={s} className="size-4 [&_svg]:size-2.5" /> {STATUS_LABEL[s]}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandGroup>
        <CommandItem value="back to all problems" onSelect={onBack} className="text-muted-foreground">
          ← Back
        </CommandItem>
      </CommandGroup>
    </>
  )
}
