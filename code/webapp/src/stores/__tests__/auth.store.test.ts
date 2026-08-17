import { describe, it, expect, vi, afterEach } from 'vitest'
import {
    extractBranchesFromUser,
    checkIsAdmin,
    checkIsSuperAdmin,
    checkPermission,
    useAuthStore,
} from '@/stores/auth.store'
import { authService } from '@/services/auth.service'
import { apiClient } from '@/lib/api-client'
import type { User, Branch, Role, Permission, OperatingUnitAssignment, OperatingUnit } from '@/types/auth'

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

function createBranch(id: number, name: string): Branch {
    return {
        id,
        code: `B${id}`,
        name,
        region: null,
        timezone: 'America/Mexico_City',
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
    }
}

function createOperatingUnit(branch: Branch): OperatingUnit {
    return {
        id: branch.id * 100,
        branch_id: branch.id,
        name: `OU-${branch.name}`,
        type: 'BRANCH_MAIN',
        start_date: null,
        end_date: null,
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
        branch,
    }
}

function createAssignment(ou: OperatingUnit, isActive = true): OperatingUnitAssignment {
    return {
        id: ou.id + 1,
        user_id: 1,
        operating_unit_id: ou.id,
        assignment_role: 'manager',
        is_active: isActive,
        meta: null,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
        operating_unit: ou,
    }
}

function createRole(name: string): Role {
    return {
        id: Math.floor(Math.random() * 1000),
        name,
        display_name: name.charAt(0).toUpperCase() + name.slice(1),
        description: null,
        guard_name: 'api',
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
    }
}

function createPermission(name: string): Permission {
    return {
        id: Math.floor(Math.random() * 1000),
        name,
        display_name: name.replace(/-/g, ' '),
        description: null,
        guard_name: 'api',
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
    }
}

function createUser(overrides: Partial<User> = {}): User {
    return {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        email_verified_at: null,
        is_active: true,
        meta: null,
        created_at: '2026-01-01T00:00:00+00:00',
        updated_at: '2026-01-01T00:00:00+00:00',
        roles: [],
        permissions: [],
        operating_units: [],
        current_branch: null,
        ...overrides,
    }
}

// ─── extractBranchesFromUser ───────────────────────────────────────────────────

describe('extractBranchesFromUser', () => {
    it('returns empty array when user is null', () => {
        expect(extractBranchesFromUser(null)).toEqual([])
    })

    it('returns empty array when user has no operating_units', () => {
        const user = createUser({ operating_units: undefined })
        expect(extractBranchesFromUser(user)).toEqual([])
    })

    it('returns empty array when user has empty operating_units', () => {
        const user = createUser({ operating_units: [] })
        expect(extractBranchesFromUser(user)).toEqual([])
    })

    it('extracts branches from active operating unit assignments', () => {
        const branch = createBranch(1, 'Downtown')
        const ou = createOperatingUnit(branch)
        const assignment = createAssignment(ou, true)
        const user = createUser({ operating_units: [assignment] })

        const result = extractBranchesFromUser(user)
        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe(1)
        expect(result[0]?.name).toBe('Downtown')
    })

    it('ignores inactive assignments', () => {
        const branch = createBranch(1, 'Downtown')
        const ou = createOperatingUnit(branch)
        const assignment = createAssignment(ou, false) // inactive
        const user = createUser({ operating_units: [assignment] })

        const result = extractBranchesFromUser(user)
        expect(result).toHaveLength(0)
    })

    it('ignores assignments without operating_unit', () => {
        const assignment: OperatingUnitAssignment = {
            id: 1,
            user_id: 1,
            operating_unit_id: 100,
            assignment_role: 'manager',
            is_active: true,
            meta: null,
            created_at: '2026-01-01T00:00:00+00:00',
            updated_at: '2026-01-01T00:00:00+00:00',
            operating_unit: undefined,
        }
        const user = createUser({ operating_units: [assignment] })

        const result = extractBranchesFromUser(user)
        expect(result).toHaveLength(0)
    })

    it('ignores assignments where operating_unit has no branch', () => {
        const ou: OperatingUnit = {
            id: 100,
            branch_id: 1,
            name: 'OU without branch',
            type: 'BRANCH_MAIN',
            start_date: null,
            end_date: null,
            is_active: true,
            meta: null,
            created_at: '2026-01-01T00:00:00+00:00',
            updated_at: '2026-01-01T00:00:00+00:00',
            branch: undefined,
        }
        const assignment = createAssignment(ou, true)
        const user = createUser({ operating_units: [assignment] })

        const result = extractBranchesFromUser(user)
        expect(result).toHaveLength(0)
    })

    it('deduplicates branches when user has multiple assignments to same branch', () => {
        const branch = createBranch(1, 'Downtown')
        const ou1 = createOperatingUnit(branch)
        const ou2 = { ...createOperatingUnit(branch), id: 200, name: 'OU2' }
        const assignment1 = createAssignment(ou1, true)
        const assignment2 = createAssignment(ou2, true)
        const user = createUser({ operating_units: [assignment1, assignment2] })

        const result = extractBranchesFromUser(user)
        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe(1)
    })

    it('extracts multiple unique branches', () => {
        const branch1 = createBranch(1, 'Downtown')
        const branch2 = createBranch(2, 'Uptown')
        const ou1 = createOperatingUnit(branch1)
        const ou2 = createOperatingUnit(branch2)
        const assignment1 = createAssignment(ou1, true)
        const assignment2 = createAssignment(ou2, true)
        const user = createUser({ operating_units: [assignment1, assignment2] })

        const result = extractBranchesFromUser(user)
        expect(result).toHaveLength(2)
        expect(result.map(b => b.name)).toContain('Downtown')
        expect(result.map(b => b.name)).toContain('Uptown')
    })
})

