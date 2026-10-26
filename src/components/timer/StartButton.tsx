import { PlayIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Problem } from '@/data/problems'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { cn } from '@/lib/_utils/cn'
import { useTracker } from '@/lib/store'
import { requestStart } from './start-problem'

interface StartButtonProps {
  problem: Problem
  today: string
  className?: string
}

/** Start a problem from a list (a round play button on phones). Hidden while another one is timed — one timer at a time. */
export function StartButton({ problem, today, className }: StartButtonProps) {
  const busy = useTracker((s) => s.timer !== null)
  if (busy) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('group/start shrink-0 max-sm:size-9 max-sm:rounded-full max-sm:px-0', className)}
      aria-label={`Start ${problem.title}`}
      title={`Start the ${TARGET_MINUTES[problem.difficulty]}-minute timer`}
      onClick={() => requestStart(problem, today)}
    >
      <PlayIcon className="fill-current transition-transform duration-150 group-hover/start:translate-x-0.5" />
      <span className="max-sm:sr-only">Start</span>
    </Button>
  )
}
