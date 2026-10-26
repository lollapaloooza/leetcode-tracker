import { leetcodeUrl, neetcodeUrl, type Problem } from '@/data/problems'

/** Where to solve a problem: LeetCode, or NeetCode's free copy when LeetCode needs Premium. */
export function practiceLink(problem: Problem): { site: 'LeetCode' | 'NeetCode'; url: string } {
  return problem.premium ? { site: 'NeetCode', url: neetcodeUrl(problem) } : { site: 'LeetCode', url: leetcodeUrl(problem) }
}
