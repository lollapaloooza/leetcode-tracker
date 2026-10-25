import { createContext, use, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react'
import {
  closestCenter,
  DndContext,
  MeasuringStrategy,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragOverEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PROBLEMS } from '@/data/problems'
import { useTracker } from '@/store'

/** The two lists you can drag between. */
export type Zone = 'today' | 'tomorrow'
export type ZoneLists = Record<Zone, string[]>

const ZONES: Zone[] = ['today', 'tomorrow']
const byId = new Map(PROBLEMS.map((p) => [p.id, p]))
const titleOf = (sid: UniqueIdentifier) => byId.get(problemIdOf(sid))?.title ?? 'Problem'

/** A problem can be planned on both days, so sortable ids carry the list they started in. */
export const sortableId = (zone: Zone, id: number) => `${zone}:${id}`
export const problemIdOf = (sid: UniqueIdentifier) => Number(String(sid).split(':')[1])
const originOf = (sid: UniqueIdentifier) => String(sid).split(':')[0] as Zone
/** An empty list is a drop target of its own, with the zone's name as its id. */
const isZone = (id: UniqueIdentifier): id is Zone => ZONES.includes(id as Zone)

function zoneOf(lists: ZoneLists, id: UniqueIdentifier): Zone | undefined {
  return isZone(id) ? id : ZONES.find((z) => lists[z].includes(String(id)))
}

const focusHandle = (sid: string) =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-sortable-handle="${sid}"]`)?.focus())

interface BoardOptions {
  /** Unfinished problems per list, in priority order */
  lists: ZoneLists
  dates: Record<Zone, string>
  /** Problems that stay on top of a list and don't move (the one you're working on) */
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

  const sensors = useSensors(useSensor(PointerSensor))

  /** Already planned on that day (finished, or being worked on) — then there's nothing to move. */
  const takenOn = (zone: Zone, sid: string) =>
    originOf(sid) !== zone && (useTracker.getState().plans[dates[zone]] ?? []).some((p) => p.id === problemIdOf(sid))

  /** Write a list's new order; a problem that arrived from the other day is moved there first. */
  const commit = (sid: string, zone: Zone, order: string[]) => {
    const s = useTracker.getState()
    const origin = originOf(sid)
    if (origin !== zone) s.moveToDay(problemIdOf(sid), dates[origin], dates[zone])
    s.reorderPlan(dates[zone], [...pinned[zone], ...order.map(problemIdOf)])
  }
  const placeText = (zone: Zone, index: number, size: number) => `position ${index + 1} of ${size} for ${zone}`

  const moveAcross = ({ active, over }: DragOverEvent) => {
    if (!over) return
    const l = current()
    const from = zoneOf(l, active.id)
    const to = zoneOf(l, over.id)
    const sid = String(active.id)
    if (!from || !to || from === to || takenOn(to, sid)) return
    const overIndex = l[to].indexOf(String(over.id))
    const translated = active.rect.current.translated
    const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2
    const index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : l[to].length
    setDraft({
      ...l,
      [from]: l[from].filter((x) => x !== sid),
      [to]: [...l[to].slice(0, index), sid, ...l[to].slice(index)],
    })
  }

  const drop = (sid: string, overId: UniqueIdentifier | undefined) => {
    const l = current()
    const zone = zoneOf(l, sid)
    dropMessage.current = `Dropped ${titleOf(sid)} where it was.`
    if (!zone || overId === undefined) return
    let order = l[zone]
    if (!isZone(overId) && zoneOf(l, overId) === zone) {
      order = arrayMove(order, order.indexOf(sid), order.indexOf(String(overId)))
    }
    if (originOf(sid) === zone && order.every((x, i) => x === lists[zone][i])) return
    commit(sid, zone, order)
    dropMessage.current = `Dropped ${titleOf(sid)} at ${placeText(zone, order.indexOf(sid), order.length)}.`
  }

  /** ↑/↓ on a grip: one place up or down, crossing into the other day at the ends of a list. */
  const nudge = (sid: string, step: -1 | 1) => {
    const zone = zoneOf(lists, sid)
    if (!zone) return
    const order = lists[zone]
    const from = order.indexOf(sid)
    const to = from + step
    if (to >= 0 && to < order.length) {
      commit(sid, zone, arrayMove(order, from, to))
      setStatus(`${titleOf(sid)} moved to ${placeText(zone, to, order.length)}.`)
      focusHandle(sid)
      return
    }
    const next = ZONES[ZONES.indexOf(zone) + step]
    if (!next) return
    if (takenOn(next, sid)) {
      setStatus(`${titleOf(sid)} is already planned for ${next}.`)
      return
    }
    // Down from today lands first in tomorrow; up from tomorrow lands last in today.
    const target = step > 0 ? [sid, ...lists[next]] : [...lists[next], sid]
    commit(sid, next, target)
    setStatus(`${titleOf(sid)} moved to ${placeText(next, target.indexOf(sid), target.length)}.`)
    focusHandle(sortableId(next, problemIdOf(sid)))
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
    onDragOver: moveAcross,
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

/** Lets each row's grip reach the board's keyboard moves. */
export const BoardKeys = createContext<((sid: string, step: -1 | 1) => void) | null>(null)

/** Sortable wiring for one row: the row itself moves, the grip handle starts the drag (or takes ↑/↓). */
export function useSortableRow(sid: string) {
  const nudge = use(BoardKeys)
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: sid })
  const onKeyDown = (e: KeyboardEvent) => {
    if (!nudge || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    nudge(sid, e.key === 'ArrowUp' ? -1 : 1)
  }
  return {
    ref: setNodeRef,
    style: { transform: CSS.Translate.toString(transform), transition },
    dragging: isDragging,
    handleProps: { ref: setActivatorNodeRef, 'data-sortable-handle': sid, ...attributes, ...listeners, onKeyDown },
  }
}

/** A list with no draggable rows still needs to accept a drop. */
export function useZone(zone: Zone, empty: boolean) {
  const { setNodeRef, isOver } = useDroppable({ id: zone, disabled: !empty })
  return { ref: setNodeRef, isOver: empty && isOver }
}
