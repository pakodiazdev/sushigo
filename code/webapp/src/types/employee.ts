// Employee Module Types

// ============================================================================
// Enums
// ============================================================================

export enum EmployeeRole {
  MANAGER = "MANAGER",
  COOK = "COOK",
  KITCHEN_ASSISTANT = "KITCHEN_ASSISTANT",
  DELIVERY_DRIVER = "DELIVERY_DRIVER",
}

// ============================================================================
// Base Types
// ============================================================================

export interface Employee {
  id: string; // ULID public identifier
  code: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  is_active: boolean;
  email?: string | null;
  phone?: string | null;
  phone_country?: string | null;
  meta: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export interface EntityResponse<T> {
  data: T;
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface EmployeeFormData {
  code: string;
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  email?: string;
  phone?: string;
  meta?: Record<string, any>;
}

export interface EmployeeUpdateData {
  first_name?: string;
  last_name?: string;
  role?: EmployeeRole;
  meta?: Record<string, any>;
}

// ============================================================================
// Filter/Query Types
// ============================================================================

export interface EmployeeFilters {
  is_active?: boolean;
  role?: EmployeeRole;
  search?: string;
  per_page?: number;
  page?: number;
}
