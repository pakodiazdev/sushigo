import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
    it('merges class names', () => {
        expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('handles conditional classes', () => {
        expect(cn('base', true && 'active', false && 'hidden')).toBe('base active')
    })

    it('handles undefined and null', () => {
        expect(cn('base', undefined, null)).toBe('base')
    })

    it('merges tailwind classes correctly', () => {
        expect(cn('p-4', 'p-2')).toBe('p-2')
    })

    it('removes duplicate classes', () => {
        expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })

    it('handles arrays', () => {
        expect(cn(['foo', 'bar'])).toBe('foo bar')
    })

    it('handles objects', () => {
        expect(cn({ foo: true, bar: false })).toBe('foo')
    })

    it('returns empty string when no inputs', () => {
        expect(cn()).toBe('')
    })
})
