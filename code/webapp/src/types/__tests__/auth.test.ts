import { describe, it, expect } from 'vitest'
import type {
  User,
  Role,
  Permission,
  Branch,
  OperatingUnit,
  OperatingUnitAssignment,
} from '../auth'

describe('Auth Types', () => {
  describe('User type', () => {
    it('can create a valid user', () => {
      const user: User = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        email_verified_at: '2026-01-01T00:00:00Z',
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(user.name).toBe('John Doe')
      expect(user.is_active).toBe(true)
    })

    it('can have null email_verified_at', () => {
      const user: User = {
        id: 1,
        name: 'Unverified User',
        email: 'unverified@example.com',
        email_verified_at: null,
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(user.email_verified_at).toBeNull()
    })

    it('can have roles and permissions', () => {
      const role: Role = {
        id: 1,
        name: 'admin',
        display_name: 'Administrator',
        description: null,
        guard_name: 'api',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      const permission: Permission = {
        id: 1,
        name: 'manage-users',
        display_name: 'Manage Users',
        description: null,
        guard_name: 'api',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      const user: User = {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        email_verified_at: '2026-01-01T00:00:00Z',
        is_active: true,
        meta: null,
        roles: [role],
        permissions: [permission],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(user.roles).toHaveLength(1)
      expect(user.permissions).toHaveLength(1)
    })
  })

  describe('Branch type', () => {
    it('can create a valid branch', () => {
      const branch: Branch = {
        id: 1,
        code: 'SUC-001',
        name: 'Sucursal Centro',
        region: 'Centro',
        timezone: 'America/Mexico_City',
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(branch.code).toBe('SUC-001')
      expect(branch.timezone).toBe('America/Mexico_City')
    })

    it('can have null region', () => {
      const branch: Branch = {
        id: 1,
        code: 'SUC-002',
        name: 'Sucursal Sin Region',
        region: null,
        timezone: 'America/Mexico_City',
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(branch.region).toBeNull()
    })
  })

  describe('OperatingUnit type', () => {
    it('can create a BRANCH_MAIN unit', () => {
      const ou: OperatingUnit = {
        id: 1,
        branch_id: 1,
        name: 'Main Operations',
        type: 'BRANCH_MAIN',
        start_date: null,
        end_date: null,
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(ou.type).toBe('BRANCH_MAIN')
    })

    it('can create an EVENT_TEMP unit with dates', () => {
      const ou: OperatingUnit = {
        id: 2,
        branch_id: 1,
        name: 'Festival 2026',
        type: 'EVENT_TEMP',
        start_date: '2026-03-01',
        end_date: '2026-03-03',
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(ou.type).toBe('EVENT_TEMP')
      expect(ou.start_date).toBe('2026-03-01')
      expect(ou.end_date).toBe('2026-03-03')
    })

    it('supports all operating unit types', () => {
      const types = ['BRANCH_MAIN', 'BRANCH_BUFFER', 'BRANCH_RETURN', 'EVENT_TEMP'] as const
      types.forEach((type) => {
        const ou: OperatingUnit = {
          id: 1,
          branch_id: 1,
          name: `${type} Unit`,
          type,
          start_date: null,
          end_date: null,
          is_active: true,
          meta: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        }
        expect(ou.type).toBe(type)
      })
    })
  })

  describe('OperatingUnitAssignment type', () => {
    it('can create a valid assignment', () => {
      const assignment: OperatingUnitAssignment = {
        id: 1,
        user_id: 1,
        operating_unit_id: 1,
        assignment_role: 'manager',
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(assignment.assignment_role).toBe('manager')
      expect(assignment.is_active).toBe(true)
    })

    it('can have null assignment_role', () => {
      const assignment: OperatingUnitAssignment = {
        id: 1,
        user_id: 1,
        operating_unit_id: 1,
        assignment_role: null,
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(assignment.assignment_role).toBeNull()
    })
  })
})
