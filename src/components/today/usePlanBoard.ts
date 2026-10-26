import { useRef, useState, type ComponentProps } from 'react'
import {
  closestCenter,
  DndContext,
  MeasuringStrategy,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { problemById } from '@/data/problems'
import { useTracker } from '@/lib/store'
import { dropOrder, isZone, moveAcross, nudgeTarget, originOf, placeText, problemIdOf, sortableId, zoneOf, type Zone, type ZoneLists } from './board-lists'

const LONG_PRESS = { delay: 250, tolerance: 5 }

const titleOf = (sid: UniqueIdentifier) => problemById.get(problemIdOf(sid))?.title ?? 'Problem'

const focusHandle = (sid: string) =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-sortable-handle="${sid}"]`)?.focus())

interface BoardOptions {
  /** Unfinished problems per list, in priority order */
  lists: ZoneLists
  dates: Record<Zone, string>
  /** Problems that stay on top of a list and don't move (the one in the spotlight) */
  pinned: Record<Zone, number[]>
}

/**
 * Drag to reorder within a day, or between today and tomorrow. While dragging, a draft of both
 * lists drives the UI; dropping writes the new order to the store. On the keyboard, the arrow keys
 * move a problem one place at a time.
 */
export function usePlanBoard({ lists, dates, pinned }: BoardOptions) {
  const [draft, setDraftState] = useState<ZoneLists | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  // Handlers read the latest draft without waiting for a re-render.
  const draftRef = useRef<ZoneLists | null>(null)
  const setDraft = (next: ZoneLists | null) => {
    draftRef.current = next
    setDraftState(next)
  }
  const current = () => draftRef.current ?? lists
  const dropMessage = useRef('')
  // The grip takes the mouse; on phones, where there's no grip, holding a row picks it up — move sooner and it scrolls.
  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor, { activationConstraint: LONG_PRESS }))

  /** Already planned on that day (finished, or in the spotlight) — then there's nothing to move. */
  const takenOn = (zone: Zone, sid: string) =>
    originOf(sid) !== zone && (useTracker.getState().plans[dates[zone]] ?? []).some((p) => p.id === problemIdOf(sid))

  /** Write a list's new order; a problem that arrived from the other day is moved there first. */
  const commit = (sid: string, zone: Zone, order: string[]) => {
    const s = useTracker.getState()
    const origin = originOf(sid)
    if (origin !== zone) s.moveToDay(problemIdOf(sid), dates[origin], dates[zone])
    s.reorderPlan(dates[zone], [...pinned[zone], ...order.map(problemIdOf)])
  }

  const dragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const l = current()
    const sid = String(active.id)
    const from = zoneOf(l, sid)
    const to = zoneOf(l, over.id)
    if (!from || !to || from === to || takenOn(to, sid)) return
    const translated = active.rect.current.translated
    setDraft(moveAcross(l, sid, to, over.id, translated !== null && translated.top > over.rect.top + over.rect.height / 2))
  }

  const drop = (sid: string, overId: UniqueIdentifier | undefined) => {
    dropMessage.current = `Dropped ${titleOf(sid)} where it was.`
    const target = overId === undefined ? null : dropOrder(current(), sid, overId)
    if (!target) return
    const { zone, order } = target
    if (originOf(sid) === zone && order.every((x, i) => x === lists[zone][i])) return
    commit(sid, zone, order)
    dropMessage.current = `Dropped ${titleOf(sid)} at ${placeText(zone, order.indexOf(sid), order.length)}.`
  }

  const nudge = (sid: string, step: -1 | 1) => {
    const target = nudgeTarget(lists, sid, step)
    if (!target) return
    if (target.crossed && takenOn(target.zone, sid)) {
      setStatus(`${titleOf(sid)} is already planned for ${target.zone}.`)
      return
    }
    commit(sid, target.zone, target.order)
    setStatus(`${titleOf(sid)} moved to ${placeText(target.zone, target.order.indexOf(sid), target.order.length)}.`)
    focusHandle(target.crossed ? sortableId(target.zone, problemIdOf(sid)) : sid)
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      const l = current()
      const zone = over ? zoneOf(l, over.id) : undefined
      if (!over || !zone) return `${titleOf(active.id)} is outside the lists.`
      const index = isZone(over.id) ? l[zone].length - 1 : l[zone].indexOf(String(over.id))
      return `${titleOf(active.id)} is at ${placeText(zone, index, l[zone].length)}.`
    },
    onDragEnd: () => dropMessage.current,
    onDragCancel: ({ active }) => `Cancelled. ${titleOf(active.id)} is back where it was.`,
  }

  const contextProps: ComponentProps<typeof DndContext> = {
    sensors,
    collisionDetection: closestCenter,
    // Rows change lists mid-drag, so re-measure drop targets on every render.
    measuring: { droppable: { strategy: MeasuringStrategy.Always } },
    accessibility: {
      announcements,
      screenReaderInstructions: {
        draggable:
          "Press the up or down arrow key to move this problem one place. Past the end of today's list it moves to tomorrow, and back.",
      },
    },
    onDragStart: ({ active }) => {
      setDraft(lists)
      setActiveId(String(active.id))
    },
    onDragOver: dragOver,
    onDragEnd: ({ active, over }) => {
      drop(String(active.id), over?.id)
      setDraft(null)
      setActiveId(null)
    },
    onDragCancel: () => {
      setDraft(null)
      setActiveId(null)
    },
  }

  return { lists: draft ?? lists, activeId, status, nudge, contextProps }
}
