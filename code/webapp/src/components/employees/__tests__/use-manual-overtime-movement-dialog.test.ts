// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useManualOvertimeMovementDialog } from '../use-manual-overtime-movement-dialog'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn()

vi.mock('@/services/overtime-bank-hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/overtime-bank-hooks')>()
  return {
    ...actual,
    useCreateManualOvertimeMovement: () => ({ mutate: mockMutate, isPending: false }),
  }
})

const mockEmployee = { id: 'emp-1', user: { first_name: 'Carlos', last_name: 'Mendoza', avatar_url: null } }

describe('useManualOvertimeMovementDialog', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('defaults movement_type to USED and minutes to 0', () => {
    const { result } = renderHook(() =>
      useManualOvertimeMovementDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )
    expect(result.current.form.getValues('movement_type')).toBe('USED')
    expect(result.current.form.getValues('minutes')).toBe(0)
  })

  it('defaults date to today', () => {
    // Pinned mid-day instant (16:00 CDMX / 22:00 UTC, same calendar day in both)
    // so this doesn't flake during the ~6h/day window where UTC and CDMX disagree.
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T22:00:00Z'))
    try {
      const { result } = renderHook(() =>
        useManualOvertimeMovementDialog({ employee: mockEmployee, onSuccess: vi.fn() })
      )
      expect(result.current.form.getValues('date')).toBe('2026-04-02')
    } finally {
      vi.useRealTimers()
    }
  })

  it('submits the movement payload and calls onSuccess', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useManualOvertimeMovementDialog({ employee: mockEmployee, onSuccess })
    )

    act(() => {
      result.current.form.setValue('movement_type', 'ADJUSTMENT')
      result.current.form.setValue('minutes', -30)
      result.current.form.setValue('reason', 'Correcting balance')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())

    const [payload, options] = mockMutate.mock.calls[0] as [Record<string, unknown>, { onSuccess: () => void }]
    expect(payload).toMatchObject({
      movement_type: 'ADJUSTMENT',
      minutes: -30,
      reason: 'Correcting balance',
    })

    options.onSuccess()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('does not submit when employee is null', async () => {
    const { result } = renderHook(() =>
      useManualOvertimeMovementDialog({ employee: null, onSuccess: vi.fn() })
    )

    act(() => {
      result.current.form.setValue('minutes', 30)
      result.current.form.setValue('reason', 'Some reason')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('rejects a USED movement with zero or negative minutes', async () => {
    const { result } = renderHook(() =>
      useManualOvertimeMovementDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() => {
      result.current.form.setValue('movement_type', 'USED')
      result.current.form.setValue('minutes', 0)
      result.current.form.setValue('reason', 'Some reason')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('rejects an ADJUSTMENT movement with zero minutes', async () => {
    const { result } = renderHook(() =>
      useManualOvertimeMovementDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() => {
      result.current.form.setValue('movement_type', 'ADJUSTMENT')
      result.current.form.setValue('minutes', 0)
      result.current.form.setValue('reason', 'Some reason')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('handleClose resets the form', () => {
    const { result } = renderHook(() =>
      useManualOvertimeMovementDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() => result.current.form.setValue('reason', 'Some reason'))
    act(() => result.current.handleClose())

    expect(result.current.form.getValues('reason')).toBe('')
  })
})
