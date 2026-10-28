// The saved data as separate items, one Firestore document each (ADR-006): a change uploads only the
// items it touched. Pure, and no Firebase: the engine and its tests use these on plain data.
import { TRACKER_DEFAULTS } from '@/lib/_consts/defaults'
import { normalize } from '@/lib/store'
import type { TrackerData } from '@/types'

/** Item id → its value. A missing item and `null` both mean "not there" (deleted). */
export type Items = Map<string, unknown>

/** The goals and the interview date sync. The running timer and the welcome-back day stay on each device. */
const SETTINGS = ['weekdayGoal', 'weekendGoal', 'weeklyDays', 'coreFirst', 'interview'] as const
type Settings = Pick<TrackerData, (typeof SETTINGS)[number]>

const settingsOf = (data: TrackerData): Settings => Object.fromEntries(SETTINGS.map((k) => [k, data[k]])) as Settings

/** Everything about one problem, in one item, so its status, review, note and complexity stay together. */
function problemOf(data: TrackerData, id: number) {
  return {
    ...(data.progress[id] && { progress: data.progress[id] }),
    ...(data.reviews[id] && { review: data.reviews[id] }),
    ...(data.notes[id] !== undefined && { note: data.notes[id] }),
    ...(data.complexity[id] && { complexity: data.complexity[id] }),
  }
}

const problemIds = (data: TrackerData) =>
  new Set([data.progress, data.reviews, data.notes, data.complexity].flatMap((byId) => Object.keys(byId).map(Number)))

/** The data as items: `problem:<id>`, `attempt:<key>`, `study:<key>`, `plan:<day>`, `backlog` and `settings`. */
export function itemsOf(data: TrackerData): Items {
  const items: Items = new Map()
  for (const id of problemIds(data)) items.set(`problem:${id}`, problemOf(data, id))
  for (const a of data.attempts) items.set(`attempt:${a.key}`, a)
  for (const s of data.studies) items.set(`study:${s.key}`, s)
  for (const [day, plan] of Object.entries(data.plans)) items.set(`plan:${day}`, plan)
  items.set('backlog', data.backlog)
  items.set('settings', settingsOf(data))
  return items
}

/** The ids of the items that differ between two states of the store, found by reference, so it stays cheap. */
export function changedItemIds(prev: TrackerData, next: TrackerData): string[] {
  const ids = new Set<string>()
  const byId = ['progress', 'reviews', 'notes', 'complexity'] as const
  for (const field of byId) {
    if (prev[field] === next[field]) continue
    for (const id of new Set([...Object.keys(prev[field]), ...Object.keys(next[field])])) {
      if (prev[field][Number(id)] !== next[field][Number(id)]) ids.add(`problem:${id}`)
    }
  }
  for (const [field, prefix] of [['attempts', 'attempt'], ['studies', 'study']] as const) {
    if (prev[field] === next[field]) continue
    const before = new Map<string, unknown>(prev[field].map((x) => [x.key, x]))
    const after = new Map<string, unknown>(next[field].map((x) => [x.key, x]))
    for (const key of new Set([...before.keys(), ...after.keys()])) if (before.get(key) !== after.get(key)) ids.add(`${prefix}:${key}`)
  }
  if (prev.plans !== next.plans) {
    for (const day of new Set([...Object.keys(prev.plans), ...Object.keys(next.plans)])) {
      if (prev.plans[day] !== next.plans[day]) ids.add(`plan:${day}`)
    }
  }
  if (prev.backlog !== next.backlog) ids.add('backlog')
  if (SETTINGS.some((k) => prev[k] !== next[k])) ids.add('settings')
  return [...ids]
}

/** `data` with these items set (or removed, for `null`), checked by `normalize()` like any saved data. */
export function withItems(data: TrackerData, changes: Iterable<readonly [string, unknown]>): TrackerData {
  const progress = { ...data.progress }
  const reviews = { ...data.reviews }
  const notes = { ...data.notes }
  const complexity = { ...data.complexity }
  const plans = { ...data.plans }
  const attempts = new Map<string, unknown>(data.attempts.map((a) => [a.key, a]))
  const studies = new Map<string, unknown>(data.studies.map((s) => [s.key, s]))
  let backlog: unknown = data.backlog
  let settings: Record<string, unknown> = settingsOf(data)

  for (const [itemId, value] of changes) {
    const at = itemId.indexOf(':')
    const kind = at < 0 ? itemId : itemId.slice(0, at)
    const key = itemId.slice(at + 1)
    const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
    if (kind === 'problem') {
      const id = Number(key)
      for (const byId of [progress, reviews, notes, complexity] as Record<number, unknown>[]) delete byId[id]
      if (record?.progress !== undefined) (progress as Record<number, unknown>)[id] = record.progress
      if (record?.review !== undefined) (reviews as Record<number, unknown>)[id] = record.review
      if (record?.note !== undefined) (notes as Record<number, unknown>)[id] = record.note
      if (record?.complexity !== undefined) (complexity as Record<number, unknown>)[id] = record.complexity
    } else if (kind === 'attempt') {
      if (record) attempts.set(key, record)
      else attempts.delete(key)
    } else if (kind === 'study') {
      if (record) studies.set(key, record)
      else studies.delete(key)
    } else if (kind === 'plan') {
      if (Array.isArray(value)) (plans as Record<string, unknown>)[key] = value
      else delete plans[key]
    } else if (kind === 'backlog') {
      backlog = value ?? []
    } else if (kind === 'settings') {
      settings = record ?? settingsOf(TRACKER_DEFAULTS)
    }
  }

  return normalize({
    ...data,
    ...settings,
    progress,
    reviews,
    notes,
    complexity,
    plans,
    backlog,
    attempts: inOrder([...attempts.values()]),
    studies: inOrder([...studies.values()]),
  })
}

/** Oldest first, as the store keeps them. */
function inOrder(list: unknown[]) {
  const at = (x: unknown) => (typeof x === 'object' && x !== null && 'at' in x && typeof x.at === 'string' ? x.at : '')
  return list.sort((a, b) => at(a).localeCompare(at(b)))
}

/** A fresh start that keeps this device's own parts: the running timer and the welcome-back day. */
export function blankFor(data: TrackerData): TrackerData {
  return { ...TRACKER_DEFAULTS, timer: data.timer, comebackAt: data.comebackAt }
}

/** The items that hold something: default settings, an empty backlog or an empty day count as nothing. */
export function meaningful(items: Items): Items {
  const empty = itemsOf(TRACKER_DEFAULTS)
  return new Map(
    [...items].filter(([id, value]) => value !== null && !(Array.isArray(value) && value.length === 0) && !(empty.has(id) && same(value, empty.get(id)))),
  )
}

/** Deep equality for plain JSON values, whatever the order of their keys. */
export function same(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b)
}

function stable(value: unknown): string {
  if (value === undefined || value === null) return 'null'
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    return `{${entries
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
