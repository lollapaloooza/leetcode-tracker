import { CalendarPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useTracker, useUI } from '@/lib/store'
import { GoalStepper } from './GoalStepper'
import { SettingRow, SettingsGroup } from './SettingRow'

export function RoutineSettings() {
  const coreFirst = useTracker((s) => s.coreFirst)
  const setCoreFirst = useTracker((s) => s.setCoreFirst)
  const setCalendarOpen = useUI((s) => s.setCalendarOpen)

  return (
    <SettingsGroup title="Routine">
      <SettingRow label="Practice days a week" description="Hitting it keeps the weekly streak going">
        <GoalStepper kind="weeklyDays" label="Practice days a week" />
      </SettingRow>
      <SettingRow label="Problems on weekdays">
        <GoalStepper kind="weekdayGoal" label="Problems on weekdays" />
      </SettingRow>
      <SettingRow label="Problems on weekends">
        <GoalStepper kind="weekendGoal" label="Problems on weekends" />
      </SettingRow>
      <SettingRow label="Core 150 first" description="Suggest the NeetCode 150 before the other 100">
        <Switch aria-label="Core 150 first" checked={coreFirst} onCheckedChange={setCoreFirst} />
      </SettingRow>
      <SettingRow label="Practice reminders" description="Recurring blocks for your calendar app">
        <Button variant="outline" onClick={() => setCalendarOpen(true)}>
          <CalendarPlusIcon />
          Add to calendar
        </Button>
      </SettingRow>
    </SettingsGroup>
  )
}
