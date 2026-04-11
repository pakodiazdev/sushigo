// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useEmployeeForm } from '@/components/employees/use-employee-form'
import type { Employee } from '@/types/employee'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn((selector: (s: { isAdmin: boolean; currentBranch: { id: number; name: string } | null }) => unknown) =>
    selector({ isAdmin: true, currentBranch: { id: 1, name: 'Branch 1' } })
  ),
}))

const mockCreateMutateAsync = vi.fn()
const mockUpdateMutateAsync = vi.fn()
const mockDeactivateMutateAsync = vi.fn()
const mockRehireMutateAsync = vi.fn()
const mockToggleActiveMutateAsync = vi.fn()

vi.mock('@/services/employee-hooks', () => ({
  useCreateEmployee: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useUpdateEmployee: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useNextEmployeeCode: () => ({ data: { code: 'EMP-001' }, isLoading: false, isFetching: false, refetch: vi.fn() }),
  useEmployee: () => ({ data: null, isLoading: false }),
  useDeactivateEmployee: () => ({ mutateAsync: mockDeactivateMutateAsync, isPending: false }),
  useRehireEmployee: () => ({ mutateAsync: mockRehireMutateAsync, isPending: false }),
  useToggleEmployeeActive: () => ({ mutateAsync: mockToggleActiveMutateAsync, isPending: false }),
  useAssignableRoles: () => ({ data: ['admin', 'inventory-manager'], isLoading: false, isError: false }),
}))

// ── Test fixtures ──────────────────────────────────────────────────────────────

const mockEmployee: Employee = {
  id: 'emp-1',
  code: 'EMP-001',
  first_name: 'Juan',
  last_name: 'García',
  email: 'juan@example.com',
  phone: null,
  is_active: true,
  has_user: true,
  roles: [],
  meta: null,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-01T00:00:00+00:00',
}

const BASE_PARAMS = {
  isOpen: true,
  onClose: vi.fn(),
  onSuccess: vi.fn(),
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useEmployeeForm — panelTitle', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('returns "Nuevo Empleado" in create mode (no employee)', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.panelTitle).toBe('Nuevo Empleado')
  })

  it('returns "Detalle de Empleado" in detail mode (employee provided)', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: mockEmployee }))
    expect(result.current.panelTitle).toBe('Detalle de Empleado')
  })

  it('returns "Editar Empleado" when mode is edit', async () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: mockEmployee }))
    act(() => { result.current.setMode('edit') })
    expect(result.current.panelTitle).toBe('Editar Empleado')
  })
})

describe('useEmployeeForm — panelDescription', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('returns description for create mode', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.panelDescription).toContain('nuevo empleado')
  })

  it('returns description for edit mode', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: mockEmployee }))
    act(() => { result.current.setMode('edit') })
    expect(result.current.panelDescription).toContain('Actualiza')
  })

  it('returns undefined for detail mode', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: mockEmployee }))
    expect(result.current.panelDescription).toBeUndefined()
  })
})

describe('useEmployeeForm — mode behavior', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('starts in "create" mode when no employee', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.mode).toBe('create')
  })

  it('starts in "detail" mode when employee is provided', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: mockEmployee }))
    expect(result.current.mode).toBe('detail')
  })

  it('resets to detail mode when employee changes from null to provided', async () => {
    const { result, rerender } = renderHook(
      ({ emp }: { emp: Employee | null }) =>
        useEmployeeForm({ ...BASE_PARAMS, employee: emp }),
      { initialProps: { emp: null as Employee | null } }
    )
    expect(result.current.mode).toBe('create')
    rerender({ emp: mockEmployee })
    await waitFor(() => expect(result.current.mode).toBe('detail'))
  })
})

describe('useEmployeeForm — auth state', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('exposes isAdmin from auth store', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.isAdmin).toBe(true)
  })

  it('exposes currentBranch from auth store', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.currentBranch?.id).toBe(1)
  })
})

describe('useEmployeeForm — derived data', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('exposes suggestedCode from nextCodeQuery', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.suggestedCode).toBe('EMP-001')
  })

  it('exposes assignableRoles', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.assignableRoles).toContain('admin')
  })

  it('isLoading is false when no mutations pending', () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useEmployeeForm — handleDeactivate', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls deactivateMutation with employee id and data', async () => {
    mockDeactivateMutateAsync.mockResolvedValueOnce({})
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useEmployeeForm({ ...BASE_PARAMS, employee: mockEmployee, onSuccess })
    )
    await act(async () => {
      await result.current.handleDeactivate('2026-03-31', 'Personal reason')
    })
    expect(mockDeactivateMutateAsync).toHaveBeenCalledWith({
      id: 'emp-1',
      data: { end_date: '2026-03-31', termination_reason: 'Personal reason' },
    })
    expect(onSuccess).toHaveBeenCalled()
  })

  it('does nothing when no employee', async () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    await act(async () => { await result.current.handleDeactivate('2026-03-31') })
    expect(mockDeactivateMutateAsync).not.toHaveBeenCalled()
  })
})

describe('useEmployeeForm — handleRehire', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls rehireMutation with correct data', async () => {
    mockRehireMutateAsync.mockResolvedValueOnce({})
    const onSuccess = vi.fn()
    const onClose = vi.fn()
    const { result } = renderHook(() =>
      useEmployeeForm({ isOpen: true, employee: mockEmployee, onClose, onSuccess })
    )
    await act(async () => {
      await result.current.handleRehire('2026-04-01', 1)
    })
    expect(mockRehireMutateAsync).toHaveBeenCalledWith({
      id: 'emp-1',
      data: { branch_id: 1, start_date: '2026-04-01' },
    })
    expect(onSuccess).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('does nothing when no employee', async () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    await act(async () => { await result.current.handleRehire('2026-04-01', 1) })
    expect(mockRehireMutateAsync).not.toHaveBeenCalled()
  })
})

describe('useEmployeeForm — handleToggleActive', () => {
  afterEach(() => { vi.clearAllMocks() })

  it('calls toggleActiveMutation with employee id', async () => {
    mockToggleActiveMutateAsync.mockResolvedValueOnce({})
    const onSuccess = vi.fn()
    const { result } = renderHook(() =>
      useEmployeeForm({ ...BASE_PARAMS, employee: mockEmployee, onSuccess })
    )
    await act(async () => { await result.current.handleToggleActive() })
    expect(mockToggleActiveMutateAsync).toHaveBeenCalledWith('emp-1')
    expect(onSuccess).toHaveBeenCalled()
  })

  it('does nothing when no employee', async () => {
    const { result } = renderHook(() => useEmployeeForm({ ...BASE_PARAMS, employee: null }))
    await act(async () => { await result.current.handleToggleActive() })
    expect(mockToggleActiveMutateAsync).not.toHaveBeenCalled()
  })
})
