import { CalendarPlusIcon, MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { GOAL_LIMITS } from '@/lib/_consts/practice'
import { useTracker, useUI } from '@/lib/store'
import type { GoalKind } from '@/types'
import { Section } from './Section'

export function RoutineSection() {
  const coreFirst = useTracker((s) => s.coreFirst)
  const setCoreFirst = useTracker((s) => s.setCoreFirst)
  const setCalendarOpen = useUI((s) => s.setCalendarOpen)

  return (
    <Section
      title="Routine"
      action={
        <Button variant="link" size="xs" className="h-auto p-0 text-[13px]" onClick={() => setCalendarOpen(true)}>
          <CalendarPlusIcon /> Add to calendar
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5 text-[13px]">
        <GoalStepper kind="weeklyDays" label="Days a week" />
        <GoalStepper kind="weekdayGoal" label="Problems on weekdays" />
        <GoalStepper kind="weekendGoal" label="Problems on weekends" />
        <label className="mt-1.5 flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block">Core 150 first</span>
            <span className="block text-xs text-muted-foreground">Suggest finishes NeetCode 150 before the extra 100</span>
          </span>
          <Switch checked={coreFirst} onCheckedChange={setCoreFirst} />
        </label>
      </div>
    </Section>
  )
}

function GoalStepper({ kind, label }: { kind: GoalKind; label: string }) {
  const value = useTracker((s) => s[kind])
  const setGoal = useTracker((s) => s.setGoal)
  const [min, max] = GOAL_LIMITS[kind]
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => setGoal(kind, value - 1)}
        >
          <MinusIcon />
        </Button>
        <span aria-live="polite" className="w-5 text-center font-semibold tabular-nums">
          {value}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => setGoal(kind, value + 1)}
        >
          <PlusIcon />
        </Button>
      </span>
    </div>
  )
}
