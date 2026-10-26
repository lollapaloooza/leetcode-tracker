import { describe, expect, it } from 'vitest'
import { STATUSES } from '@/lib/_consts/enums'
import type { Result, Status } from '@/types'
import { isSolved, statusAfter } from './status'

describe('isSolved', () => {
  it('counts solving with help as solved', () => {
    expect(STATUSES.filter(isSolved)).toEqual(['solved', 'helped'])
    expect(isSolved(undefined)).toBe(false)
  })
})

describe('statusAfter', () => {
  const cases: [Status | undefined, Result, Status][] = [
    [undefined, 'solved', 'solved'],
    [undefined, 'helped', 'helped'],
    [undefined, 'failed', 'attempted'],
    ['attempted', 'helped', 'helped'],
    ['helped', 'solved', 'solved'],
    // A logged attempt never lowers a status — the review schedule tracks the slip instead.
    ['solved', 'helped', 'solved'],
    ['solved', 'failed', 'solved'],
    ['helped', 'failed', 'helped'],
  ]
  it.each(cases)('%s + %s → %s', (current, result, expected) => {
    expect(statusAfter(current, result)).toBe(expected)
  })
})
