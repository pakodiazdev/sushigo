// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useOverrideScopeDialog } from '@/components/employees/use-override-scope-dialog'
import type { ScheduleDayOverride } from '@/types/schedule'

function makeOverride(id: string, from: string, to: string | null): ScheduleDayOverride {
  return {
    id,
    employment_period_id: 'period-01',
    day_of_week: 3,
    effective_from: from,
    effective_to: to,
    is_day_off: false,
    expected_start: '08:00',
    expected_lunch_start: null,
    expected_lunch_end: null,
    lunch_duration_minutes: null,
    expected_end: '17:00',
    note: null,
    created_at: '2026-01-01T00:00:00+00:00',
    updated_at: '2026-01-01T00:00:00+00:00',
  }
}

describe('useOverrideScopeDialog', () => {
  it('initializes with scope=single_date and step=form', () => {
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], vi.fn()))

    expect(result.current.scope).toBe('single_date')
    expect(result.current.step).toBe('form')
    expect(result.current.conflicts).toHaveLength(0)
  })

  it('becomes valid after effectiveFrom is set for single_date scope', async () => {
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], vi.fn()))

    await act(async () => {
      result.current.setValue('effectiveFrom', '2026-03-10', { shouldValidate: true })
    })

    expect(result.current.isValid).toBe(true)
  })

  it('exposes register, setValue and errors', () => {
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], vi.fn()))

    expect(typeof result.current.register).toBe('function')
    expect(typeof result.current.setValue).toBe('function')
    expect(result.current.errors).toBeDefined()
  })

  it('calls onSubmit directly when no conflicts exist', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], onSubmit))

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'single_date' })
    )
  })

  it('transitions to conflicts step when overlaps are detected', async () => {
    const onSubmit = vi.fn()
    const existing = [makeOverride('a', '2026-03-01', '2026-03-31')]
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, existing, onSubmit))

    act(() => {
      result.current.setValue('effectiveFrom', '2026-03-15', { shouldValidate: true })
    })

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(result.current.step).toBe('conflicts')
    expect(result.current.conflicts).toHaveLength(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit after confirming conflicts', async () => {
    const onSubmit = vi.fn()
    const existing = [makeOverride('a', '2026-03-01', '2026-03-31')]
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, existing, onSubmit))

    act(() => {
      result.current.setValue('effectiveFrom', '2026-03-15', { shouldValidate: true })
    })

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(result.current.step).toBe('conflicts')

    act(() => {
      result.current.handleConfirmConflicts()
    })

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('backToForm resets step to form', async () => {
    const onSubmit = vi.fn()
    const existing = [makeOverride('a', '2026-03-01', '2026-03-31')]
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, existing, onSubmit))

    act(() => {
      result.current.setValue('effectiveFrom', '2026-03-15', { shouldValidate: true })
    })

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(result.current.step).toBe('conflicts')

    act(() => {
      result.current.backToForm()
    })

    expect(result.current.step).toBe('form')
  })

  it('for range scope, passes effectiveTo correctly on submit', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], onSubmit))

    act(() => {
      result.current.setValue('scope', 'range', { shouldValidate: true })
      result.current.setValue('effectiveFrom', '2026-03-01', { shouldValidate: true })
      result.current.setValue('effectiveTo', '2026-03-15', { shouldValidate: true })
    })

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'range',
        effectiveFrom: '2026-03-01',
        effectiveTo: '2026-03-15',
      })
    )
  })

  it('for indefinite scope, effectiveTo is null on submit', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], onSubmit))

    act(() => {
      result.current.setValue('scope', 'indefinite', { shouldValidate: true })
      result.current.setValue('effectiveFrom', '2026-03-10', { shouldValidate: true })
    })

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'indefinite',
        effectiveTo: null,
      })
    )
  })

  it('for single_date scope, effectiveTo on submit is null (resolved from effectiveFrom)', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], onSubmit))

    act(() => {
      result.current.setValue('effectiveFrom', '2026-03-10', { shouldValidate: true })
    })

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'single_date',
        effectiveFrom: '2026-03-10',
        effectiveTo: null,
      })
    )
  })

  it('passes note from form to onSubmit', async () => {
    const onSubmit = vi.fn()
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], onSubmit))

    act(() => {
      result.current.setValue('note', 'Clases de inglés', { shouldValidate: true })
    })

    await act(async () => {
      await result.current.handlePrimaryClick()
    })

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'Clases de inglés' })
    )
  })

  it('scope watch reflects setValue changes', () => {
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], vi.fn()))

    act(() => {
      result.current.setValue('scope', 'range', { shouldValidate: true })
    })

    expect(result.current.scope).toBe('range')
  })

  it('effectiveFrom watch reflects setValue changes', () => {
    const { result } = renderHook(() => useOverrideScopeDialog(true, 3, [], vi.fn()))

    act(() => {
      result.current.setValue('effectiveFrom', '2026-06-15', { shouldValidate: true })
    })

    expect(result.current.effectiveFrom).toBe('2026-06-15')
  })
})
