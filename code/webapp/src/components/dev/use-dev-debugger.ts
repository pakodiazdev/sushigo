import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth.store'
import type { User as AuthUser } from '@/types/auth'
import { isDevLoginEnabled } from './dev-login-enabled'
import { listDevUsers, loginAs, type DevUser } from '@/services/dev-api'

export interface DebuggerState {
    position: { x: number; y: number }
    expandedSections: {
        user: boolean
        roles: boolean
        queries: boolean
        devLogin: boolean
    }
}

export type { DevUser } from '@/services/dev-api'

const STORAGE_KEY = 'dev_debugger_state'

function getDefaultState(): DebuggerState {
    return {
        position: { x: window.innerWidth - 420, y: 100 },
        expandedSections: {
            user: true,
            roles: false,
            queries: false,
            devLogin: true,
        },
    }
}

function loadDebuggerState(): DebuggerState {
    const fallback = getDefaultState()
    const saved = localStorage.getItem(STORAGE_KEY)

    if (!saved) {
        return fallback
    }

    try {
        const parsed = JSON.parse(saved) as Partial<DebuggerState>

        return {
            position: parsed.position ?? fallback.position,
            expandedSections: {
                ...fallback.expandedSections,
                ...parsed.expandedSections,
            },
        }
    } catch {
        return fallback
    }
}

function isEditableElement(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false
    }

    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable
    )
}

export function useDevDebugger() {
    const { user, isAuthenticated, isAdmin, token, initializeAfterReset } = useAuthStore()
    const queryClient = useQueryClient()
    const dragRef = useRef<HTMLDivElement>(null)

    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isHidden, setIsHidden] = useState(() => import.meta.env.VITE_DEV_DEBUGGER_START_HIDDEN === 'true')
    const [isMinimized, setIsMinimized] = useState(false)
    const [state, setState] = useState<DebuggerState>(loadDebuggerState)
    const [devLoginSearch, setDevLoginSearch] = useState('')
    const [devLoginRoleFilter, setDevLoginRoleFilter] = useState<string | null>(null)
    const [loggingInUserId, setLoggingInUserId] = useState<number | null>(null)

    const devLoginEnabled = isDevLoginEnabled()
    const { data: devUsers, isLoading: isLoadingDevUsers } = useQuery({
        queryKey: ['dev-users'],
        queryFn: listDevUsers,
        enabled: !isAuthenticated && devLoginEnabled,
        staleTime: Infinity,
    })

    const handleDevLogin = async (devUser: DevUser) => {
        setLoggingInUserId(devUser.id)
        const result = await loginAs(devUser.id)
        if (result) {
            await initializeAfterReset(result.user as AuthUser, result.token)
            globalThis.location.reload()
        }
        setLoggingInUserId(null)
    }

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, [state])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.metaKey || event.ctrlKey) || !event.shiftKey || event.key.toLowerCase() !== 'd') {
                return
            }

            if (isEditableElement(event.target)) {
                return
            }

            event.preventDefault()

            setIsHidden((previouslyHidden) => {
                const nextHidden = !previouslyHidden

                if (!nextHidden) {
                    setIsMinimized(false)
                }

                return nextHidden
            })
        }

        globalThis.addEventListener('keydown', handleKeyDown)

        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging) return

            setState((prev) => ({
                ...prev,
                position: {
                    x: event.clientX - dragOffset.x,
                    y: event.clientY - dragOffset.y,
                },
            }))
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging, dragOffset])

    const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!dragRef.current) return

        const rect = dragRef.current.getBoundingClientRect()
        setDragOffset({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        })
        setIsDragging(true)
    }

    const toggleSection = (section: keyof DebuggerState['expandedSections']) => {
        setState((prev) => ({
            ...prev,
            expandedSections: {
                ...prev.expandedSections,
                [section]: !prev.expandedSections[section],
            },
        }))
    }

    const toggleMinimized = () => {
        setIsMinimized((previouslyMinimized) => !previouslyMinimized)
    }

    const refreshQueries = () => {
        queryClient.invalidateQueries()
    }

    const getQueryCacheStats = () => {
        const cache = queryClient.getQueryCache()
        const queries = cache.getAll()
        return {
            total: queries.length,
            fresh: queries.filter((q) => q.state.dataUpdatedAt > Date.now() - 5000).length,
            stale: queries.filter((q) => q.isStale()).length,
            fetching: queries.filter((q) => q.state.fetchStatus === 'fetching').length,
        }
    }

    const cacheStats = getQueryCacheStats()

    const shortcutLabel =
        typeof navigator !== 'undefined' && /mac/i.test(navigator.userAgent)
            ? 'Cmd+Shift+D'
            : 'Ctrl+Shift+D'

    // Dev Login section is visible while loading or when users are available (null = feature disabled)
    const devLoginSectionVisible = !isAuthenticated && devLoginEnabled && (isLoadingDevUsers || !!devUsers)

    // All unique roles across all users (for the role filter pills)
    const devLoginAllRoles = devUsers
        ? [...new Set(devUsers.flatMap((u) => u.roles))].sort()
        : []

    // Combined filter: text search AND role filter
    const devLoginFilteredUsers = devUsers
        ? devUsers.filter((u) => {
              const q = devLoginSearch.toLowerCase()
              const matchesText =
                  !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
              const matchesRole = !devLoginRoleFilter || u.roles.includes(devLoginRoleFilter)
              return matchesText && matchesRole
          })
        : []

    return {
        dragRef,
        isHidden,
        isMinimized,
        state,
        devLoginSearch,
        setDevLoginSearch,
        loggingInUserId,
        user,
        isAuthenticated,
        isAdmin,
        token,
        devLoginEnabled,
        devLoginSectionVisible,
        devLoginAllRoles,
        devLoginRoleFilter,
        setDevLoginRoleFilter,
        devLoginFilteredUsers,
        devUsers,
        isLoadingDevUsers,
        cacheStats,
        shortcutLabel,
        handleMouseDown,
        toggleSection,
        toggleMinimized,
        refreshQueries,
        handleDevLogin,
    }
}
