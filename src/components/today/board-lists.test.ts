import { describe, expect, it } from 'vitest'
import { dropOrder, moveAcross, nudgeTarget, originOf, problemIdOf, sortableId, zoneOf, type ZoneLists } from './board-lists'

const lists: ZoneLists = { today: ['today:1', 'today:2', 'today:3'], tomorrow: ['tomorrow:7', 'tomorrow:8'] }

describe('sortable ids', () => {
  it('carry the list a row started in and the problem it holds', () => {
    expect(sortableId('tomorrow', 42)).toBe('tomorrow:42')
    expect(problemIdOf('tomorrow:42')).toBe(42)
    expect(originOf('tomorrow:42')).toBe('tomorrow')
  })

  it('find the list a row is in now, or the list itself when it is the drop target', () => {
    expect(zoneOf(lists, 'today:2')).toBe('today')
    expect(zoneOf(lists, 'tomorrow')).toBe('tomorrow')
    expect(zoneOf(lists, 'today:9')).toBeUndefined()
  })
})

describe('moveAcross', () => {
  it('slots a row into the other list before the row it is over', () => {
    expect(moveAcross(lists, 'today:2', 'tomorrow', 'tomorrow:8', false)).toEqual({
      today: ['today:1', 'today:3'],
      tomorrow: ['tomorrow:7', 'today:2', 'tomorrow:8'],
    })
  })

  it('goes after that row when dragged past its middle, and to the end when over the list itself', () => {
    expect(moveAcross(lists, 'today:2', 'tomorrow', 'tomorrow:8', true).tomorrow).toEqual(['tomorrow:7', 'tomorrow:8', 'today:2'])
    expect(moveAcross(lists, 'today:2', 'tomorrow', 'tomorrow', false).tomorrow).toEqual(['tomorrow:7', 'tomorrow:8', 'today:2'])
  })
})

describe('dropOrder', () => {
  it('takes the place of the row it is dropped on', () => {
    expect(dropOrder(lists, 'today:1', 'today:3')).toEqual({ zone: 'today', order: ['today:2', 'today:3', 'today:1'] })
  })

  it('keeps the order when dropped on the list itself or nowhere new', () => {
    expect(dropOrder(lists, 'today:1', 'today')).toEqual({ zone: 'today', order: lists.today })
    expect(dropOrder(lists, 'today:9', 'today:1')).toBeNull()
  })
})

describe('nudgeTarget', () => {
  it('moves one place within a list', () => {
    expect(nudgeTarget(lists, 'today:2', -1)).toEqual({ zone: 'today', order: ['today:2', 'today:1', 'today:3'], crossed: false })
    expect(nudgeTarget(lists, 'today:2', 1)).toEqual({ zone: 'today', order: ['today:1', 'today:3', 'today:2'], crossed: false })
  })

  it('crosses to the top of tomorrow going down, and to the end of today going up', () => {
    expect(nudgeTarget(lists, 'today:3', 1)).toEqual({ zone: 'tomorrow', order: ['today:3', 'tomorrow:7', 'tomorrow:8'], crossed: true })
    expect(nudgeTarget(lists, 'tomorrow:7', -1)).toEqual({ zone: 'today', order: ['today:1', 'today:2', 'today:3', 'tomorrow:7'], crossed: true })
  })

  it('stops at the outer ends', () => {
    expect(nudgeTarget(lists, 'today:1', -1)).toBeNull()
    expect(nudgeTarget(lists, 'tomorrow:8', 1)).toBeNull()
  })
})
