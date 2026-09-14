import { describe, it, expect } from 'vitest'
import { isChunkLoadError } from '../route-chunk-error'

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://sushigo.local/assets/movimientos-abc123.js',
    'error loading dynamically imported module',
    'Importing a module script failed',
    'Loading chunk 4 failed',
  ])('recognizes %s as a chunk-load failure', (message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true)
  })

  it('does not flag an unrelated error', () => {
    expect(isChunkLoadError(new Error('Network Error'))).toBe(false)
  })

  it('does not flag a non-Error value', () => {
    expect(isChunkLoadError('boom')).toBe(false)
    expect(isChunkLoadError(undefined)).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
  })
})
