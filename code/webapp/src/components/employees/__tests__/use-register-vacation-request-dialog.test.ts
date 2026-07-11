// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useRegisterVacationRequestDialog } from '../use-register-vacation-request-dialog'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn()
const mockEntitlementsQuery = vi.fn()

vi.mock('@/services/vacation-hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/vacation-hooks')>()
  return {
    ...actual,
    useVacationEntitlements: () => mockEntitlementsQuery(),
    useCreateVacationRequest: () => ({ mutate: mockMutate, isPending: false }),
  }
})

const mockEmployee = { id: 'emp-1', first_name: 'Carlos', last_name: 'Mendoza' }

describe('useRegisterVacationRequestDialog', () => {
  beforeEach(() => {
    mockEntitlementsQuery.mockReturnValue({
      data: {
        entitlements: [
          { id: 1, year: 2026, entitled_days: 12, used_days: 3, remaining_days: 9, rule_key: 'VacationsLFTMX' },
        ],
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('defaults dates to an empty selection', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )
    expect(result.current.form.getValues('dates')).toEqual([])
  })

  it('daysCount reflects the number of selected dates', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() => result.current.form.setValue('dates', ['2026-08-10', '2026-08-12']))

    expect(result.current.daysCount).toBe(2)
  })

  it('remainingDays resolves from the entitlement matching the first selected date\'s year', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() => result.current.form.setValue('dates', ['2026-08-10']))

    expect(result.current.remainingDays).toBe(9)
  })

  it('remainingDays is null when no dates are selected', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    expect(result.current.remainingDays).toBeNull()
  })

  it('remainingDays is null when no entitlement matches the selected year', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() => result.current.form.setValue('dates', ['2030-01-01']))

    expect(result.current.remainingDays).toBeNull()
  })

  it('isInsufficientBalance is true when daysCount exceeds remainingDays', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() =>
      result.current.form.setValue('dates', [
        '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
        '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10',
      ])
    )

    expect(result.current.isInsufficientBalance).toBe(true)
  })

  it('isInsufficientBalance is false when no dates are selected', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    expect(result.current.isInsufficientBalance).toBe(false)
  })

  it('submits the employee_id, dates and notes payload', async () => {
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess })
    )

    act(() => {
      result.current.form.setValue('dates', ['2026-08-10', '2026-08-12'])
      result.current.form.setValue('notes', 'Vacaciones familiares')
    })

    await act(async () => {
      await result.current.handleSubmit()
    })

    await waitFor(() => expect(mockMutate).toHaveBeenCalledOnce())

    const [payload, options] = mockMutate.mock.calls[0] as [Record<string, unknown>, { onSuccess: () => void }]
    expect(payload).toEqual({
      employee_id: 'emp-1',
      dates: ['2026-08-10', '2026-08-12'],
      notes: 'Vacaciones familiares',
    })

    options.onSuccess()
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('does not submit when employee is null', async () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: null, onSuccess: vi.fn() })
    )

    act(() => result.current.form.setValue('dates', ['2026-08-10']))

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('does not submit when no dates are selected', async () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it('handleClose resets the form', () => {
    const { result } = renderHook(() =>
      useRegisterVacationRequestDialog({ employee: mockEmployee, onSuccess: vi.fn() })
    )

    act(() => result.current.form.setValue('dates', ['2026-08-10']))
    act(() => result.current.handleClose())

    expect(result.current.form.getValues('dates')).toEqual([])
  })
})
