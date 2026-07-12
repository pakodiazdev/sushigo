import { apiClient } from '@/lib/api-client'
import type { PaginatedResponse } from '@/types/employee'
import type { AttendanceAuditLog, AuditLogFilters } from '@/types/attendance-payroll'

export const AUDITABLE_TYPE_ATTENDANCE = String.raw`App\Models\Attendance`
export const AUDITABLE_TYPE_EMPLOYEE = String.raw`App\Models\Employee`

export const auditApi = {
  list: (params?: AuditLogFilters) =>
    apiClient.get<PaginatedResponse<AttendanceAuditLog>>('/audit-logs', { params }),
}
