// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

vi.mock('@/services/attendance-hooks', () => ({
  useOvertimeValuationPreview: vi.fn(() => ({ data: undefined, isFetching: false })),
}))

import { useOvertimeDecisionDialog } from '../use-overtime-decision-dialog'

describe('useOvertimeDecisionDialog', () => {
  it('starts on the confirm step', () => {
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize: vi.fn() }),
    )
    expect(result.current.step).toBe('confirm')
  })

  it('handlePagar switches to the method step', () => {
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize: vi.fn() }),
    )
    act(() => { result.current.handlePagar() })
    expect(result.current.step).toBe('method')
  })

  it('handleBack returns to the confirm step', () => {
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize: vi.fn() }),
    )
    act(() => { result.current.handlePagar() })
    act(() => { result.current.handleBack() })
    expect(result.current.step).toBe('confirm')
  })

  it('resets to confirm step when isOpen becomes true again', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOvertimeDecisionDialog({ isOpen, attendanceId: 'att-1', onAuthorize: vi.fn() }),
      { initialProps: { isOpen: true } },
    )
    act(() => { result.current.handlePagar() })
    expect(result.current.step).toBe('method')

    rerender({ isOpen: false })
    rerender({ isOpen: true })
    expect(result.current.step).toBe('confirm')
  })

  it('resets to confirm step when attendanceId changes while isOpen stays true (bulk queue advancing)', () => {
    const { result, rerender } = renderHook(
      ({ attendanceId }) => useOvertimeDecisionDialog({ isOpen: true, attendanceId, onAuthorize: vi.fn() }),
      { initialProps: { attendanceId: 'att-1' } },
    )
    act(() => { result.current.handlePagar() })
    expect(result.current.step).toBe('method')

    rerender({ attendanceId: 'att-2' })
    expect(result.current.step).toBe('confirm')
  })

  it('onSubmitMethod calls onAuthorize with LFT_PROPORTIONAL and no rate/factor', async () => {
    const onAuthorize = vi.fn()
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize }),
    )

    await act(async () => {
      await result.current.onSubmitMethod({ valuation_method: 'LFT_PROPORTIONAL', agreed_rate: '', agreed_factor: '' })
    })

    expect(onAuthorize).toHaveBeenCalledWith('LFT_PROPORTIONAL', undefined, undefined, false)
  })

  it('onSubmitMethod calls onAuthorize with AGREED_RATE and the numeric rate', async () => {
    const onAuthorize = vi.fn()
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize }),
    )

    await act(async () => {
      await result.current.onSubmitMethod({ valuation_method: 'AGREED_RATE', agreed_rate: '90', agreed_factor: '' })
    })

    expect(onAuthorize).toHaveBeenCalledWith('AGREED_RATE', 90, undefined, false)
  })

  it('onSubmitMethod calls onAuthorize with SALARY_FACTOR and the numeric factor', async () => {
    const onAuthorize = vi.fn()
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize }),
    )

    await act(async () => {
      await result.current.onSubmitMethod({ valuation_method: 'SALARY_FACTOR', agreed_rate: '', agreed_factor: '1.5' })
    })

    expect(onAuthorize).toHaveBeenCalledWith('SALARY_FACTOR', undefined, 1.5, false)
  })

  it('form defaults to LFT_PROPORTIONAL', async () => {
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize: vi.fn() }),
    )
    await waitFor(() => expect(result.current.form.getValues('valuation_method')).toBe('LFT_PROPORTIONAL'))
  })

  // ── applyToRest (bulk "apply to the rest" checkbox) ──────────────────────

  it('applyToRest defaults to false', () => {
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize: vi.fn() }),
    )
    expect(result.current.applyToRest).toBe(false)
  })

  it('setApplyToRest toggles the checkbox state', () => {
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize: vi.fn() }),
    )
    act(() => { result.current.setApplyToRest(true) })
    expect(result.current.applyToRest).toBe(true)
  })

  it('resets applyToRest to false when attendanceId changes (bulk queue advancing)', () => {
    const { result, rerender } = renderHook(
      ({ attendanceId }) => useOvertimeDecisionDialog({ isOpen: true, attendanceId, onAuthorize: vi.fn() }),
      { initialProps: { attendanceId: 'att-1' } },
    )
    act(() => { result.current.setApplyToRest(true) })
    expect(result.current.applyToRest).toBe(true)

    rerender({ attendanceId: 'att-2' })
    expect(result.current.applyToRest).toBe(false)
  })

  it('onSubmitMethod reports applyToRest alongside the decision', async () => {
    const onAuthorize = vi.fn()
    const { result } = renderHook(() =>
      useOvertimeDecisionDialog({ isOpen: true, attendanceId: 'att-1', onAuthorize }),
    )

    act(() => { result.current.setApplyToRest(true) })
    await act(async () => {
      await result.current.onSubmitMethod({ valuation_method: 'LFT_PROPORTIONAL', agreed_rate: '', agreed_factor: '' })
    })

    expect(onAuthorize).toHaveBeenCalledWith('LFT_PROPORTIONAL', undefined, undefined, true)
  })
})
