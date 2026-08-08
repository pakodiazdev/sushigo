/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, cleanup, act } from '@testing-library/react'
import { useDeactivateForm } from '../use-deactivate-form'

const mockUseBusinessDate = vi.fn<() => string | null>(() => null)
vi.mock('@/stores/clock.store', () => ({
    useBusinessDate: () => mockUseBusinessDate(),
}))

// Pinned mid-day instant (16:00 CDMX / 22:00 UTC, same calendar day in both) so
// "today" is deterministic regardless of when the suite actually runs — avoids
// flakiness during the ~6h/day window where UTC and CDMX disagree on the date.
beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T22:00:00Z'))
    mockUseBusinessDate.mockReturnValue(null)
})

afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe('useDeactivateForm', () => {
    describe('today computation', () => {
        it('returns today date in ISO format (YYYY-MM-DD)', () => {
            const { result } = renderHook(() => useDeactivateForm())
            const today = new Date().toISOString().slice(0, 10)
            expect(result.current.today).toBe(today)
        })
    })

    describe('form initialization', () => {
        it('initializes end_date with today', () => {
            const { result } = renderHook(() => useDeactivateForm())
            const today = new Date().toISOString().slice(0, 10)
            expect(result.current.form.getValues('end_date')).toBe(today)
        })

        it('initializes termination_reason as empty string', () => {
            const { result } = renderHook(() => useDeactivateForm())
            expect(result.current.form.getValues('termination_reason')).toBe('')
        })
    })

    describe('validation', () => {
        it('requires end_date to be non-empty', async () => {
            const { result } = renderHook(() => useDeactivateForm())

            // Set empty end_date
            act(() => {
                result.current.form.setValue('end_date', '')
            })

            // Trigger validation
            let isValid = false
            await act(async () => {
                isValid = await result.current.form.trigger('end_date')
            })

            expect(isValid).toBe(false)
        })

        it('rejects future dates for end_date', async () => {
            const { result } = renderHook(() => useDeactivateForm())

            // Set future date
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 1)
            const futureDateStr = futureDate.toISOString().slice(0, 10)

            act(() => {
                result.current.form.setValue('end_date', futureDateStr)
            })

            // Trigger validation
            let isValid = false
            await act(async () => {
                isValid = await result.current.form.trigger('end_date')
            })

            expect(isValid).toBe(false)
        })

        it('accepts today date', async () => {
            const { result } = renderHook(() => useDeactivateForm())
            const today = new Date().toISOString().slice(0, 10)

            act(() => {
                result.current.form.setValue('end_date', today)
            })

            let isValid = false
            await act(async () => {
                isValid = await result.current.form.trigger('end_date')
            })

            expect(isValid).toBe(true)
        })

        it('accepts past date', async () => {
            const { result } = renderHook(() => useDeactivateForm())
            const pastDate = new Date()
            pastDate.setDate(pastDate.getDate() - 7)
            const pastDateStr = pastDate.toISOString().slice(0, 10)

            act(() => {
                result.current.form.setValue('end_date', pastDateStr)
            })

            let isValid = false
            await act(async () => {
                isValid = await result.current.form.trigger('end_date')
            })

            expect(isValid).toBe(true)
        })

        it('allows termination_reason to be empty', async () => {
            const { result } = renderHook(() => useDeactivateForm())

            act(() => {
                result.current.form.setValue('termination_reason', '')
            })

            let isValid = false
            await act(async () => {
                isValid = await result.current.form.trigger('termination_reason')
            })

            expect(isValid).toBe(true)
        })

        it('allows termination_reason up to 500 characters', async () => {
            const { result } = renderHook(() => useDeactivateForm())
            const longReason = 'a'.repeat(500)

            act(() => {
                result.current.form.setValue('termination_reason', longReason)
            })

            let isValid = false
            await act(async () => {
                isValid = await result.current.form.trigger('termination_reason')
            })

            expect(isValid).toBe(true)
        })

        it('rejects termination_reason over 500 characters', async () => {
            const { result } = renderHook(() => useDeactivateForm())
            const tooLongReason = 'a'.repeat(501)

            act(() => {
                result.current.form.setValue('termination_reason', tooLongReason)
            })

            let isValid = false
            await act(async () => {
                isValid = await result.current.form.trigger('termination_reason')
            })

            expect(isValid).toBe(false)
        })
    })

    describe('form object', () => {
        it('returns a valid form object from useForm', () => {
            const { result } = renderHook(() => useDeactivateForm())

            expect(result.current.form).toBeDefined()
            expect(typeof result.current.form.register).toBe('function')
            expect(typeof result.current.form.handleSubmit).toBe('function')
            expect(typeof result.current.form.setValue).toBe('function')
            expect(typeof result.current.form.getValues).toBe('function')
        })
    })

    describe('syncing end_date when businessDate resolves asynchronously', () => {
        it('updates the untouched end_date when businessDate arrives after mount', () => {
            // businessDate starts null (falls back to the pinned 2026-04-02 browser date)
            const { result, rerender } = renderHook(() => useDeactivateForm())
            expect(result.current.form.getValues('end_date')).toBe('2026-04-02')

            // businessDate resolves later to an earlier simulated date
            mockUseBusinessDate.mockReturnValue('2026-03-30')
            rerender()

            expect(result.current.form.getValues('end_date')).toBe('2026-03-30')
        })

        it('does not overwrite end_date once the user has edited it', () => {
            const { result, rerender } = renderHook(() => useDeactivateForm())

            act(() => {
                result.current.form.setValue('end_date', '2026-03-15', { shouldDirty: true })
            })
            expect(result.current.form.getValues('end_date')).toBe('2026-03-15')

            // businessDate resolves after the user has already picked a date
            mockUseBusinessDate.mockReturnValue('2026-03-30')
            rerender()

            expect(result.current.form.getValues('end_date')).toBe('2026-03-15')
        })
    })
})
