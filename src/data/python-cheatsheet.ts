export interface Snippet {
  title: string
  code: string
  /** The JavaScript you'd reach for, as a bridge */
  js?: string
  note?: string
}

export interface CheatSection {
  id: string
  title: string
  snippets: Snippet[]
}

export const PYTHON_CHEATSHEET: CheatSection[] = [
  {
    id: 'basics',
    title: 'Basics',
    snippets: [
      {
        title: 'Variables & values',
        code: `x = 5
name = "Ann"
ok = True        # capitalized
nothing = None   # like null`,
        js: 'let x = 5; true; null',
      },
      {
        title: 'Math',
        code: `7 // 2      # 3   floor division
7 % 2       # 1
2 ** 10     # 1024
abs(-3), min(a, b), max(a, b)
float("inf"), -float("inf")`,
        js: 'Math.floor(7 / 2), 2 ** 10, Infinity',
      },
      {
        title: 'Division gotcha',
        code: `-7 // 2       # -4  (floors toward -inf)
int(-7 / 2)   # -3  (truncates like JS)`,
        note: 'Use int(a / b) when a problem says "truncate toward zero".',
      },
      {
        title: 'Logic & comparisons',
        code: `a and b, a or b, not a
0 <= i < n              # chained comparison
x if cond else y        # ternary
x is None               # use "is" only for None`,
        js: 'a && b, a || b, !a, cond ? x : y',
      },
      {
        title: 'Truthiness',
        code: `if not stack:     # empty list/str/dict/set, 0, None are falsy
    ...
if nums:          # non-empty
    ...`,
      },
      {
        title: 'Print & f-strings',
        code: `print(i, nums)
print(f"{i}: {nums[i]}")`,
        js: 'console.log(`${i}: ${nums[i]}`)',
      },
    ],
  },
  {
    id: 'strings',
    title: 'Strings',
    snippets: [
      {
        title: 'Index, slice, reverse',
        code: `s[0], s[-1]      # first, last
s[1:4]           # chars 1..3
s[::-1]          # reversed
len(s)`,
        js: "s.at(-1), s.slice(1, 4), [...s].reverse().join('')",
      },
      {
        title: 'Split & join',
        code: `words = s.split()        # on whitespace
parts = s.split(",")
" ".join(words)
"".join(chars)`,
        js: "s.split(' '), words.join(' ')",
      },
      {
        title: 'Character checks',
        code: `c.isalnum(), c.isalpha(), c.isdigit()
c.lower(), c.upper(), s.strip()`,
      },
      {
        title: 'Char ↔ code',
        code: `ord("a")               # 97
chr(97)                # "a"
ord(c) - ord("a")      # 0..25 letter index`,
        js: "'a'.charCodeAt(0), String.fromCharCode(97)",
      },
      {
        title: 'Search',
        code: `"ab" in s
s.find("x")        # -1 if missing
s.startswith("ab"), s.count("a")`,
        js: "s.includes('ab'), s.indexOf('x')",
      },
      {
        title: 'Build strings efficiently',
        code: `res = []
for c in s:
    res.append(c)
return "".join(res)`,
        note: 'Strings are immutable — += in a loop can be O(n²).',
      },
    ],
  },
  {
    id: 'lists',
    title: 'Lists',
    snippets: [
      {
        title: 'Create',
        code: `nums = [1, 2, 3]
zeros = [0] * n
grid = [[0] * cols for _ in range(rows)]`,
        note: '[[0] * cols] * rows shares ONE row across all rows — always use the comprehension.',
      },
      {
        title: 'Add & remove',
        code: `nums.append(x)       # push
nums.pop()           # pop last
nums.pop(i)          # remove at i
nums.insert(i, x)
nums.remove(x)       # first match`,
        js: 'push, pop, splice(i, 1), splice(i, 0, x)',
      },
      {
        title: 'Slices & copies',
        code: `nums[-1]         # last
nums[i:j]        # new list
nums[:]          # shallow copy
nums[::-1]       # reversed copy`,
        js: 'nums.at(-1), nums.slice(i, j), [...nums]',
      },
      {
        title: 'Sort',
        code: `nums.sort()                        # in place
nums.sort(reverse=True)
new = sorted(nums)                 # returns a new list
pairs.sort(key=lambda p: p[1])
words.sort(key=lambda w: (-len(w), w))   # multi-key`,
        js: 'nums.sort((a, b) => a - b)',
        note: 'Numbers sort numerically by default — no comparator needed.',
      },
      {
        title: 'Aggregate',
        code: `sum(nums), min(nums), max(nums)
max(words, key=len)
any(x < 0 for x in nums)
all(x > 0 for x in nums)`,
        js: 'nums.some(...), nums.every(...)',
      },
      {
        title: 'Comprehensions',
        code: `[x * 2 for x in nums if x > 0]
[[r, c] for r in range(R) for c in range(C)]`,
        js: 'nums.filter(x => x > 0).map(x => x * 2)',
      },
      {
        title: 'Iterate',
        code: `for i, x in enumerate(nums):
    ...
for a, b in zip(xs, ys):
    ...
for x in reversed(nums):
    ...`,
        js: 'nums.forEach((x, i) => ...)',
      },
      {
        title: 'Unpack & swap',
        code: `a, b = b, a
first, *rest = nums
l, r = 0, len(nums) - 1`,
        js: '[a, b] = [b, a]',
      },
    ],
  },
  {
    id: 'hashing',
    title: 'Dicts & sets',
    snippets: [
      {
        title: 'Dict basics',
        code: `seen = {}
seen[key] = value
seen.get(key, 0)          # default if missing
key in seen
del seen[key]
for k, v in seen.items():
    ...`,
        js: 'map.set(k, v), map.get(k) ?? 0, map.has(k)',
      },
      {
        title: 'Count things',
        code: `count = {}
for x in nums:
    count[x] = count.get(x, 0) + 1`,
      },
      {
        title: 'Counter',
        code: `from collections import Counter
cnt = Counter("aab")        # {'a': 2, 'b': 1}
cnt.most_common(2)          # [('a', 2), ('b', 1)]
Counter(s) == Counter(t)    # anagram check`,
      },
      {
        title: 'defaultdict',
        code: `from collections import defaultdict
groups = defaultdict(list)
groups[key].append(word)    # no KeyError`,
      },
      {
        title: 'Keys must be hashable',
        code: `visited = {(r, c)}               # tuple ok
key = tuple(sorted(word))        # list → tuple for a key`,
        note: 'Lists can’t be dict keys or set members — convert to tuple.',
      },
      {
        title: 'Sets',
        code: `seen = set()
seen.add(x)
seen.discard(x)       # no error if missing
x in seen             # O(1)
a | b, a & b, a - b   # union, intersect, diff`,
        js: 'new Set(), set.has(x), set.delete(x)',
      },
      {
        title: 'Dict comprehension',
        code: `index = {v: i for i, v in enumerate(nums)}`,
      },
    ],
  },
  {
    id: 'loops',
    title: 'Loops',
    snippets: [
      {
        title: 'range',
        code: `for i in range(n):            # 0 .. n-1
for i in range(1, n + 1):     # 1 .. n
for i in range(n - 1, -1, -1):  # n-1 .. 0
for i in range(0, n, 2):      # step 2`,
        js: 'for (let i = 0; i < n; i++)',
      },
      {
        title: 'while & two pointers',
        code: `l, r = 0, len(nums) - 1
while l < r:
    ...
    l += 1          # no i++ in Python`,
      },
      {
        title: 'Control',
        code: `break, continue
pass            # empty block placeholder`,
      },
    ],
  },
  {
    id: 'functions',
    title: 'Functions & classes',
    snippets: [
      {
        title: 'LeetCode template',
        code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        ...
        return [i, j]`,
        note: 'List, Optional, etc. are pre-imported on LeetCode. Call helpers as self.helper().',
      },
      {
        title: 'Nested helper + nonlocal',
        code: `def diameter(self, root):
    best = 0
    def dfs(node):
        nonlocal best          # needed to reassign outer var
        if not node:
            return 0
        l, r = dfs(node.left), dfs(node.right)
        best = max(best, l + r)
        return 1 + max(l, r)
    dfs(root)
    return best`,
      },
      {
        title: 'Lambda',
        code: `key=lambda x: x[0]`,
        js: 'x => x[0]',
      },
      {
        title: 'Memoize (DP)',
        code: `from functools import cache

@cache
def dp(i):
    if i <= 1:
        return 1
    return dp(i - 1) + dp(i - 2)`,
      },
      {
        title: 'Node classes',
        code: `class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

dummy = ListNode()      # dummy head trick`,
      },
    ],
  },
  {
    id: 'stack-queue',
    title: 'Stack & queue',
    snippets: [
      {
        title: 'Stack = list',
        code: `stack = []
stack.append(x)
top = stack[-1]      # peek
stack.pop()`,
      },
      {
        title: 'Queue = deque',
        code: `from collections import deque
q = deque([start])
q.append(x)
q.popleft()          # O(1) — list.pop(0) is O(n)
q.appendleft(x)`,
        js: 'queue.push(x), queue.shift()',
      },
      {
        title: 'BFS by level',
        code: `q = deque([root])
while q:
    for _ in range(len(q)):
        node = q.popleft()
        if node.left: q.append(node.left)
        if node.right: q.append(node.right)`,
      },
    ],
  },
  {
    id: 'heap',
    title: 'Heap',
    snippets: [
      {
        title: 'Min-heap',
        code: `import heapq
heap = []
heapq.heappush(heap, x)
smallest = heap[0]      # peek
heapq.heappop(heap)
heapq.heapify(nums)     # O(n), in place`,
      },
      {
        title: 'Max-heap: negate',
        code: `heapq.heappush(heap, -x)
largest = -heapq.heappop(heap)`,
      },
      {
        title: 'Tuples compare by first item',
        code: `heapq.heappush(heap, (dist, node))
d, node = heapq.heappop(heap)`,
      },
      {
        title: 'Top k',
        code: `for x in nums:
    heapq.heappush(heap, x)
    if len(heap) > k:
        heapq.heappop(heap)     # heap keeps k largest

heapq.nlargest(k, nums)`,
      },
    ],
  },
  {
    id: 'binary-search',
    title: 'Binary search',
    snippets: [
      {
        title: 'Template',
        code: `l, r = 0, len(nums) - 1
while l <= r:
    m = (l + r) // 2
    if nums[m] == target:
        return m
    if nums[m] < target:
        l = m + 1
    else:
        r = m - 1
return -1`,
      },
      {
        title: 'bisect',
        code: `from bisect import bisect_left, bisect_right
bisect_left(a, x)    # first index with a[i] >= x
bisect_right(a, x)   # first index with a[i] > x`,
      },
    ],
  },
  {
    id: 'graphs',
    title: 'Trees & graphs',
    snippets: [
      {
        title: 'Tree DFS',
        code: `def depth(node):
    if not node:
        return 0
    return 1 + max(depth(node.left), depth(node.right))`,
      },
      {
        title: 'Adjacency list',
        code: `graph = defaultdict(list)
for a, b in edges:
    graph[a].append(b)
    graph[b].append(a)`,
      },
      {
        title: 'Grid neighbors',
        code: `for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols and (nr, nc) not in seen:
        ...`,
      },
      {
        title: 'Deep recursion',
        code: `import sys
sys.setrecursionlimit(10**6)`,
        note: 'Default limit is ~1000 frames — raise it or go iterative for big inputs.',
      },
    ],
  },
  {
    id: 'bits',
    title: 'Bits & math',
    snippets: [
      {
        title: 'Bit ops',
        code: `a & b, a | b, a ^ b, ~a, a << 1, a >> 1
x & 1              # odd?
x & (x - 1)        # drop lowest set bit
bin(x).count("1")  # popcount`,
      },
      {
        title: 'No overflow',
        code: `x & 0xFFFFFFFF     # emulate 32-bit`,
        note: 'Python ints never overflow — mask when a problem expects 32-bit behavior.',
      },
      {
        title: 'Handy math',
        code: `q, r = divmod(17, 5)       # 3, 2
import math
math.gcd(a, b), math.isqrt(n)
(a + b - 1) // b           # ceil division`,
      },
    ],
  },
  {
    id: 'gotchas',
    title: 'Complexity & gotchas',
    snippets: [
      {
        title: 'Costs that bite',
        code: `x in list       # O(n)  → use a set: O(1)
list.pop(0)     # O(n)  → deque.popleft()
nums[1:]        # O(n)  copies
s += c          # O(n)  per op on strings`,
      },
      {
        title: 'Copies',
        code: `b = a           # same list!
b = a[:]        # shallow copy
import copy
b = copy.deepcopy(grid)`,
      },
      {
        title: 'Mutable default args',
        code: `def f(x, memo=None):
    memo = memo if memo is not None else {}`,
        note: 'def f(memo={}) shares one dict across every call.',
      },
    ],
  },
]
