import { cn } from '@/lib/utils'
import type { Difficulty } from '@/data/problems'

const DOT: Record<Difficulty, string> = {
  Easy: 'bg-easy',
  Medium: 'bg-medium',
  Hard: 'bg-hard',
}

export function DifficultyDot({ difficulty }: { difficulty: Difficulty }) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[difficulty])} />
}

/** Colored dot carries identity; the label stays in text ink. */
export function DifficultyTag({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <DifficultyDot difficulty={difficulty} />
      <span className="max-sm:sr-only">{difficulty}</span>
    </span>
  )
}
