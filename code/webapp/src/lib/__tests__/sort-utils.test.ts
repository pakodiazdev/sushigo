import { describe, it, expect } from 'vitest'
import { sortSpecsToParams, parseSortParam, serializeSorts } from '@/lib/sort-utils'

describe('sortSpecsToParams', () => {
  it('returns empty object when no sorts', () => {
    expect(sortSpecsToParams([])).toEqual({})
  })

  it('serializes a single sort spec', () => {
    expect(sortSpecsToParams([{ key: 'name', direction: 'asc' }])).toEqual({
      sort: ['name:asc'],
    })
  })

  it('serializes multiple sort specs', () => {
    expect(
      sortSpecsToParams([
        { key: 'name', direction: 'asc' },
        { key: 'created_at', direction: 'desc' },
      ])
    ).toEqual({ sort: ['name:asc', 'created_at:desc'] })
  })
})

describe('parseSortParam', () => {
  it('returns empty array when param is undefined', () => {
    expect(parseSortParam(undefined)).toEqual([])
  })

  it('returns empty array when param is empty string', () => {
    expect(parseSortParam('')).toEqual([])
  })

  it('parses a single sort param', () => {
    expect(parseSortParam('name:asc')).toEqual([{ key: 'name', direction: 'asc' }])
  })

  it('parses desc direction', () => {
    expect(parseSortParam('created_at:desc')).toEqual([
      { key: 'created_at', direction: 'desc' },
    ])
  })

  it('defaults direction to asc when missing', () => {
    expect(parseSortParam('name')).toEqual([{ key: 'name', direction: 'asc' }])
  })

  it('parses multiple comma-separated sorts', () => {
    expect(parseSortParam('name:asc,created_at:desc')).toEqual([
      { key: 'name', direction: 'asc' },
      { key: 'created_at', direction: 'desc' },
    ])
  })
})

describe('serializeSorts', () => {
  it('returns undefined when sorts array is empty', () => {
    expect(serializeSorts([])).toBeUndefined()
  })

  it('serializes a single sort', () => {
    expect(serializeSorts([{ key: 'name', direction: 'asc' }])).toBe('name:asc')
  })

  it('serializes multiple sorts as comma-separated string', () => {
    expect(
      serializeSorts([
        { key: 'name', direction: 'asc' },
        { key: 'id', direction: 'desc' },
      ])
    ).toBe('name:asc,id:desc')
  })
})
