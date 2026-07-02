// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePermissionManager } from '@/components/employees/use-permission-manager'

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock('@/services/user-permissions-api', () => ({
  userPermissionsApi: {
    getPermissions: vi.fn(),
    syncPermissions: vi.fn(),
  },
}))

vi.mock('@/components/ui/toast-context', () => ({
  useToast: () => ({ showSuccess: vi.fn(), showError: vi.fn() }),
}))

import { userPermissionsApi } from '@/services/user-permissions-api'

// ── Helpers ────────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

const mockGroups = [
  {
    group: 'Empleados',
    permissions: [
      { name: 'employees.view',   label: 'Ver empleados',    source: 'role' as const,   via_roles: ['manager'] },
      { name: 'employees.create', label: 'Crear empleado',   source: 'none' as const,   via_roles: [] },
      { name: 'employees.update', label: 'Editar empleado',  source: 'direct' as const, via_roles: [] },
    ],
  },
]

const mockResponse = { data: { data: { groups: mockGroups } } }

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('usePermissionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(userPermissionsApi.getPermissions).mockResolvedValue(mockResponse as never)
    vi.mocked(userPermissionsApi.syncPermissions).mockResolvedValue(mockResponse as never)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ── Dialog open/close ────────────────────────────────────────────────────────

  describe('dialog state', () => {
    it('starts closed', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      expect(result.current.open).toBe(false)
    })

    it('opens on openDialog()', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.openDialog() })
      expect(result.current.open).toBe(true)
    })

    it('closes on closeDialog() and discards pending changes', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.openDialog() })
      act(() => { result.current.closeDialog() })
      expect(result.current.open).toBe(false)
      expect(result.current.hasChanges).toBe(false)
    })
  })

  // ── isChecked ────────────────────────────────────────────────────────────────

  describe('isChecked', () => {
    it('returns true for role source', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      expect(result.current.isChecked('employees.view', 'role')).toBe(true)
    })

    it('returns true for direct source', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      expect(result.current.isChecked('employees.update', 'direct')).toBe(true)
    })

    it('returns false for none source', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      expect(result.current.isChecked('employees.create', 'none')).toBe(false)
    })
  })

  // ── togglePermission ─────────────────────────────────────────────────────────

  describe('togglePermission', () => {
    it('toggling a none permission marks it for grant', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.togglePermission('employees.create', 'none') })
      expect(result.current.isChecked('employees.create', 'none')).toBe(true)
      expect(result.current.hasChanges).toBe(true)
    })

    it('toggling a none permission twice reverts to unchecked', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.togglePermission('employees.create', 'none') })
      act(() => { result.current.togglePermission('employees.create', 'none') })
      expect(result.current.isChecked('employees.create', 'none')).toBe(false)
      expect(result.current.hasChanges).toBe(false)
    })

    it('toggling a direct permission marks it for revoke', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.togglePermission('employees.update', 'direct') })
      expect(result.current.isChecked('employees.update', 'direct')).toBe(false)
      expect(result.current.hasChanges).toBe(true)
    })

    it('toggling a direct permission twice reverts to checked', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.togglePermission('employees.update', 'direct') })
      act(() => { result.current.togglePermission('employees.update', 'direct') })
      expect(result.current.isChecked('employees.update', 'direct')).toBe(true)
      expect(result.current.hasChanges).toBe(false)
    })

    it('toggling a role permission is a no-op', () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.togglePermission('employees.view', 'role') })
      expect(result.current.isChecked('employees.view', 'role')).toBe(true)
      expect(result.current.hasChanges).toBe(false)
    })
  })

  // ── save sends correct delta ─────────────────────────────────────────────────

  describe('save', () => {
    it('calls syncPermissions with grant and revoke delta', async () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.openDialog() })

      // Grant one, revoke another
      act(() => { result.current.togglePermission('employees.create', 'none') })
      act(() => { result.current.togglePermission('employees.update', 'direct') })

      act(() => { result.current.save() })

      await waitFor(() => {
        expect(userPermissionsApi.syncPermissions).toHaveBeenCalledWith('emp-1', {
          grant: ['employees.create'],
          revoke: ['employees.update'],
        })
      })
    })

    it('clears pending changes after successful save', async () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.openDialog() })
      act(() => { result.current.togglePermission('employees.create', 'none') })
      act(() => { result.current.save() })

      await waitFor(() => {
        expect(result.current.hasChanges).toBe(false)
      })
    })

    it('closes dialog after successful save', async () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.openDialog() })
      act(() => { result.current.togglePermission('employees.create', 'none') })
      act(() => { result.current.save() })

      await waitFor(() => {
        expect(result.current.open).toBe(false)
      })
    })
  })

  // ── permissions are fetched when dialog opens ────────────────────────────────

  describe('data fetching', () => {
    it('fetches permissions when dialog opens', async () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.openDialog() })

      await waitFor(() => {
        expect(userPermissionsApi.getPermissions).toHaveBeenCalledWith('emp-1')
      })
    })

    it('exposes groups from the API response', async () => {
      const { result } = renderHook(() => usePermissionManager('emp-1'), {
        wrapper: createWrapper(),
      })
      act(() => { result.current.openDialog() })

      await waitFor(() => {
        expect(result.current.groups).toHaveLength(1)
        expect(result.current.groups[0]?.group).toBe('Empleados')
      })
    })

    it('does not fetch when dialog is closed', () => {
      renderHook(() => usePermissionManager('emp-1'), { wrapper: createWrapper() })
      expect(userPermissionsApi.getPermissions).not.toHaveBeenCalled()
    })
  })
})
