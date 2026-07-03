// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

let mockBranchId: number | null = 1

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (s: { currentBranch: { id: number } | null }) => unknown) =>
    selector({ currentBranch: mockBranchId ? { id: mockBranchId } : null }),
}))

const mockClosePreviewData: unknown[] = []
const mockMutateAsync = vi.fn()

vi.mock('@/services/payroll-hooks', () => ({
  useClosePreview: () => ({ data: mockClosePreviewData, isLoading: false, error: null }),
  useConfirmClose: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

import { useClosePreviewPage } from '../use-close-preview'

beforeEach(() => {
  vi.clearAllMocks()
  mockBranchId = 1
})

describe('useClosePreviewPage — confirmClose', () => {
  it('confirms the close, navigates to /attendance, and closes the dialog', async () => {
    mockMutateAsync.mockResolvedValue(undefined)
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.calculate()
      result.current.openConfirm()
    })
    expect(result.current.isConfirmOpen).toBe(true)

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockMutateAsync).toHaveBeenCalledWith({
      branchId: 1,
      periodStart: result.current.activeRange?.periodStart,
      periodEnd: result.current.activeRange?.periodEnd,
    })
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/attendance' })
    expect(result.current.isConfirmOpen).toBe(false)
  })

  it('closes the dialog on mutation failure without navigating', async () => {
    mockMutateAsync.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.calculate()
      result.current.openConfirm()
    })

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockNavigate).not.toHaveBeenCalled()
    expect(result.current.isConfirmOpen).toBe(false)
  })

  it('closes the dialog instead of leaving it stuck open when branchId is missing', async () => {
    mockBranchId = null
    const { result } = renderHook(() => useClosePreviewPage())

    act(() => {
      result.current.calculate()
      result.current.openConfirm()
    })
    expect(result.current.isConfirmOpen).toBe(true)

    await act(async () => {
      await result.current.confirmClose()
    })

    expect(mockMutateAsync).not.toHaveBeenCalled()
    expect(result.current.isConfirmOpen).toBe(false)
  })
})
