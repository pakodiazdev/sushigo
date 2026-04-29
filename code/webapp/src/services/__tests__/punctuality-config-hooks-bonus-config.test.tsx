// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { EmployeeBonusConfig } from '@/types/punctuality'

const mockGetBonusConfig = vi.fn()
const mockAssignBonusConfig = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/punctuality-config-api', () => ({
  punctualityConfigApi: {
    listRanges: vi.fn(),
    updateRanges: vi.fn(),
    listBonusGroups: vi.fn(),
    createBonusGroup: vi.fn(),
    getBonusConfig: (...args: unknown[]) => mockGetBonusConfig(...args),
    assignBonusConfig: (...args: unknown[]) => mockAssignBonusConfig(...args),
  },
}))

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useEmployeeBonusConfig, useAssignBonusConfig } from '../punctuality-config-hooks'

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeBonusConfig: EmployeeBonusConfig = {
  id: 'cfg-1',
  bonus_group_id: 'grp-1',
  bonus_group_name: 'Grupo $110',
  weekly_bonus_amount: 110,
  daily_bonus_amount: 18.33,
  effective_from: '2026-01-01',
  effective_to: null,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useEmployeeBonusConfig', () => {
  it('returns config data for employee', async () => {
    mockGetBonusConfig.mockResolvedValue({ data: { data: [fakeBonusConfig] } })
    const { result } = renderHook(() => useEmployeeBonusConfig('emp-1'), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeBonusConfig])
    expect(mockGetBonusConfig).toHaveBeenCalledWith('emp-1')
  })

  it('starts with data undefined', () => {
    mockGetBonusConfig.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useEmployeeBonusConfig('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })
})

describe('useAssignBonusConfig', () => {
  const payload = { bonus_group_id: 'grp-1', effective_from: '2026-05-01' }

  it('calls assignBonusConfig with employeeId and payload', async () => {
    mockAssignBonusConfig.mockResolvedValue({ data: { data: fakeBonusConfig } })
    const { result } = renderHook(() => useAssignBonusConfig('emp-1'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockAssignBonusConfig).toHaveBeenCalledWith('emp-1', payload)
  })

  it('shows success toast on success', async () => {
    mockAssignBonusConfig.mockResolvedValue({ data: { data: fakeBonusConfig } })
    const { result } = renderHook(() => useAssignBonusConfig('emp-1'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('Grupo de bono asignado.', 'Puntualidad')
  })

  it('shows error toast on failure', async () => {
    mockAssignBonusConfig.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useAssignBonusConfig('emp-1'), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useAssignBonusConfig('emp-1'), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
