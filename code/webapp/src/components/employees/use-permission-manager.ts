import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userPermissionsApi } from '@/services/user-permissions-api'
import { useToast } from '@/components/ui/toast-provider'
import { getApiErrorMessage } from '@/lib/api-error'
import type { PermissionGroup, PermissionSource } from '@/types/user-permissions'

export function usePermissionManager(employeeId: string) {
  const [open, setOpen] = useState(false)
  const [pendingGrant, setPendingGrant] = useState<Set<string>>(new Set())
  const [pendingRevoke, setPendingRevoke] = useState<Set<string>>(new Set())

  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const query = useQuery({
    queryKey: ['employee-permissions', employeeId],
    queryFn: async () => {
      const response = await userPermissionsApi.getPermissions(employeeId)
      return response.data.data
    },
    enabled: open && !!employeeId,
    staleTime: 0,
  })

  const syncMutation = useMutation({
    mutationFn: () =>
      userPermissionsApi.syncPermissions(employeeId, {
        grant: Array.from(pendingGrant),
        revoke: Array.from(pendingRevoke),
      }),
    onSuccess: (response) => {
      queryClient.setQueryData(['employee-permissions', employeeId], response.data.data)
      setPendingGrant(new Set())
      setPendingRevoke(new Set())
      showSuccess('Permisos actualizados correctamente.', 'Permisos')
      setOpen(false)
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Error al actualizar los permisos.'), 'Permisos')
    },
  })

  const openDialog = useCallback(() => {
    setPendingGrant(new Set())
    setPendingRevoke(new Set())
    setOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setPendingGrant(new Set())
    setPendingRevoke(new Set())
    setOpen(false)
  }, [])

  const togglePermission = useCallback((name: string, source: PermissionSource) => {
    if (source === 'role') return

    if (pendingGrant.has(name)) {
      setPendingGrant((prev) => {
        const next = new Set(prev)
        next.delete(name)
        return next
      })
      return
    }

    if (pendingRevoke.has(name)) {
      setPendingRevoke((prev) => {
        const next = new Set(prev)
        next.delete(name)
        return next
      })
      return
    }

    if (source === 'none') {
      setPendingGrant((prev) => new Set([...prev, name]))
    } else {
      setPendingRevoke((prev) => new Set([...prev, name]))
    }
  }, [pendingGrant, pendingRevoke])

  /**
   * Returns the effective checked state for display, accounting for pending changes.
   */
  const isChecked = useCallback((name: string, source: PermissionSource): boolean => {
    if (pendingGrant.has(name)) return true
    if (pendingRevoke.has(name)) return false
    return source === 'role' || source === 'direct'
  }, [pendingGrant, pendingRevoke])

  const hasChanges = pendingGrant.size > 0 || pendingRevoke.size > 0

  const groups: PermissionGroup[] = query.data?.groups ?? []

  return {
    open,
    openDialog,
    closeDialog,
    groups,
    isLoading: query.isLoading,
    isSaving: syncMutation.isPending,
    hasChanges,
    togglePermission,
    isChecked,
    save: () => syncMutation.mutate(),
  }
}
