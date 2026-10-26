import { useState } from 'react'
import { DownloadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { downloadFile } from '@/lib/browser'
import { buildIcs, type CalendarBlock } from '@/lib/calendar'
import { useUI } from '@/ui-store'

/** Mon-first for display; values are JS weekdays (0 = Sunday). */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0]
const dayName = (d: number, style: 'narrow' | 'long') =>
  new Date(2026, 0, 4 + d).toLocaleDateString(undefined, { weekday: style }) // Jan 4 2026 is a Sunday

interface BlockState extends CalendarBlock {
  enabled: boolean
  label: string
}

const DEFAULT_BLOCKS: BlockState[] = [
  { enabled: true, label: 'Weekdays', days: [1, 2, 3, 4], time: '19:00', minutes: 30, title: 'LeetCode — one problem' },
  { enabled: true, label: 'Weekend session', days: [6], time: '10:00', minutes: 90, title: 'LeetCode — weekend session' },
]

/** Put the routine in your calendar, so the habit doesn't rely on remembering it after work. */
export function CalendarDialog() {
  const open = useUI((s) => s.calendarOpen)
  const setOpen = useUI((s) => s.setCalendarOpen)
  const [blocks, setBlocks] = useState(DEFAULT_BLOCKS)
  const update = (i: number, patch: Partial<BlockState>) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)))

  const chosen = blocks.filter((b) => b.enabled && b.days.length > 0 && b.time && b.minutes > 0)

  const download = () => {
    downloadFile('leetcode-practice.ics', buildIcs(chosen, window.location.origin), 'text/calendar')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add practice to your calendar</DialogTitle>
          <DialogDescription>
            Downloads an .ics file — open it to add repeating events (with a 5-minute reminder) to Apple Calendar, Google
            Calendar or Outlook.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {blocks.map((b, i) => (
            <div key={b.label} role="group" aria-label={b.label} className="grid gap-3 rounded-lg p-3 ring-1 ring-border">
              <label className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-[13px] font-medium">{b.label}</span>
                <Switch
                  checked={b.enabled}
                  onCheckedChange={(enabled) => update(i, { enabled })}
                  aria-label={`Include ${b.label.toLowerCase()}`}
                />
              </label>
              <ToggleGroup
                type="multiple"
                variant="outline"
                size="sm"
                spacing={1}
                value={b.days.map(String)}
                onValueChange={(v) => update(i, { days: v.map(Number) })}
                aria-label={`${b.label} days`}
                disabled={!b.enabled}
                className="w-full"
              >
                {WEEKDAYS.map((d) => (
                  <ToggleGroupItem
                    key={d}
                    value={String(d)}
                    aria-label={dayName(d, 'long')}
                    className="flex-1 px-0 text-xs data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-link"
                  >
                    {dayName(d, 'narrow')}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span>at</span>
                <Input
                  type="time"
                  value={b.time}
                  onChange={(e) => update(i, { time: e.target.value })}
                  aria-label={`${b.label} start time`}
                  disabled={!b.enabled}
                  className="w-28"
                />
                <span>for</span>
                <Input
                  type="number"
                  min={10}
                  step={5}
                  value={b.minutes}
                  onChange={(e) => update(i, { minutes: Number(e.target.value) })}
                  aria-label={`${b.label} length in minutes`}
                  disabled={!b.enabled}
                  className="w-20"
                />
                <span>min</span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={download} disabled={chosen.length === 0}>
            <DownloadIcon />
            Download .ics
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
