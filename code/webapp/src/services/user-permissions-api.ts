import { apiClient } from '@/lib/api-client'
import type { SyncPermissionsPayload, UserPermissionsResponse } from '@/types/user-permissions'

export const userPermissionsApi = {
  /**
   * GET /employees/{employeeId}/permissions
   * Returns all system permissions with their source (role | direct | none) for the employee's user.
   */
  getPermissions: (employeeId: string) =>
    apiClient.get<{ status: number; data: UserPermissionsResponse }>(
      `/employees/${employeeId}/permissions`,
    ),

  /**
   * PUT /employees/{employeeId}/permissions
   * Grants or revokes direct permissions on the employee's user.
   * Role-based permissions are not affected.
   */
  syncPermissions: (employeeId: string, payload: SyncPermissionsPayload) =>
    apiClient.put<{ status: number; data: UserPermissionsResponse }>(
      `/employees/${employeeId}/permissions`,
      payload,
    ),
}
