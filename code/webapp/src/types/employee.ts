// Employee Module Types

// ============================================================================
// Position Role Constants
// ============================================================================

export const EMPLOYEE_POSITION_ROLES = {
  'employee-manager': 'Gerente',
  'employee-cook': 'Cocinero',
  'employee-kitchen-assistant': 'Asistente de Cocina',
  'employee-delivery-driver': 'Repartidor',
  'employee-acting-manager': 'Gerente Interino',
} as const

export type EmployeePositionRole = keyof typeof EMPLOYEE_POSITION_ROLES

// ============================================================================
// Base Types
// ============================================================================

export interface Employee {
  id: string // ULID public identifier
  code: string
  first_name: string
  last_name: string
  roles: string[]
  is_active: boolean
  email?: string | null
  phone?: string | null
  phone_country?: string | null
  meta: Record<string, any> | null
  created_at: string
  updated_at: string
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    from: number
    last_page: number
    per_page: number
    to: number
    total: number
  }
  links: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

export interface EntityResponse<T> {
  data: T
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface EmployeeFormData {
  code: string
  first_name: string
  last_name: string
  roles: string[]
  email?: string
  phone?: string
  meta?: Record<string, any>
}

export interface EmployeeUpdateData {
  first_name?: string
  last_name?: string
  roles?: string[]
  email?: string
  phone?: string
  meta?: Record<string, any>
}

// ============================================================================
// Filter/Query Types
// ============================================================================

export interface EmployeeFilters {
  is_active?: boolean
  role?: string
  search?: string
  per_page?: number
  page?: number
}
