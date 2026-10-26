import { Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDay } from '@/lib/_utils/date'
import { lazyComponent } from '@/lib/_utils/lazy'
import { SettingRow, SettingsGroup } from './SettingRow'
import { useInterviewDate } from './useInterviewDate'

// The date picker (react-day-picker + date-fns) is the largest dependency, and only this popover uses it.
const Calendar = lazyComponent(() => import('@/components/ui/calendar').then((m) => m.Calendar))

export function InterviewSettings({ today }: { today: string }) {
  const [open, setOpen] = useState(false)
  const interview = useInterviewDate(today)
  const done = (change: () => void) => {
    change()
    setOpen(false)
  }

  return (
    <SettingsGroup title="Interview">
      <SettingRow label="Interview date" description="Sets the daily pace on the progress card">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" aria-label={interview.date ? `Interview date: ${formatDay(interview.date)}` : 'Set interview date'}>
              {interview.date ? formatDay(interview.date) : 'Set date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0">
            {/* Holds the calendar's size in the rare case it opens before its chunk has loaded. */}
            <Suspense fallback={<div className="h-64.5 w-53" />}>
              <Calendar
                mode="single"
                selected={interview.selected}
                defaultMonth={interview.month}
                disabled={{ before: interview.firstPickable }}
                onSelect={(day) => day && done(() => interview.pick(day))}
              />
            </Suspense>
            {interview.date && (
              <div className="border-t p-2">
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => done(interview.clear)}>
                  Clear date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </SettingRow>
    </SettingsGroup>
  )
}
