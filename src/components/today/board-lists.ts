// The Today/Tomorrow board's list arithmetic, as pure functions of the two lists: which list a
// row is in, and what the lists look like after a drag or an arrow key.
import type { UniqueIdentifier } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

/** The two lists you can drag between. */
export type Zone = 'today' | 'tomorrow'
export type ZoneLists = Record<Zone, string[]>

export const ZONES: Zone[] = ['today', 'tomorrow']

/** A problem can be planned on both days, so sortable ids carry the list they started in. */
export const sortableId = (zone: Zone, id: number) => `${zone}:${id}`
export const problemIdOf = (sid: UniqueIdentifier) => Number(String(sid).split(':')[1])
export const originOf = (sid: UniqueIdentifier) => String(sid).split(':')[0] as Zone
/** An empty list is a drop target of its own, with the zone's name as its id. */
export const isZone = (id: UniqueIdentifier): id is Zone => ZONES.includes(id as Zone)

export function zoneOf(lists: ZoneLists, id: UniqueIdentifier): Zone | undefined {
  return isZone(id) ? id : ZONES.find((z) => lists[z].includes(String(id)))
}

export const placeText = (zone: Zone, index: number, size: number) => `position ${index + 1} of ${size} for ${zone}`

/** Dragged over the other list: out of its own list, into `to` before `overId` (after it when `below`, at the end when over the list itself). */
export function moveAcross(lists: ZoneLists, sid: string, to: Zone, overId: UniqueIdentifier, below: boolean): ZoneLists {
  const from = zoneOf(lists, sid)
  const overIndex = lists[to].indexOf(String(overId))
  const index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : lists[to].length
  const target = [...lists[to].slice(0, index), sid, ...lists[to].slice(index)]
  return from ? { ...lists, [from]: lists[from].filter((x) => x !== sid), [to]: target } : { ...lists, [to]: target }
}

/** Dropped on `overId`: the order of the list it ends up in. Dropping on a row of the same list takes that row's place. */
export function dropOrder(lists: ZoneLists, sid: string, overId: UniqueIdentifier): { zone: Zone; order: string[] } | null {
  const zone = zoneOf(lists, sid)
  if (!zone) return null
  const sameList = !isZone(overId) && zoneOf(lists, overId) === zone
  return { zone, order: sameList ? arrayMove(lists[zone], lists[zone].indexOf(sid), lists[zone].indexOf(String(overId))) : lists[zone] }
}

/**
 * ↑/↓: one place up or down. Past the end of a list it crosses to the other day — first in
 * tomorrow going down, last in today going up.
 */
export function nudgeTarget(lists: ZoneLists, sid: string, step: -1 | 1): { zone: Zone; order: string[]; crossed: boolean } | null {
  const zone = zoneOf(lists, sid)
  if (!zone) return null
  const from = lists[zone].indexOf(sid)
  const to = from + step
  if (to >= 0 && to < lists[zone].length) return { zone, order: arrayMove(lists[zone], from, to), crossed: false }
  const next = ZONES[ZONES.indexOf(zone) + step]
  if (!next) return null
  return { zone: next, order: step > 0 ? [sid, ...lists[next]] : [...lists[next], sid], crossed: true }
}
