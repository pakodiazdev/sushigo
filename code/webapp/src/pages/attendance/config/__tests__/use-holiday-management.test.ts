// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Holiday } from '@/types/attendance-payroll'

const mockCreateMutateAsync = vi.fn()
const mockUpdateMutateAsync = vi.fn()
const mockDeleteMutateAsync = vi.fn()

const fakeHoliday1: Holiday = { id: 1, date: '2026-01-01', name: 'Año Nuevo', pay_multiplier: 2, created_at: '2026-01-01T00:00:00+00:00' }
const fakeHoliday2: Holiday = { id: 2, date: '2026-02-05', name: 'Constitución', pay_multiplier: 2, created_at: '2026-02-05T00:00:00+00:00' }
const fakeHolidays: Holiday[] = [fakeHoliday1, fakeHoliday2]

vi.mock('@/services/holiday-hooks', () => ({
  useHolidays: vi.fn(() => ({ data: fakeHolidays, isLoading: false })),
  useCreateHoliday: vi.fn(() => ({ mutateAsync: mockCreateMutateAsync, isPending: false })),
  useUpdateHoliday: vi.fn(() => ({ mutateAsync: mockUpdateMutateAsync, isPending: false })),
  useDeleteHoliday: vi.fn(() => ({ mutateAsync: mockDeleteMutateAsync, isPending: false })),
}))

import { useHolidayManagement } from '../use-holiday-management'
import * as hooks from '@/services/holiday-hooks'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hooks.useHolidays).mockReturnValue({ data: fakeHolidays, isLoading: false } as unknown as ReturnType<typeof hooks.useHolidays>)
  vi.mocked(hooks.useCreateHoliday).mockReturnValue({ mutateAsync: mockCreateMutateAsync, isPending: false } as unknown as ReturnType<typeof hooks.useCreateHoliday>)
  vi.mocked(hooks.useUpdateHoliday).mockReturnValue({ mutateAsync: mockUpdateMutateAsync, isPending: false } as unknown as ReturnType<typeof hooks.useUpdateHoliday>)
  vi.mocked(hooks.useDeleteHoliday).mockReturnValue({ mutateAsync: mockDeleteMutateAsync, isPending: false } as unknown as ReturnType<typeof hooks.useDeleteHoliday>)
})

