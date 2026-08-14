// Employee Module Types

// ============================================================================
// Position Role Constants
// ============================================================================

export const EMPLOYEE_POSITION_ROLES = {
  'manager': 'Gerente',
  'cook': 'Cocinero',
  'kitchen-assistant': 'Asistente de Cocina',
  'delivery-driver': 'Repartidor',
  'acting-manager': 'Gerente Interino',
  'admin': 'Administrador',
  'super-admin': 'Super Administrador',
} as const

export type EmployeePositionRole = keyof typeof EMPLOYEE_POSITION_ROLES

// ============================================================================
// Base Types
// ============================================================================

import type { EmploymentPeriod } from './employment-period'

/** Personal data owned by the linked User account — fields are null when has_user is false. */
export interface EmployeeUser {
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  phone_country: string | null
  /** URL of the user's primary avatar photo, or null when none is attached. */
  avatar_url: string | null
}

export interface Employee {
  id: string // ULID public identifier
  code: string
  user: EmployeeUser
  roles: EmployeePositionRole[]
  is_active: boolean
  /** True for roles (e.g. admin, super-admin) that do not check in/out — excluded from the attendance list */
  attendance_exempt: boolean
  /** null = inherits the tenant-wide vacation policy; 'ContractualPolicy' = this employee has a contractual override */
  vacation_entitlement_rule_key: 'ContractualPolicy' | null
  vacation_entitlement_custom_table: { years_from: number; days: number }[] | null
  has_active_period?: boolean | null
  has_user: boolean
  meta: Record<string, unknown> | null
  employment_periods?: EmploymentPeriod[]
  created_at: string
  updated_at: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  status: number
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  } | null
}

export interface EntityResponse<T> {
  status: number
  data: T
  meta?: Record<string, unknown> | null
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface EmployeeFormData {
  code: string
  first_name: string
  last_name: string
  roles: EmployeePositionRole[]
  email?: string
  phone?: string
  meta?: Record<string, unknown>
  branch_id?: number
  start_date?: string
  attendance_exempt?: boolean
  /** Gallery public_id from POST /media/upload — only sent when the admin uploaded an avatar. */
  media_gallery_id?: string
  owner_token?: string
}

export interface DeactivateEmployeeData {
  end_date: string
  termination_reason?: string
}

export interface RehireEmployeeData {
  branch_id: number
  start_date: string
}

export interface EmployeeUpdateData {
  first_name?: string
  last_name?: string
  roles?: EmployeePositionRole[]
  email?: string
  phone?: string
  meta?: Record<string, unknown>
  attendance_exempt?: boolean
  /** Gallery public_id from POST /media/upload — only sent when the admin uploaded an avatar. */
  media_gallery_id?: string
  owner_token?: string
}

// ============================================================================
// Filter/Query Types
// ============================================================================

export interface EmployeeFilters {
  is_active?: boolean
  status?: string
  role?: EmployeePositionRole
  search?: string
  per_page?: number
  page?: number
  sort?: string[]
}
