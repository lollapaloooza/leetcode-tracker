import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useTheme, type ThemeChoice } from '@/lib/theme'
import { SettingRow, SettingsGroup } from './SettingRow'

const CHOICES: { value: ThemeChoice; label: string; icon: typeof SunIcon }[] = [
  { value: 'system', label: 'System', icon: MonitorIcon },
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
]

export function AppearanceSettings() {
  const { choice, chooseTheme } = useTheme()
  const pick = (value: string) => {
    const picked = CHOICES.find((c) => c.value === value)
    if (picked) chooseTheme(picked.value)
  }

  return (
    <SettingsGroup title="Appearance">
      <SettingRow label="Theme" description={choice === 'system' ? 'Follows your device' : undefined}>
        <ToggleGroup type="single" variant="outline" aria-label="Theme" value={choice} onValueChange={pick}>
          {CHOICES.map(({ value, label, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={label}
              className="px-2.5 text-muted-foreground data-[state=on]:font-medium data-[state=on]:text-foreground"
            >
              <Icon />
              <span className="max-sm:sr-only">{label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </SettingRow>
    </SettingsGroup>
  )
}
