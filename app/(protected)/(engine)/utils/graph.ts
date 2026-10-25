/** Adjacency lists of a graph given by its edges. */
export type Adjacency = Map<string, string[]>

export function buildAdjacency(nodeIds: readonly string[], edges: readonly [string, string][]): Adjacency {
  const adjacency: Adjacency = new Map(nodeIds.map((id) => [id, []]))

  for (const [a, b] of edges) {
    adjacency.get(a)?.push(b)
    adjacency.get(b)?.push(a)
  }

  return adjacency
}

/**
 * Number of trail steps from the closest of `sources` to every node it reaches
 * (breadth-first search). `canEnter` can close nodes (their distance is not set).
 */
export function hopDistances(
  adjacency: Adjacency,
  sources: readonly string[],
  canEnter: (id: string) => boolean = () => true
): Map<string, number> {
  const distances = new Map<string, number>()
  const queue: string[] = []

  for (const source of sources) {
    distances.set(source, 0)
    queue.push(source)
  }

  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]
    const distance = distances.get(current)! + 1

    for (const next of adjacency.get(current) ?? []) {
      if (!distances.has(next) && canEnter(next)) {
        distances.set(next, distance)
        queue.push(next)
      }
    }
  }

  return distances
}

/** Union–find over string ids (Kruskal). */
export class DisjointSet {
  private parents = new Map<string, string>()

  find(id: string): string {
    let root = id

    while (this.parents.has(root) && this.parents.get(root) !== root) {
      root = this.parents.get(root)!
    }

    // Path compression.
    let current = id

    while (current !== root) {
      const next = this.parents.get(current)!

      this.parents.set(current, root)
      current = next
    }

    return root
  }

  /** Joins the sets of a and b; false when they were already together. */
  union(a: string, b: string): boolean {
    const rootA = this.find(a)
    const rootB = this.find(b)

    if (rootA === rootB) {
      return false
    }

    this.parents.set(rootA, rootB)

    return true
  }
}
