import { useRetained } from '@/lib/_hooks/useRetained'
import { useAccount } from '@/lib/store'
import { withSync } from '@/lib/sync/load'

/** The "this device or the cloud?" question: its two sides, and the answer. Closing it asks again on the next visit. */
export function useSyncChoice() {
  const choice = useAccount((s) => s.choice)
  // Keep showing both sides while the dialog animates closed.
  const sides = useRetained(choice)
  return {
    open: choice !== null,
    sides,
    choose: (keep: 'cloud' | 'device') => withSync((sync) => sync.answerChoice(keep)),
    later: () => withSync((sync) => sync.answerChoice(null)),
  }
}
