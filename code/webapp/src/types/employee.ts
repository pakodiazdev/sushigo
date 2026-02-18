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

export interface Employee {
  id: string // ULID public identifier
  code: string
  first_name: string
  last_name: string
  roles: EmployeePositionRole[]
  is_active: boolean
  has_active_period?: boolean | null
  email?: string | null
  phone?: string | null
  phone_country?: string | null
  meta: Record<string, any> | null
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
  meta?: Record<string, any> | null
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
  meta?: Record<string, any>
  branch_id?: number
  start_date?: string
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
  meta?: Record<string, any>
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
