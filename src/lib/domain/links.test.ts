import { describe, expect, it } from 'vitest'
import { PROBLEMS, problemById } from '@/data/problems'
import { idOf } from '@/test/builders'
import { practiceLink } from './links'

describe('practiceLink', () => {
  it('opens LeetCode for free problems', () => {
    expect(practiceLink(problemById.get(idOf('Two Sum'))!)).toEqual({ site: 'LeetCode', url: 'https://leetcode.com/problems/two-sum/' })
  })

  it("opens NeetCode's free copy when LeetCode needs Premium", () => {
    const premium = PROBLEMS.find((p) => p.premium)!
    expect(practiceLink(premium)).toEqual({ site: 'NeetCode', url: expect.stringContaining(`neetcode.io/problems/${premium.neetcode}`) })
  })
})
