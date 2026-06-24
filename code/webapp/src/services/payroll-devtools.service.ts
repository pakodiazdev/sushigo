import { apiClient } from '@/lib/api-client'

export type SeedScenario =
    | 'full_week'
    | 'with_lates'
    | 'with_unpaid_leave'
    | 'with_overtime'
    | 'with_absences'
    | 'mixed'

export interface SeedPayrollParams {
    branch_id: number
    period_start: string
    period_end: string
    scenario: SeedScenario
}

export interface SeedPayrollResult {
    created: number
    deleted: number
    employees: string[]
}

export async function seedPayrollAttendance(params: SeedPayrollParams): Promise<SeedPayrollResult> {
    const res = await apiClient.post<{ status: string; data: SeedPayrollResult }>(
        '/devtools/payroll/seed',
        params,
    )
    return res.data.data
}
