// User Permission Manager Types

export type PermissionSource = 'role' | 'direct' | 'none'

export interface UserPermission {
  name: string
  label: string
  source: PermissionSource
  via_roles: string[]
}

export interface PermissionGroup {
  group: string
  permissions: UserPermission[]
}

export interface UserPermissionsResponse {
  groups: PermissionGroup[]
}

export interface SyncPermissionsPayload {
  grant: string[]
  revoke: string[]
}
