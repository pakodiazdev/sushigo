import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { User, Branch, AuthState } from '@/types/auth'
import { apiClient } from '@/lib/api-client'

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>
    logout: () => void
    switchBranch: (branchId: number) => Promise<void>
    refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
    children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(() =>
        localStorage.getItem('auth_token')
    )
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null)
    const [availableBranches, setAvailableBranches] = useState<Branch[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Check if user is admin
    const isAdmin = user?.roles?.some(role =>
        role.name === 'admin' || role.name === 'super-admin'
    ) ?? false

    // Check permissions
    const can = (permission: string): boolean => {
        if (!user) return false
        if (isAdmin) return true // Admins can do everything

        return user.permissions?.some(p => p.name === permission) ?? false
    }

    // Extract available branches from user's operating units
    useEffect(() => {
        if (user?.operating_units) {
            const branches = new Map<number, Branch>()

            user.operating_units.forEach(assignment => {
                if (assignment.operating_unit?.branch && assignment.is_active) {
                    const branch = assignment.operating_unit.branch
                    if (!branches.has(branch.id)) {
                        branches.set(branch.id, branch)
                    }
                }
            })

            setAvailableBranches(Array.from(branches.values()))

            // Auto-select branch if user has only one
            if (branches.size === 1 && !currentBranch) {
                const [singleBranch] = Array.from(branches.values())
                if (singleBranch) {
                    setCurrentBranch(singleBranch)
                    localStorage.setItem('current_branch_id', String(singleBranch.id))
                }
            }
        }
    }, [user])

    // Load current branch from localStorage
    useEffect(() => {
        const savedBranchId = localStorage.getItem('current_branch_id')
        if (savedBranchId && availableBranches.length > 0) {
            const branch = availableBranches.find(b => b.id === parseInt(savedBranchId))
            if (branch) {
                setCurrentBranch(branch)
            }
        }
    }, [availableBranches])

    // Fetch user data on mount if token exists
    useEffect(() => {
        const initializeAuth = async () => {
            if (token) {
                try {
                    await refreshUser()
                } catch (error) {
                    console.error('Failed to refresh user:', error)
                    // Token might be invalid, clear it
                    setToken(null)
                    localStorage.removeItem('auth_token')
                }
            }
            setIsLoading(false)
        }

        initializeAuth()
    }, [token])

    const login = async (email: string, password: string) => {
        try {
            const response = await apiClient.post<{
                access_token: string
                token_type: string
                user: User
            }>('/auth/login', { email, password })

            const { access_token, user: userData } = response.data

            setToken(access_token)
            setUser(userData)
            localStorage.setItem('auth_token', access_token)

            // If admin and multiple branches, don't auto-select
            const isUserAdmin = userData.roles?.some(role =>
                role.name === 'admin' || role.name === 'super-admin'
            )

            if (!isUserAdmin) {
                // For non-admin users, extract their single branch
                const userBranches = new Map<number, Branch>()
                userData.operating_units?.forEach(assignment => {
                    if (assignment.operating_unit?.branch && assignment.is_active) {
                        userBranches.set(assignment.operating_unit.branch.id, assignment.operating_unit.branch)
                    }
                })

                if (userBranches.size === 1) {
                    const [branch] = Array.from(userBranches.values())
                    if (branch) {
                        setCurrentBranch(branch)
                        localStorage.setItem('current_branch_id', String(branch.id))
                    }
                }
            }
        } catch (error) {
            console.error('Login error:', error)
            throw error
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        setCurrentBranch(null)
        setAvailableBranches([])
        localStorage.removeItem('auth_token')
        localStorage.removeItem('current_branch_id')
    }

    const switchBranch = async (branchId: number) => {
        try {
            // Update backend if needed (optional, depends on your API)
            // await apiClient.post('/auth/switch-branch', { branch_id: branchId })

            const branch = availableBranches.find(b => b.id === branchId)
            if (branch) {
                setCurrentBranch(branch)
                localStorage.setItem('current_branch_id', branchId.toString())
            } else {
                throw new Error('Branch not available for this user')
            }
        } catch (error) {
            console.error('Switch branch error:', error)
            throw error
        }
    }

    const refreshUser = async () => {
        try {
            const response = await apiClient.get<{ data: User }>('/auth/me')
            setUser(response.data.data)
        } catch (error) {
            console.error('Refresh user error:', error)
            throw error
        }
    }

    const value: AuthContextType = {
        user,
        token,
        currentBranch,
        availableBranches,
        isAuthenticated: !!user && !!token,
        isAdmin,
        can,
        login,
        logout,
        switchBranch,
        refreshUser,
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
