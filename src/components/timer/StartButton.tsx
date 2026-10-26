import { PlayIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Problem } from '@/data/problems'
import { TARGET_MINUTES } from '@/lib/_consts/practice'
import { cn } from '@/lib/_utils/cn'
import { practiceLink } from '@/lib/domain'
import { useTracker } from '@/lib/store'
import { startProblem } from './start-problem'

interface StartButtonProps {
  problem: Problem
  today: string
  className?: string
}

/** Start a problem from a list. Hidden while another one is being timed — one timer at a time. */
export function StartButton({ problem, today, className }: StartButtonProps) {
  const busy = useTracker((s) => s.timer !== null)
  if (busy) return null
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('shrink-0', className)}
      aria-label={`Start ${problem.title}`}
      title={`Start the ${TARGET_MINUTES[problem.difficulty]}-minute timer and open it on ${practiceLink(problem).site}`}
      onClick={() => startProblem(problem, today)}
    >
      <PlayIcon className="fill-current" />
      Start
    </Button>
  )
}
