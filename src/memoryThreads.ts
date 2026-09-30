/**
 * Read-only index of connections the user has explicitly made between
 * records. No text similarity or server calls; private, trashed and unopened
 * capsule records are excluded before the connection graph is constructed.
 */
export type MemoryThreadRecord = {
  id: string
  text: string
  area: string
  createdAt: string
  updatedAt?: string
  relatedIds?: string[]
  private?: boolean
  trashedAt?: string
  revealAt?: string
  capsuleOpenedAt?: string
}

export type MemoryThread<T extends MemoryThreadRecord> = {
  id: string
  lead: T
  members: T[]
  lastActivity: number
}

export function deriveMemoryThreads<T extends MemoryThreadRecord>(
  records: readonly T[],
  visible: (record: T) => boolean,
  now: number = Date.now(),
  limit = 3,
): MemoryThread<T>[] {
  if (!Number.isFinite(now) || !Number.isInteger(limit) || limit < 1) return []
  const safe = new Map<string, T>()
  for (const record of records) {
    if (!record?.id || record.private || record.trashedAt || !visible(record)) continue
    if (record.revealAt && !record.capsuleOpenedAt) {
      const revealAt = Date.parse(record.revealAt)
      if (!Number.isFinite(revealAt) || revealAt > now) continue
    }
    safe.set(record.id, record)
  }
  const edges = new Map([...safe.keys()].map(id => [id, new Set<string>()]))
  for (const record of safe.values()) {
    for (const relatedId of record.relatedIds ?? []) {
      if (relatedId === record.id || !safe.has(relatedId)) continue
      edges.get(record.id)?.add(relatedId)
      edges.get(relatedId)?.add(record.id)
    }
  }
  const timestamp = (r: T) => {
    const updated = Date.parse(r.updatedAt ?? '')
    const created = Date.parse(r.createdAt)
    return Number.isFinite(updated) ? updated : Number.isFinite(created) ? created : 0
  }
  const discovered = new Set<string>()
  const threads: MemoryThread<T>[] = []
  for (const id of safe.keys()) {
    if (discovered.has(id) || !edges.get(id)?.size) continue
    const stack = [id]
    const component: T[] = []
    while (stack.length) {
      const current = stack.pop()!
      if (discovered.has(current)) continue
      discovered.add(current)
      const member = safe.get(current)
      if (member) component.push(member)
      for (const neighbor of edges.get(current) ?? []) {
        if (!discovered.has(neighbor)) stack.push(neighbor)
      }
    }
    if (component.length < 2) continue
    component.sort((a, b) => timestamp(b) - timestamp(a) || a.id.localeCompare(b.id))
    threads.push({
      id: component.map(record => record.id).sort().join(':'),
      lead: component[0],
      members: component,
      lastActivity: timestamp(component[0]),
    })
  }
  return threads
    .sort((a, b) => b.lastActivity - a.lastActivity || a.id.localeCompare(b.id))
    .slice(0, Math.min(limit, 5))
}
