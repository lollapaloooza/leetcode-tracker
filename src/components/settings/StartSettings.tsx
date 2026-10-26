import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { usePrefs, type StartOpens } from '@/lib/store'
import { SettingsGroup } from './SettingRow'

const CHOICES: { value: StartOpens; label: string; description: string }[] = [
  { value: 'ask', label: 'Ask', description: 'Asks each time whether to open LeetCode or NeetCode' },
  { value: 'leetcode', label: 'LeetCode', description: 'Starts the timer and opens LeetCode' },
  { value: 'neetcode', label: 'NeetCode', description: 'Starts the timer and opens NeetCode' },
  { value: 'nothing', label: 'Timer', description: 'Only starts the timer' },
]

/** What the Start button does. Saved on this device only, like the theme. */
export function StartSettings() {
  const startOpens = usePrefs((s) => s.startOpens)
  const setStartOpens = usePrefs((s) => s.setStartOpens)
  const current = CHOICES.find((c) => c.value === startOpens)
  const pick = (value: string) => {
    const picked = CHOICES.find((c) => c.value === value)
    if (picked) setStartOpens(picked.value)
  }

  return (
    <SettingsGroup title="Start">
      {/* Four choices need the full width, so the control sits under its label rather than beside it. */}
      <div className="flex flex-col gap-2.5 py-2">
        <div>
          <p className="text-sm font-medium">When you press Start</p>
          <p className="text-xs text-muted-foreground">{current?.description}</p>
        </div>
        <ToggleGroup type="single" variant="outline" aria-label="When you press Start" value={startOpens} onValueChange={pick} className="w-full">
          {CHOICES.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="flex-1 text-muted-foreground data-[state=on]:font-medium data-[state=on]:text-foreground"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </SettingsGroup>
  )
}
