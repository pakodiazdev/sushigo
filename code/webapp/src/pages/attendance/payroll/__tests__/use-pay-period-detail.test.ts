// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockUsePayPeriodDetail = vi.fn()
const mockUseExportPayPeriod = vi.fn()
const mockMutate = vi.fn()
const mockCan = vi.fn()
const mockReopenMutateAsync = vi.fn()
const mockRecloseMutateAsync = vi.fn()
let mockIsAdmin = false

vi.mock('@/services/payroll-hooks', () => ({
  usePayPeriodDetail: (...args: unknown[]) => mockUsePayPeriodDetail(...args),
  useExportPayPeriod: (...args: unknown[]) => mockUseExportPayPeriod(...args),
  useReopenPayPeriod: () => ({ mutateAsync: mockReopenMutateAsync, isPending: false }),
  useReclosePayPeriod: () => ({ mutateAsync: mockRecloseMutateAsync, isPending: false }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { can: (permission: string) => boolean; isAdmin: boolean }) => unknown) =>
    selector({ can: mockCan, isAdmin: mockIsAdmin }),
}))

import { usePayPeriodDetailPage } from '../use-pay-period-detail'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseExportPayPeriod.mockReturnValue({ mutate: mockMutate, isPending: false })
  mockCan.mockReturnValue(true)
  mockIsAdmin = false
})

describe('usePayPeriodDetailPage', () => {
  it('returns the fetched pay period', () => {
    const payPeriod = { id: 'pp-1', status: 'CLOSED', employees: [] }
    mockUsePayPeriodDetail.mockReturnValue({ data: payPeriod, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(mockUsePayPeriodDetail).toHaveBeenCalledWith('pp-1')
    expect(result.current.payPeriod).toBe(payPeriod)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.errorMessage).toBeNull()
  })

  it('returns null payPeriod while loading', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.payPeriod).toBeNull()
    expect(result.current.isLoading).toBe(true)
  })

  it('surfaces an error message when the fetch fails (e.g. 404)', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: undefined, isLoading: false, error: new Error('not found') })

    const { result } = renderHook(() => usePayPeriodDetailPage('unknown-id'))

    expect(result.current.errorMessage).toBeTruthy()
  })

  it('exportCsv triggers the export mutation with the period id', () => {
    const payPeriod = { id: 'pp-1', status: 'CLOSED', employees: [] }
    mockUsePayPeriodDetail.mockReturnValue({ data: payPeriod, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))
    result.current.exportCsv()

    expect(mockMutate).toHaveBeenCalledWith('pp-1')
  })

  it('exposes isExporting from the export mutation state', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: null, isLoading: false, error: null })
    mockUseExportPayPeriod.mockReturnValue({ mutate: mockMutate, isPending: true })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.isExporting).toBe(true)
  })

  it('canExport is true when the user has permission and the period is CLOSED', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: { id: 'pp-1', status: 'CLOSED' }, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.canExport).toBe(true)
  })

  it('canExport is false when the period is REOPENED, even with permission', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: { id: 'pp-1', status: 'REOPENED' }, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.canExport).toBe(false)
  })

  it('canExport is false when the period is OPEN, even with permission', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: { id: 'pp-1', status: 'OPEN' }, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.canExport).toBe(false)
  })

  it('canExport is false when the user lacks permission, even for a CLOSED period', () => {
    mockCan.mockReturnValue(false)
    mockUsePayPeriodDetail.mockReturnValue({ data: { id: 'pp-1', status: 'CLOSED' }, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.canExport).toBe(false)
  })

  it('canExport is false while the period data has not loaded yet, even with permission', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: undefined, isLoading: true, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.canExport).toBe(false)
  })

  it('exposes isAdmin from the auth store', () => {
    mockIsAdmin = true
    mockUsePayPeriodDetail.mockReturnValue({ data: null, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    expect(result.current.isAdmin).toBe(true)
  })

  it('opens the reopen dialog with a cleared reason', () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: null, isLoading: false, error: null })

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    act(() => result.current.setReopenReason('draft that should be cleared'))
    act(() => result.current.openReopenConfirm())

    expect(result.current.isReopenOpen).toBe(true)
    expect(result.current.reopenReason).toBe('')
  })

  it('confirms reopen with the periodId and reason, then closes the dialog', async () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: null, isLoading: false, error: null })
    mockReopenMutateAsync.mockResolvedValue(undefined)

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    act(() => result.current.openReopenConfirm())
    act(() => result.current.setReopenReason('Corrección de horas'))

    await act(async () => result.current.confirmReopen())

    expect(mockReopenMutateAsync).toHaveBeenCalledWith({ periodId: 'pp-1', reason: 'Corrección de horas' })
    await waitFor(() => expect(result.current.isReopenOpen).toBe(false))
  })

  it('confirms reclose with the periodId, then closes the dialog', async () => {
    mockUsePayPeriodDetail.mockReturnValue({ data: null, isLoading: false, error: null })
    mockRecloseMutateAsync.mockResolvedValue(undefined)

    const { result } = renderHook(() => usePayPeriodDetailPage('pp-1'))

    act(() => result.current.openRecloseConfirm())
    expect(result.current.isRecloseOpen).toBe(true)

    await act(async () => result.current.confirmReclose())

    expect(mockRecloseMutateAsync).toHaveBeenCalledWith('pp-1')
    await waitFor(() => expect(result.current.isRecloseOpen).toBe(false))
  })
})
