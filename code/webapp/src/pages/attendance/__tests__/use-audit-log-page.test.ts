// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuditLogPage } from '../-use-audit-log-page'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useAuditLogPage', () => {
  it('starts with empty filters', () => {
    const { result } = renderHook(() => useAuditLogPage())

    expect(result.current.employeeId).toBe('')
    expect(result.current.dateFrom).toBe('')
    expect(result.current.dateTo).toBe('')
    expect(result.current.filters).toEqual({
      employee_id: undefined,
      date_from: undefined,
      date_to: undefined,
    })
  })

  it('applies date filters immediately (no debounce)', () => {
    const { result } = renderHook(() => useAuditLogPage())

    act(() => result.current.setDateFrom('2026-07-01'))
    act(() => result.current.setDateTo('2026-07-10'))

    expect(result.current.filters.date_from).toBe('2026-07-01')
    expect(result.current.filters.date_to).toBe('2026-07-10')
  })

  it('updates the employeeId field immediately for the input, but debounces the derived filter', () => {
    const { result } = renderHook(() => useAuditLogPage())

    act(() => result.current.setEmployeeId('emp-1'))

    // Input value reflects every keystroke right away
    expect(result.current.employeeId).toBe('emp-1')
    // The query filter has not caught up yet
    expect(result.current.filters.employee_id).toBeUndefined()

    act(() => vi.advanceTimersByTime(300))

    expect(result.current.filters.employee_id).toBe('emp-1')
  })

  it('only applies the latest value after rapid successive keystrokes', () => {
    const { result } = renderHook(() => useAuditLogPage())

    act(() => result.current.setEmployeeId('e'))
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.setEmployeeId('em'))
    act(() => vi.advanceTimersByTime(100))
    act(() => result.current.setEmployeeId('emp-1'))

    // Neither earlier keystroke's timer ever fires
    act(() => vi.advanceTimersByTime(200))
    expect(result.current.filters.employee_id).toBeUndefined()

    act(() => vi.advanceTimersByTime(100))
    expect(result.current.filters.employee_id).toBe('emp-1')
  })
})
