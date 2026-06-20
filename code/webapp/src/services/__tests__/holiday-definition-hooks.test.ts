// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { HolidayDefinition } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/holiday-api', () => ({
  holidayDefinitionApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/components/ui/toast-provider', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import {
  useHolidayDefinitions,
  useCreateHolidayDefinition,
  useUpdateHolidayDefinition,
  useDeleteHolidayDefinition,
} from '../holiday-definition-hooks'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeDefinition: HolidayDefinition = {
  id: 1,
  name: 'Año Nuevo',
  description: null,
  type: 'obligatorio',
  pay_multiplier: 3,
  is_annual: true,
  recurrence_type: 'fixed',
  recurrence_config: { month: 1, day: 1 },
  created_at: '2026-01-01T00:00:00+00:00',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── useHolidayDefinitions ─────────────────────────────────────────────────────

describe('useHolidayDefinitions', () => {
  it('returns definitions from api.list', async () => {
    mockList.mockResolvedValue([fakeDefinition])
    const { result } = renderHook(() => useHolidayDefinitions(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeDefinition])
  })

  it('starts with data undefined before resolving', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useHolidayDefinitions(), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })

  it('calls api.list with no arguments', async () => {
    mockList.mockResolvedValue([])
    const { result } = renderHook(() => useHolidayDefinitions(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockList).toHaveBeenCalledWith()
  })
})

// ── useCreateHolidayDefinition ────────────────────────────────────────────────

describe('useCreateHolidayDefinition', () => {
  const payload = {
    name: 'Año Nuevo',
    type: 'obligatorio' as const,
    is_annual: true,
    recurrence_type: 'fixed' as const,
    recurrence_config: { month: 1, day: 1 },
  }

  it('calls holidayDefinitionApi.create with the payload', async () => {
    mockCreate.mockResolvedValue(fakeDefinition)
    const { result } = renderHook(() => useCreateHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreate).toHaveBeenCalledWith(payload)
  })

  it('shows success toast on create success', async () => {
    mockCreate.mockResolvedValue(fakeDefinition)
    const { result } = renderHook(() => useCreateHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('El festivo ha sido creado.', 'Festivo creado')
  })

  it('shows error toast on create failure', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useCreateHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useCreateHolidayDefinition(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})

// ── useUpdateHolidayDefinition ────────────────────────────────────────────────

describe('useUpdateHolidayDefinition', () => {
  const updateArgs = { id: 1, payload: { name: 'Año Nuevo Actualizado' } }

  it('calls holidayDefinitionApi.update with id and payload', async () => {
    mockUpdate.mockResolvedValue(fakeDefinition)
    const { result } = renderHook(() => useUpdateHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(updateArgs) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalledWith(1, { name: 'Año Nuevo Actualizado' })
  })

  it('shows success toast on update success', async () => {
    mockUpdate.mockResolvedValue(fakeDefinition)
    const { result } = renderHook(() => useUpdateHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(updateArgs) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('El festivo ha sido actualizado.', 'Festivo actualizado')
  })

  it('shows error toast on update failure', async () => {
    mockUpdate.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useUpdateHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(updateArgs) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useUpdateHolidayDefinition(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})

// ── useDeleteHolidayDefinition ────────────────────────────────────────────────

describe('useDeleteHolidayDefinition', () => {
  it('calls holidayDefinitionApi.delete with the id', async () => {
    mockDelete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(1) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDelete).toHaveBeenCalledWith(1)
  })

  it('shows success toast on delete success', async () => {
    mockDelete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(1) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('El festivo ha sido eliminado.', 'Festivo eliminado')
  })

  it('shows error toast on delete failure', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'))
    const { result } = renderHook(() => useDeleteHolidayDefinition(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(1) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useDeleteHolidayDefinition(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
