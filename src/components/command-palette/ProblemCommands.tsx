import { CalendarClockIcon, ExternalLinkIcon, HistoryIcon, PencilLineIcon, PlayIcon, PlusIcon, TimerIcon, XIcon } from 'lucide-react'
import { StatusGlyph } from '@/components/problem-bits'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { beginTimer } from '@/components/timer/start-problem'
import { leetcodeUrl, neetcodeUrl, videoUrl, type Problem } from '@/data/problems'
import { STATUSES } from '@/lib/_consts/enums'
import { STATUS_LABEL } from '@/lib/_consts/labels'
import { openInNewTab } from '@/lib/_utils/browser'
import { addDays } from '@/lib/_utils/date'
import { useTracker, useUI } from '@/lib/store'
import type { Run } from './useCommandPalette'

interface ProblemCommandsProps {
  problem: Problem
  today: string
  run: Run
  onBack: () => void
}

/** Everything you can do with one problem: plan it, time it, log it, open it, set its status. */
export function ProblemCommands({ problem, today, run, onBack }: ProblemCommandsProps) {
  return (
    <>
      <PlanCommands problem={problem} today={today} run={run} />
      <CommandGroup heading="Open">
        <CommandItem value="open leetcode" onSelect={() => run(() => openInNewTab(leetcodeUrl(problem)))}>
          <ExternalLinkIcon /> Open on LeetCode{problem.premium && ' (Premium)'}
        </CommandItem>
        <CommandItem value="open neetcode" onSelect={() => run(() => openInNewTab(neetcodeUrl(problem)))}>
          <ExternalLinkIcon /> Open on NeetCode
        </CommandItem>
        <CommandItem value="watch solution video" onSelect={() => run(() => openInNewTab(videoUrl(problem)))}>
          <PlayIcon /> Watch solution video
        </CommandItem>
      </CommandGroup>
      <StatusCommands problem={problem} today={today} run={run} />
      <CommandGroup>
        <CommandItem value="back to all problems" onSelect={onBack} className="text-muted-foreground">
          ← Back
        </CommandItem>
      </CommandGroup>
    </>
  )
}

function PlanCommands({ problem, today, run }: Omit<ProblemCommandsProps, 'onBack'>) {
  const tomorrow = addDays(today, 1)
  const planned = useTracker((s) => Boolean(s.plans[today]?.some((p) => p.id === problem.id)))
  const plannedTomorrow = useTracker((s) => Boolean(s.plans[tomorrow]?.some((p) => p.id === problem.id)))
  const timerBusy = useTracker((s) => s.timer !== null)
  const t = useTracker.getState()
  const ui = useUI.getState()
  const togglePlan = (day: string, isPlanned: boolean) => () =>
    isPlanned ? t.removeFromPlan(problem.id, day) : t.addToPlan([problem.id], day)

  return (
    <CommandGroup heading={problem.title}>
      <CommandItem value="today plan add remove" onSelect={() => run(togglePlan(today, planned))}>
        {planned ? <XIcon /> : <PlusIcon />} {planned ? 'Remove from today' : 'Add to today'}
      </CommandItem>
      <CommandItem value="tomorrow plan add remove" onSelect={() => run(togglePlan(tomorrow, plannedTomorrow))}>
        <CalendarClockIcon /> {plannedTomorrow ? 'Remove from tomorrow' : 'Add to tomorrow'}
      </CommandItem>
      {!timerBusy && (
        <CommandItem
          value="start timer"
          onSelect={() =>
            run(() => {
              beginTimer(problem.id, today)
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
  )
}

function StatusCommands({ problem, today, run }: Omit<ProblemCommandsProps, 'onBack'>) {
  const status = useTracker((s) => s.progress[problem.id]?.status ?? 'todo')
  const setStatus = useTracker((s) => s.setStatus)
  return (
    <CommandGroup heading="Set status">
      {STATUSES.map((s) => (
        <CommandItem key={s} value={`status ${STATUS_LABEL[s]}`} data-checked={s === status} onSelect={() => run(() => setStatus(problem.id, s, today))}>
          <StatusGlyph status={s} className="size-4 [&_svg]:size-2.5" /> {STATUS_LABEL[s]}
        </CommandItem>
      ))}
    </CommandGroup>
  )
}
