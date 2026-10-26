// What each Today ⋯ menu offers. Actions read the store when chosen, so menus never act on stale state.
import {
  ArrowUpToLineIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  PencilLineIcon,
  PlayIcon,
  SunriseIcon,
  TimerOffIcon,
  XIcon,
} from 'lucide-react'
import type { RowAction } from '@/components/problem-bits'
import { startProblem } from '@/components/timer/start-problem'
import { neetcodeUrl, videoUrl, type Problem } from '@/data/problems'
import { openInNewTab } from '@/lib/_utils/browser'
import { addDays, formatDay, saturdayAhead } from '@/lib/_utils/date'
import { practiceLink } from '@/lib/domain'
import { useTracker, useUI } from '@/lib/store'

const store = () => useTracker.getState()

/** A group of actions with a separator above it. */
const group = (actions: RowAction[]): RowAction[] => actions.map((a, i) => (i === 0 ? { ...a, separated: true } : a))

/** LeetCode (or NeetCode's copy of a Premium problem), NeetCode, and the solution video. */
function openActions(problem: Problem): RowAction[] {
  const practice = practiceLink(problem)
  return [
    { label: `Open on ${practice.site}`, icon: <ExternalLinkIcon />, onSelect: () => openInNewTab(practice.url) },
    ...(practice.site === 'LeetCode'
      ? [{ label: 'Open on NeetCode', icon: <ExternalLinkIcon />, onSelect: () => openInNewTab(neetcodeUrl(problem)) }]
      : []),
    { label: 'Watch solution video', icon: <PlayIcon />, onSelect: () => openInNewTab(videoUrl(problem)) },
  ]
}

function moveActions(problem: Problem, from: string, today: string): RowAction[] {
  const saturday = saturdayAhead(today)
  return [
    { label: 'Move to tomorrow', icon: <SunriseIcon />, onSelect: () => store().moveToDay(problem.id, from, addDays(today, 1)) },
    ...(saturday ? [{ label: 'Move to Saturday', icon: <CalendarDaysIcon />, onSelect: () => store().moveToDay(problem.id, from, saturday) }] : []),
  ]
}

const remove = (problem: Problem, day: string, label: string): RowAction[] =>
  group([{ label, icon: <XIcon />, onSelect: () => store().removeFromPlan(problem.id, day) }])

/** A problem in the queue: start it, bring it forward, put it off, open it, or drop it. */
export function queueActions(problem: Problem, today: string, { canStart, canDoFirst }: { canStart: boolean; canDoFirst: boolean }): RowAction[] {
  const start: RowAction = { label: 'Start', icon: <PlayIcon />, onSelect: () => startProblem(problem, today) }
  const doFirst: RowAction = {
    label: 'Do first',
    icon: <ArrowUpToLineIcon />,
    // Right after the problem being timed, if there is one; otherwise it's up next.
    onSelect: () => {
      const timer = store().timer
      store().reorderPlan(today, timer && timer.id !== problem.id ? [timer.id, problem.id] : [problem.id])
    },
  }
  return [
    ...(canStart ? [start] : []),
    ...(canDoFirst ? [doFirst] : []),
    ...moveActions(problem, today, today),
    ...group(openActions(problem)),
    ...remove(problem, today, 'Remove from today'),
  ]
}

/** A problem finished today: open it again, or take it off the list. Edit and undo live on its mark. */
export function doneActions(problem: Problem, today: string): RowAction[] {
  return [...openActions(problem), ...remove(problem, today, 'Remove from today')]
}

/** The problem in the spotlight: while timed, stop or drop it; otherwise log it or put it off. */
export function nowActions(problem: Problem, today: string, { timed }: { timed: boolean }): RowAction[] {
  if (timed) {
    return [
      { label: 'Discard timer', icon: <TimerOffIcon />, onSelect: () => store().cancelTimer() },
      ...remove(problem, today, 'Remove from today (stops the timer)'),
    ]
  }
  return [
    { label: 'Log attempt…', icon: <PencilLineIcon />, onSelect: () => useUI.getState().openLog({ id: problem.id }) },
    ...moveActions(problem, today, today),
    ...remove(problem, today, 'Remove from today'),
  ]
}

/** A problem planned for tomorrow: pull it into today, open it, or drop it. */
export function tomorrowActions(problem: Problem, today: string): RowAction[] {
  const tomorrow = addDays(today, 1)
  return [
    { label: 'Move to today', icon: <CalendarCheckIcon />, onSelect: () => store().moveToDay(problem.id, tomorrow, today) },
    ...group(openActions(problem)),
    ...remove(problem, tomorrow, 'Remove from tomorrow'),
  ]
}

/** A problem put off to a later day: bring it back, open it, or drop it. */
export function laterActions(problem: Problem, day: string, today: string): RowAction[] {
  return [
    { label: 'Move to today', icon: <CalendarCheckIcon />, onSelect: () => store().moveToDay(problem.id, day, today) },
    { label: 'Move to tomorrow', icon: <SunriseIcon />, onSelect: () => store().moveToDay(problem.id, day, addDays(today, 1)) },
    ...group(openActions(problem)),
    ...remove(problem, day, `Remove from ${formatDay(day)}`),
  ]
}
