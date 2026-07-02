// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import type { Holiday } from '@/types/attendance-payroll'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockList = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()

vi.mock('@/services/holiday-api', () => ({
  holidayApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: mockShowSuccess, showError: mockShowError }),
}))

import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../holiday-hooks'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children)
}

const fakeHoliday: Holiday = {
  id: 1,
  date: '2026-01-01',
  name: 'Año Nuevo',
  type: 'obligatorio',
  pay_multiplier: 3,
  is_auto_generated: true,
  definition_id: 1,
  created_at: '2026-01-01T00:00:00+00:00',
}

const fakeListResponse = { data: [fakeHoliday], warnings: [] }
const fakeListResponseWithWarnings = {
  data: [fakeHoliday],
  warnings: ['Jueves Santo no tiene fecha configurada para 2026'],
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── useHolidays ───────────────────────────────────────────────────────────────

describe('useHolidays', () => {
  it('returns holidays from api.list', async () => {
    mockList.mockResolvedValue(fakeListResponse)
    const { result } = renderHook(() => useHolidays(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([fakeHoliday])
  })

  it('passes year param to api.list when provided', async () => {
    mockList.mockResolvedValue(fakeListResponse)
    const { result } = renderHook(() => useHolidays(2026), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockList).toHaveBeenCalledWith(2026)
  })

  it('calls api.list with undefined when no year given', async () => {
    mockList.mockResolvedValue({ data: [], warnings: [] })
    const { result } = renderHook(() => useHolidays(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockList).toHaveBeenCalledWith(undefined)
  })

  it('starts with data undefined before resolving', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useHolidays(), { wrapper: makeWrapper() })
    expect(result.current.data).toBeUndefined()
  })

  it('exposes warnings from meta', async () => {
    mockList.mockResolvedValue(fakeListResponseWithWarnings)
    const { result } = renderHook(() => useHolidays(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.warnings).toEqual([
      'Jueves Santo no tiene fecha configurada para 2026',
    ])
  })

  it('exposes empty warnings array when none returned', async () => {
    mockList.mockResolvedValue(fakeListResponse)
    const { result } = renderHook(() => useHolidays(), { wrapper: makeWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.warnings).toEqual([])
  })

  it('exposes empty warnings before data resolves', () => {
    mockList.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useHolidays(), { wrapper: makeWrapper() })
    expect(result.current.warnings).toEqual([])
  })
})

// ── useCreateHoliday ──────────────────────────────────────────────────────────

describe('useCreateHoliday', () => {
  const payload = { date: '2026-01-01', name: 'Año Nuevo', pay_multiplier: 2 }

  it('calls holidayApi.create with the payload', async () => {
    mockCreate.mockResolvedValue(fakeHoliday)
    const { result } = renderHook(() => useCreateHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockCreate).toHaveBeenCalledWith(payload)
  })

  it('shows success toast on create success', async () => {
    mockCreate.mockResolvedValue(fakeHoliday)
    const { result } = renderHook(() => useCreateHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('El día festivo ha sido creado.', 'Festivo creado')
  })

  it('shows error toast on create failure', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useCreateHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(payload) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useCreateHoliday(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})

// ── useUpdateHoliday ──────────────────────────────────────────────────────────

describe('useUpdateHoliday', () => {
  const updateArgs = { id: 1, payload: { name: 'Año Nuevo Updated' } }

  it('calls holidayApi.update with id and payload', async () => {
    mockUpdate.mockResolvedValue(fakeHoliday)
    const { result } = renderHook(() => useUpdateHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(updateArgs) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockUpdate).toHaveBeenCalledWith(1, { name: 'Año Nuevo Updated' })
  })

  it('shows success toast on update success', async () => {
    mockUpdate.mockResolvedValue(fakeHoliday)
    const { result } = renderHook(() => useUpdateHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(updateArgs) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('El día festivo ha sido actualizado.', 'Festivo actualizado')
  })

  it('shows error toast on update failure', async () => {
    mockUpdate.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useUpdateHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(updateArgs) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useUpdateHoliday(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})

// ── useDeleteHoliday ──────────────────────────────────────────────────────────

describe('useDeleteHoliday', () => {
  it('calls holidayApi.delete with the id', async () => {
    mockDelete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(1) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockDelete).toHaveBeenCalledWith(1)
  })

  it('shows success toast on delete success', async () => {
    mockDelete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeleteHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(1) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockShowSuccess).toHaveBeenCalledWith('El día festivo ha sido eliminado.', 'Festivo eliminado')
  })

  it('shows error toast on delete failure', async () => {
    mockDelete.mockRejectedValue(new Error('Not found'))
    const { result } = renderHook(() => useDeleteHoliday(), { wrapper: makeWrapper() })

    act(() => { result.current.mutate(1) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(mockShowError).toHaveBeenCalled()
  })

  it('starts with isPending false', () => {
    const { result } = renderHook(() => useDeleteHoliday(), { wrapper: makeWrapper() })
    expect(result.current.isPending).toBe(false)
  })
})
