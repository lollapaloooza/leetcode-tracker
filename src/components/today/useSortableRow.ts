import { use, type KeyboardEvent, type TouchEventHandler } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { BoardKeys } from './board-keys'

/**
 * Sortable wiring for one row: the row itself moves. The grip starts a drag with the mouse (or takes
 * ↑/↓); a long press anywhere on the row starts one by touch, since phones hide the grip.
 */
export function useSortableRow(sid: string) {
  const nudge = use(BoardKeys)
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: sid })
  const onKeyDown = (e: KeyboardEvent) => {
    if (!nudge || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    nudge(sid, e.key === 'ArrowUp' ? -1 : 1)
  }
  const { onTouchStart, ...gripListeners } = listeners ?? {}
  return {
    ref: setNodeRef,
    style: { transform: CSS.Translate.toString(transform), transition },
    dragging: isDragging,
    rowProps: { onTouchStart: onTouchStart as TouchEventHandler | undefined },
    handleProps: { ref: setActivatorNodeRef, 'data-sortable-handle': sid, ...attributes, ...gripListeners, onKeyDown },
  }
}

export type SortableRow = ReturnType<typeof useSortableRow>