describe('useHolidayManagement', () => {
  // ── Initial state ──────────────────────────────────────────────────────────

  it('exposes the holidays list from useHolidays', () => {
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.holidays).toEqual(fakeHolidays)
  })

  it('returns empty array when holidays data is undefined', () => {
    vi.mocked(hooks.useHolidays).mockReturnValue({ data: undefined, isLoading: false } as unknown as ReturnType<typeof hooks.useHolidays>)
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.holidays).toEqual([])
  })

  it('reflects isLoading from query', () => {
    vi.mocked(hooks.useHolidays).mockReturnValue({ data: undefined, isLoading: true } as unknown as ReturnType<typeof hooks.useHolidays>)
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.isLoading).toBe(true)
  })

  it('starts with showAddForm = false', () => {
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.showAddForm).toBe(false)
  })

  it('starts with editingId = null', () => {
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.editingId).toBeNull()
  })

  it('starts with confirmDeleteId = null', () => {
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.confirmDeleteId).toBeNull()
  })

  // ── Add form ───────────────────────────────────────────────────────────────

  it('setShowAddForm(true) opens the add form', () => {
    const { result } = renderHook(() => useHolidayManagement())
    act(() => { result.current.setShowAddForm(true) })
    expect(result.current.showAddForm).toBe(true)
  })

  it('setShowAddForm(false) closes the add form', () => {
    const { result } = renderHook(() => useHolidayManagement())
    act(() => { result.current.setShowAddForm(true) })
    act(() => { result.current.setShowAddForm(false) })
    expect(result.current.showAddForm).toBe(false)
  })

  it('handleAddSubmit calls createHoliday.mutateAsync with form values', async () => {
    mockCreateMutateAsync.mockResolvedValue({})
    const { result } = renderHook(() => useHolidayManagement())
    const values = { date: '2026-01-01', name: 'Año Nuevo', pay_multiplier: 2 }

    await act(async () => {
      await result.current.handleAddSubmit(values)
    })

    expect(mockCreateMutateAsync).toHaveBeenCalledWith(values)
  })

  it('handleAddSubmit closes the add form on success', async () => {
    mockCreateMutateAsync.mockResolvedValue({})
    const { result } = renderHook(() => useHolidayManagement())

    act(() => { result.current.setShowAddForm(true) })
    expect(result.current.showAddForm).toBe(true)

    await act(async () => {
      await result.current.handleAddSubmit({ date: '2026-01-01', name: 'Año Nuevo', pay_multiplier: 2 })
    })

    expect(result.current.showAddForm).toBe(false)
  })

  it('exposes addForm with handleSubmit', () => {
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.addForm).toBeDefined()
    expect(typeof result.current.addForm.handleSubmit).toBe('function')
  })

  // ── Edit ───────────────────────────────────────────────────────────────────

  it('startEdit sets editingId to the holiday id', () => {
    const { result } = renderHook(() => useHolidayManagement())
    act(() => { result.current.startEdit(fakeHoliday1) })
    expect(result.current.editingId).toBe(1)
  })

  it('startEdit resets editForm to the holiday values', () => {
    const { result } = renderHook(() => useHolidayManagement())
    act(() => { result.current.startEdit(fakeHoliday1) })
    const values = result.current.editForm.getValues()
    expect(values.date).toBe('2026-01-01')
    expect(values.name).toBe('Año Nuevo')
    expect(values.pay_multiplier).toBe(2)
  })

  it('cancelEdit resets editingId to null', () => {
    const { result } = renderHook(() => useHolidayManagement())
    act(() => { result.current.startEdit(fakeHoliday1) })
    act(() => { result.current.cancelEdit() })
    expect(result.current.editingId).toBeNull()
  })

  it('handleEditSubmit calls updateHoliday.mutateAsync with id and payload', async () => {
    mockUpdateMutateAsync.mockResolvedValue({})
    const { result } = renderHook(() => useHolidayManagement())

    act(() => { result.current.startEdit(fakeHoliday1) })
    const values = { date: '2026-01-01', name: 'Año Nuevo Editado', pay_multiplier: 3 }

    await act(async () => {
      await result.current.handleEditSubmit(values)
    })

    expect(mockUpdateMutateAsync).toHaveBeenCalledWith({ id: 1, payload: values })
  })

  it('handleEditSubmit resets editingId to null on success', async () => {
    mockUpdateMutateAsync.mockResolvedValue({})
    const { result } = renderHook(() => useHolidayManagement())

    act(() => { result.current.startEdit(fakeHoliday1) })
    expect(result.current.editingId).toBe(1)

    await act(async () => {
      await result.current.handleEditSubmit({ date: '2026-01-01', name: 'Test', pay_multiplier: 2 })
    })

    expect(result.current.editingId).toBeNull()
  })

  it('handleEditSubmit is a no-op when editingId is null', async () => {
    const { result } = renderHook(() => useHolidayManagement())
    await act(async () => {
      await result.current.handleEditSubmit({ date: '2026-01-01', name: 'Test', pay_multiplier: 2 })
    })
    expect(mockUpdateMutateAsync).not.toHaveBeenCalled()
  })

  it('reflects isUpdating from updateHoliday.isPending', () => {
    vi.mocked(hooks.useUpdateHoliday).mockReturnValue({ mutateAsync: mockUpdateMutateAsync, isPending: true } as unknown as ReturnType<typeof hooks.useUpdateHoliday>)
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.isUpdating).toBe(true)
  })

  it('exposes editForm with handleSubmit', () => {
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.editForm).toBeDefined()
    expect(typeof result.current.editForm.handleSubmit).toBe('function')
  })

  // ── Delete ─────────────────────────────────────────────────────────────────

  it('setConfirmDeleteId sets the id', () => {
    const { result } = renderHook(() => useHolidayManagement())
    act(() => { result.current.setConfirmDeleteId(5) })
    expect(result.current.confirmDeleteId).toBe(5)
  })

  it('handleDeleteConfirm calls deleteHoliday.mutateAsync with the id', async () => {
    mockDeleteMutateAsync.mockResolvedValue({})
    const { result } = renderHook(() => useHolidayManagement())

    act(() => { result.current.setConfirmDeleteId(2) })
    await act(async () => {
      await result.current.handleDeleteConfirm()
    })

    expect(mockDeleteMutateAsync).toHaveBeenCalledWith(2)
  })

  it('handleDeleteConfirm resets confirmDeleteId to null on success', async () => {
    mockDeleteMutateAsync.mockResolvedValue({})
    const { result } = renderHook(() => useHolidayManagement())

    act(() => { result.current.setConfirmDeleteId(2) })
    expect(result.current.confirmDeleteId).toBe(2)

    await act(async () => {
      await result.current.handleDeleteConfirm()
    })

    expect(result.current.confirmDeleteId).toBeNull()
  })

  it('handleDeleteConfirm is a no-op when confirmDeleteId is null', async () => {
    const { result } = renderHook(() => useHolidayManagement())
    await act(async () => {
      await result.current.handleDeleteConfirm()
    })
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled()
  })

  it('reflects isDeleting from deleteHoliday.isPending', () => {
    vi.mocked(hooks.useDeleteHoliday).mockReturnValue({ mutateAsync: mockDeleteMutateAsync, isPending: true } as unknown as ReturnType<typeof hooks.useDeleteHoliday>)
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.isDeleting).toBe(true)
  })

  it('reflects isCreating from createHoliday.isPending', () => {
    vi.mocked(hooks.useCreateHoliday).mockReturnValue({ mutateAsync: mockCreateMutateAsync, isPending: true } as unknown as ReturnType<typeof hooks.useCreateHoliday>)
    const { result } = renderHook(() => useHolidayManagement())
    expect(result.current.isCreating).toBe(true)
  })
})
