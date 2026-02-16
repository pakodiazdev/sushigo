import type { SortSpec, SortDirection } from '@/components/ui/data-grid'

export function sortSpecsToParams(sorts: SortSpec[]): Record<string, string[]> {
  if (!sorts.length) return {}
  return { sort: sorts.map(s => `${s.key}:${s.direction}`) }
}

export function parseSortParam(param?: string): SortSpec[] {
  if (!param) return []
  return param.split(',').map(s => {
    const parts = s.split(':')
    return { key: parts[0]!, direction: (parts[1] as SortDirection) || 'asc' }
  })
}

export function serializeSorts(sorts: SortSpec[]): string | undefined {
  if (!sorts.length) return undefined
  return sorts.map(s => `${s.key}:${s.direction}`).join(',')
}
