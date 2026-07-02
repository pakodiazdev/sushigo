// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { EmployeeBonusConfig } from '@/types/punctuality'

const mockGetBonusConfig = vi.fn()
const mockAssignBonusConfig = vi.fn()
const mockListBonusGroups = vi.fn()
const mockCreateBonusGroup = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/punctuality-config-api', () => ({
  punctualityConfigApi: {
    listRanges: vi.fn(),
    updateRanges: vi.fn(),
    listBonusGroups: (...args: unknown[]) => mockListBonusGroups(...args),
    createBonusGroup: (...args: unknown[]) => mockCreateBonusGroup(...args),
    getBonusConfig: (...args: unknown[]) => mockGetBonusConfig(...args),
    assignBonusConfig: (...args: unknown[]) => mockAssignBonusConfig(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useEmployeeBonusConfig, useAssignBonusConfig, useBonusGroups, useCreateBonusGroup } from '../punctuality-config-hooks'

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

describe('useBonusGroups', () => {
  const fakeGroup = {
    id: 'grp-1', name: 'Grupo $110', weekly_bonus_amount: 110,
    working_days_divisor: 6, daily_bonus_amount: 18.33, is_active: true,
  }

  it('returns bonus groups list', async () => {
    mockListBonusGroups.mockResolvedValue({ data: { data: [fakeGroup] } })
    const { result } = renderHook(() => useBonusGroups(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeGroup])
  })

  it('starts with data undefined', () => {
    mockListBonusGroups.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useBonusGroups(), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })
})

describe('useCreateBonusGroup', () => {
  const payload = { name: 'Grupo $110', weekly_bonus_amount: 110, working_days_divisor: 6 }
  const fakeGroup = { id: 'grp-1', ...payload, daily_bonus_amount: 18.33, is_active: true }

  it('calls createBonusGroup with the payload', async () => {
    mockCreateBonusGroup.mockResolvedValue({ data: { data: fakeGroup } })
    const { result } = renderHook(() => useCreateBonusGroup(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreateBonusGroup).toHaveBeenCalledWith(payload)
  })

  it('shows success toast on success', async () => {
    mockCreateBonusGroup.mockResolvedValue({ data: { data: fakeGroup } })
    const { result } = renderHook(() => useCreateBonusGroup(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('Grupo de bono creado.', 'Puntualidad')
  })

  it('shows error toast on failure', async () => {
    mockCreateBonusGroup.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useCreateBonusGroup(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useCreateBonusGroup(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
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
