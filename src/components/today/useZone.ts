import { useDroppable } from '@dnd-kit/core'
import type { Zone } from './board-lists'

/** A list with no draggable rows still needs to accept a drop. */
export function useZone(zone: Zone, empty: boolean) {
  const { setNodeRef, isOver } = useDroppable({ id: zone, disabled: !empty })
  return { ref: setNodeRef, isOver: empty && isOver }
}
