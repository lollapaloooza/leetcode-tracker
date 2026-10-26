import { Command, CommandDialog, CommandEmpty, CommandInput, CommandList, CommandSeparator } from '@/components/ui/command'
import { ProblemCommands } from './ProblemCommands'
import { ProblemResults } from './ProblemResults'
import { RootCommands } from './RootCommands'
import { useCommandPalette } from './useCommandPalette'

/** ⌘K: find any problem and act on it, or run a command. Picking a problem shows its actions. */
export function CommandPalette({ today }: { today: string }) {
  const palette = useCommandPalette()
  const { problem } = palette

  return (
    <CommandDialog open={palette.open} onOpenChange={palette.onOpenChange} title="Command palette" description="Find a problem or run a command">
      <Command onKeyDown={palette.onKeyDown}>
        <CommandInput
          placeholder={problem ? `${problem.title} — choose an action…` : 'Search problems, #number, or commands…'}
          value={palette.search}
          onValueChange={palette.setSearch}
        />
        <CommandList className="max-h-96">
          <CommandEmpty>No results.</CommandEmpty>
          {problem ? (
            <ProblemCommands problem={problem} today={today} run={palette.run} onBack={palette.back} />
          ) : (
            <>
              <RootCommands today={today} run={palette.run} />
              <CommandSeparator />
              <ProblemResults onPick={palette.pick} />
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
