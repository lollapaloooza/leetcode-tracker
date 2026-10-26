import { leetcodeUrl, neetcodeUrl, type Problem } from '@/data/problems'

/** The two places a problem can be solved. */
export type Site = 'leetcode' | 'neetcode'

export const SITE_NAME: Record<Site, string> = { leetcode: 'LeetCode', neetcode: 'NeetCode' }

export const siteUrl = (problem: Problem, site: Site) => (site === 'leetcode' ? leetcodeUrl(problem) : neetcodeUrl(problem))

/** Where to solve a problem: LeetCode, or NeetCode's free copy when LeetCode needs Premium. */
export function practiceLink(problem: Problem): { site: 'LeetCode' | 'NeetCode'; url: string } {
  return problem.premium ? { site: 'NeetCode', url: neetcodeUrl(problem) } : { site: 'LeetCode', url: leetcodeUrl(problem) }
}