// ─── checkIsAdmin ──────────────────────────────────────────────────────────────

describe('checkIsAdmin', () => {
    it('returns false when user is null', () => {
        expect(checkIsAdmin(null)).toBe(false)
    })

    it('returns false when user has no roles', () => {
        const user = createUser({ roles: undefined })
        expect(checkIsAdmin(user)).toBe(false)
    })

    it('returns false when user has empty roles array', () => {
        const user = createUser({ roles: [] })
        expect(checkIsAdmin(user)).toBe(false)
    })

    it('returns false when user has non-admin roles', () => {
        const user = createUser({ roles: [createRole('viewer'), createRole('editor')] })
        expect(checkIsAdmin(user)).toBe(false)
    })

    it('returns true when user has admin role', () => {
        const user = createUser({ roles: [createRole('admin')] })
        expect(checkIsAdmin(user)).toBe(true)
    })

    it('returns true when user has super-admin role', () => {
        const user = createUser({ roles: [createRole('super-admin')] })
        expect(checkIsAdmin(user)).toBe(true)
    })

    it('returns true when admin role is among multiple roles', () => {
        const user = createUser({ roles: [createRole('viewer'), createRole('admin'), createRole('editor')] })
        expect(checkIsAdmin(user)).toBe(true)
    })
})

// ─── checkIsSuperAdmin ─────────────────────────────────────────────────────────

describe('checkIsSuperAdmin', () => {
    it('returns false when user is null', () => {
        expect(checkIsSuperAdmin(null)).toBe(false)
    })

    it('returns false when user has no roles', () => {
        const user = createUser({ roles: undefined })
        expect(checkIsSuperAdmin(user)).toBe(false)
    })

    it('returns false when user has empty roles array', () => {
        const user = createUser({ roles: [] })
        expect(checkIsSuperAdmin(user)).toBe(false)
    })

    it('returns false when user is regular admin', () => {
        const user = createUser({ roles: [createRole('admin')] })
        expect(checkIsSuperAdmin(user)).toBe(false)
    })

    it('returns true when user is super-admin', () => {
        const user = createUser({ roles: [createRole('super-admin')] })
        expect(checkIsSuperAdmin(user)).toBe(true)
    })

    it('returns true when super-admin is among multiple roles', () => {
        const user = createUser({ roles: [createRole('admin'), createRole('super-admin')] })
        expect(checkIsSuperAdmin(user)).toBe(true)
    })
})

// ─── checkPermission ───────────────────────────────────────────────────────────

describe('checkPermission', () => {
    it('returns false when user is null', () => {
        expect(checkPermission(null, 'view-reports')).toBe(false)
    })

    it('returns true for admin users regardless of specific permissions', () => {
        const user = createUser({ roles: [createRole('admin')], permissions: [] })
        expect(checkPermission(user, 'any-permission')).toBe(true)
    })

    it('returns true for super-admin users regardless of specific permissions', () => {
        const user = createUser({ roles: [createRole('super-admin')], permissions: [] })
        expect(checkPermission(user, 'any-permission')).toBe(true)
    })

    it('returns false when non-admin user has no permissions', () => {
        const user = createUser({ roles: [createRole('viewer')], permissions: undefined })
        expect(checkPermission(user, 'view-reports')).toBe(false)
    })

    it('returns false when non-admin user has empty permissions array', () => {
        const user = createUser({ roles: [createRole('viewer')], permissions: [] })
        expect(checkPermission(user, 'view-reports')).toBe(false)
    })

    it('returns true when non-admin user has the specific permission', () => {
        const user = createUser({
            roles: [createRole('viewer')],
            permissions: [createPermission('view-reports')],
        })
        expect(checkPermission(user, 'view-reports')).toBe(true)
    })

    it('returns false when non-admin user does not have the specific permission', () => {
        const user = createUser({
            roles: [createRole('viewer')],
            permissions: [createPermission('view-dashboard')],
        })
        expect(checkPermission(user, 'view-reports')).toBe(false)
    })

    it('finds permission among multiple permissions', () => {
        const user = createUser({
            roles: [createRole('viewer')],
            permissions: [
                createPermission('view-dashboard'),
                createPermission('view-reports'),
                createPermission('edit-profile'),
            ],
        })
        expect(checkPermission(user, 'view-reports')).toBe(true)
        expect(checkPermission(user, 'edit-profile')).toBe(true)
        expect(checkPermission(user, 'delete-users')).toBe(false)
    })
})

