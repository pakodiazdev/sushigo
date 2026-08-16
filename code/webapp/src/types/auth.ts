// Authentication and User Management Types

import type { MediaGalleryAsset } from '@/types/media'

export interface User {
  id: number
  name: string
  email: string
  /** URL of the user's primary avatar photo, or null/undefined when none is attached. */
  avatar_url?: string | null
  /** The user's avatar gallery (id + every asset in it), null/undefined when none is
   *  attached — lets the self-service avatar uploader hydrate and manage an existing
   *  gallery instead of only ever replacing it wholesale (#420). */
  avatar_gallery?: { id: string; assets: MediaGalleryAsset[] } | null
  email_verified_at: string | null
  is_active: boolean
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Relationships
  roles?: Role[]
  permissions?: Permission[]
  operating_units?: OperatingUnitAssignment[]
  current_branch?: Branch | null
}

export interface Role {
  id: number
  name: string
  display_name: string
  description: string | null
  guard_name: string
  created_at: string
  updated_at: string
  permissions?: Permission[]
}

export interface Permission {
  id: number
  name: string
  display_name: string
  description: string | null
  guard_name: string
  created_at: string
  updated_at: string
}

export interface Branch {
  id: number
  code: string
  name: string
  region: string | null
  timezone: string
  is_active: boolean
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface OperatingUnit {
  id: number
  branch_id: number
  name: string
  type: 'BRANCH_MAIN' | 'BRANCH_BUFFER' | 'BRANCH_RETURN' | 'EVENT_TEMP'
  start_date: string | null
  end_date: string | null
  is_active: boolean
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  branch?: Branch
}

export interface OperatingUnitAssignment {
  id: number
  user_id: number
  operating_unit_id: number
  assignment_role: string | null
  is_active: boolean
  meta: Record<string, unknown> | null
  created_at: string
  updated_at: string
  operating_unit?: OperatingUnit
}

export interface AuthState {
  user: User | null
  token: string | null
  currentBranch: Branch | null
  availableBranches: Branch[]
  isAuthenticated: boolean
  isAdmin: boolean
  can: (permission: string) => boolean
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

export interface BranchSwitchRequest {
  branch_id: number
}

export interface BranchSwitchResponse {
  message: string
  current_branch: Branch
}
