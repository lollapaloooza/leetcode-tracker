import { MinusIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GoalKind } from '@/types'
import { useGoal } from './useGoal'

/** − value + for one routine goal; each button disables at its limit. */
export function GoalStepper({ kind, label }: { kind: GoalKind; label: string }) {
  const goal = useGoal(kind)
  const name = label.toLowerCase()
  return (
    <div role="group" aria-label={label} className="flex items-center rounded-lg border">
      <Button variant="ghost" size="icon" aria-label={`Fewer ${name}`} disabled={!goal.canDecrease} onClick={goal.decrease}>
        <MinusIcon />
      </Button>
      <output aria-live="polite" className="w-8 text-center text-sm font-semibold tabular-nums">
        {goal.value}
      </output>
      <Button variant="ghost" size="icon" aria-label={`More ${name}`} disabled={!goal.canIncrease} onClick={goal.increase}>
        <PlusIcon />
      </Button>
    </div>
  )
}