// ─── logout ────────────────────────────────────────────────────────────────────

describe('logout', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('clears auth state even when authService.logout rejects', async () => {
        const logoutError = new Error('Network error')
        vi.spyOn(authService, 'logout').mockRejectedValueOnce(logoutError)
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        useAuthStore.setState({
            user: createUser(),
            token: 'token-123',
            isAuthenticated: true,
        })

        await useAuthStore.getState().logout()

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining('[auth.store]'),
            logoutError,
        )
        expect(useAuthStore.getState().user).toBeNull()
        expect(useAuthStore.getState().token).toBeNull()
        expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })

    it('clears auth state when authService.logout succeeds', async () => {
        vi.spyOn(authService, 'logout').mockResolvedValueOnce(undefined)
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        useAuthStore.setState({
            user: createUser(),
            token: 'token-123',
            isAuthenticated: true,
        })

        await useAuthStore.getState().logout()

        expect(consoleErrorSpy).not.toHaveBeenCalled()
        expect(useAuthStore.getState().user).toBeNull()
        expect(useAuthStore.getState().token).toBeNull()
        expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
})

// ─── refreshUser ───────────────────────────────────────────────────────────────

describe('refreshUser', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('updates the store with a fresh /auth/me response — e.g. after a self-service avatar change (#420)', async () => {
        const branch = createBranch(1, 'Sucursal Centro')
        const ou = createOperatingUnit(branch)
        const assignment = createAssignment(ou)
        const refreshedUser = createUser({
            avatar_url: 'https://example.com/new-avatar.jpg',
            roles: [createRole('admin')],
            operating_units: [assignment],
        })
        vi.spyOn(authService, 'getMe').mockResolvedValueOnce({ status: 200, data: refreshedUser })

        useAuthStore.setState({
            user: createUser({ avatar_url: null }),
            isAdmin: false,
            isSuperAdmin: false,
            currentBranch: branch,
        })

        await useAuthStore.getState().refreshUser()

        expect(useAuthStore.getState().user?.avatar_url).toBe('https://example.com/new-avatar.jpg')
        expect(useAuthStore.getState().isAdmin).toBe(true)
    })

    it('keeps the current branch when it is still among the refreshed branches', async () => {
        const branch = createBranch(1, 'Sucursal Centro')
        const ou = createOperatingUnit(branch)
        const assignment = createAssignment(ou)
        const refreshedUser = createUser({ operating_units: [assignment] })
        vi.spyOn(authService, 'getMe').mockResolvedValueOnce({ status: 200, data: refreshedUser })

        useAuthStore.setState({ user: createUser(), currentBranch: branch })

        await useAuthStore.getState().refreshUser()

        expect(useAuthStore.getState().currentBranch?.id).toBe(branch.id)
    })

    it('preserves the existing branch context when /auth/me omits operating_units and the branches fallback fails, e.g. a transient network hiccup during a routine avatar save (#420)', async () => {
        // MeController never returns operating_units (see extractBranchesFromUser
        // returning [] for it), so refreshUser() always falls back to
        // fetchBranchesFromApi() — if that fallback request itself fails, it
        // swallows the error into [], which used to read as "user now has zero
        // branches" and wipe an already-populated currentBranch/availableBranches
        // out from under the user on every single refreshUser() call.
        const branch = createBranch(1, 'Sucursal Centro')
        const refreshedUser = createUser({ avatar_url: 'https://example.com/new-avatar.jpg', operating_units: [] })
        vi.spyOn(authService, 'getMe').mockResolvedValueOnce({ status: 200, data: refreshedUser })
        vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network error'))

        useAuthStore.setState({
            user: createUser({ avatar_url: null }),
            currentBranch: branch,
            availableBranches: [branch],
        })

        await useAuthStore.getState().refreshUser()

        expect(useAuthStore.getState().currentBranch?.id).toBe(branch.id)
        expect(useAuthStore.getState().availableBranches).toEqual([branch])
        // The user/avatar data itself must still refresh even though branches didn't.
        expect(useAuthStore.getState().user?.avatar_url).toBe('https://example.com/new-avatar.jpg')
    })

    it('clears the branch when the user genuinely has none yet (first refresh, nothing to preserve)', async () => {
        const refreshedUser = createUser({ operating_units: [] })
        vi.spyOn(authService, 'getMe').mockResolvedValueOnce({ status: 200, data: refreshedUser })
        vi.spyOn(apiClient, 'get').mockRejectedValueOnce(new Error('Network error'))

        useAuthStore.setState({ user: createUser(), currentBranch: null, availableBranches: [] })

        await useAuthStore.getState().refreshUser()

        expect(useAuthStore.getState().currentBranch).toBeNull()
        expect(useAuthStore.getState().availableBranches).toEqual([])
    })
})
