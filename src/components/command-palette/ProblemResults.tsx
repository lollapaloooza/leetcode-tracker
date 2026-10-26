import { DifficultyDot } from '@/components/DifficultyTag'
import { StatusGlyph } from '@/components/problem-bits'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { PROBLEMS } from '@/data/problems'
import { useTracker } from '@/lib/store'

/** Every problem, searchable by number, title or topic. */
export function ProblemResults({ onPick }: { onPick: (id: number) => void }) {
  const progress = useTracker((s) => s.progress)
  return (
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
  )
}
