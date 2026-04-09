import { apiClient } from '@/lib/api-client'
import type { Leave, LeaveType, RegisterDirectLeaveRequest } from '@/types/leave'

export const leaveApi = {
  /**
   * GET /leave-types
   * Returns all active leave types for the form selector.
   */
  listLeaveTypes: () =>
    apiClient.get<{ status: number; data: LeaveType[] }>('/leave-types'),

  /**
   * POST /leaves
   * Registers a direct (immediately approved) leave for an employee.
   */
  registerDirectLeave: (data: RegisterDirectLeaveRequest) =>
    apiClient.post<{ status: number; data: Leave }>('/leaves', data),
}
