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
        pageActions: boolean
        clock: boolean
    }
}

export type { DevUser } from '@/services/dev-api'

const STORAGE_KEY = 'dev_debugger_state'
const MOBILE_BREAKPOINT_QUERY = '(max-width: 767px)'
const DRAG_KEY_STEP = 20

const DRAG_KEY_DELTAS: Record<string, { x: number; y: number }> = {
    ArrowUp: { x: 0, y: -DRAG_KEY_STEP },
    ArrowDown: { x: 0, y: DRAG_KEY_STEP },
    ArrowLeft: { x: -DRAG_KEY_STEP, y: 0 },
    ArrowRight: { x: DRAG_KEY_STEP, y: 0 },
}

/** DOM id used to scroll a given section into view — shared between the hook and the Section component. */
export function sectionElementId(section: keyof DebuggerState['expandedSections']): string {
    return `debugger-section-${section}`
}

/** Derives the Swagger UI URL from VITE_API_URL by swapping the `/api/v1` suffix for `/api/documentation`. */
export function getSwaggerDocsUrl(): string {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
    return apiUrl.replace(/\/api\/v1\/?$/, '/api/documentation')
}

/** Safe matchMedia check — `matchMedia` is not implemented in the default jsdom test environment. */
function matchesMobileBreakpoint(): boolean {
    return typeof globalThis.matchMedia === 'function'
        ? globalThis.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
        : false
}

function getDefaultState(): DebuggerState {
    return {
        position: { x: window.innerWidth - 420, y: 100 },
        expandedSections: {
            user: true,
            roles: false,
            queries: false,
            devLogin: true,
            pageActions: true,
            clock: false,
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
    const [devLoginPermissionSearch, setDevLoginPermissionSearch] = useState('')
    const [devLoginPermissionFilter, setDevLoginPermissionFilter] = useState<string | null>(null)
    const [loggingInUserId, setLoggingInUserId] = useState<number | null>(null)
    const [isMobile, setIsMobile] = useState(matchesMobileBreakpoint)
    const [scrollTarget, setScrollTarget] = useState<keyof DebuggerState['expandedSections'] | null>(null)

    const devLoginEnabled = isDevLoginEnabled()
    const { data: devUsers, isLoading: isLoadingDevUsers } = useQuery({
        queryKey: ['dev-users'],
        queryFn: listDevUsers,
        enabled: !isAuthenticated && devLoginEnabled,
        staleTime: Infinity,
    })

    const handleDevLogin = async (devUser: DevUser) => {
        setLoggingInUserId(devUser.id)
        try {
            const result = await loginAs(devUser.id)
            if (result) {
                await initializeAfterReset(result.user as AuthUser, result.token)
                globalThis.location.reload()
            }
        } finally {
            setLoggingInUserId(null)
        }
    }

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, [state])

    useEffect(() => {
        if (typeof globalThis.matchMedia !== 'function') {
            return
        }

        const mediaQuery = globalThis.matchMedia(MOBILE_BREAKPOINT_QUERY)
        const handleChange = (event: MediaQueryListEvent) => setIsMobile(event.matches)

        mediaQuery.addEventListener('change', handleChange)

        return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    useEffect(() => {
        if (!scrollTarget) return

        document.getElementById(sectionElementId(scrollTarget))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setScrollTarget(null)
    }, [scrollTarget, state.expandedSections])

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

    const handleMouseDown = (event: React.MouseEvent<HTMLElement>) => {
        if (!dragRef.current) return

        const rect = dragRef.current.getBoundingClientRect()
        setDragOffset({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
        })
        setIsDragging(true)
    }

    /**
     * Keyboard equivalent for the mouse-drag handles — arrow keys reposition the panel, and
     * Enter/Space reset it to the default corner. The reset gives the handle's `role="button"`
     * a real activation effect (per ARIA button semantics) and doubles as recovery if the panel
     * gets dragged off-screen.
     */
    const handleDragKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setState((prev) => ({ ...prev, position: getDefaultState().position }))
            return
        }

        const delta = DRAG_KEY_DELTAS[event.key]
        if (!delta) return

        event.preventDefault()
        setState((prev) => ({
            ...prev,
            position: {
                x: prev.position.x + delta.x,
                y: prev.position.y + delta.y,
            },
        }))
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

    /** Expands the debugger (if minimized), forces the given section open, and scrolls it into view. */
    const jumpToSection = (section: keyof DebuggerState['expandedSections']) => {
        setIsMinimized(false)
        setState((prev) => ({
            ...prev,
            expandedSections: {
                ...prev.expandedSections,
                [section]: true,
            },
        }))
        setScrollTarget(section)
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
        ? [...new Set(devUsers.flatMap((u) => u.roles))].sort((a, b) => a.localeCompare(b))
        : []

    // All unique permissions across all users (for the permission autocomplete filter)
    const devLoginAllPermissions = devUsers
        ? [...new Set(devUsers.flatMap((u) => u.permissions))].sort((a, b) => a.localeCompare(b))
        : []

    // Autocomplete suggestions: permissions matching the search input
    const devLoginPermissionSuggestions =
        devLoginPermissionSearch.length > 0
            ? devLoginAllPermissions.filter((p) =>
                  p.toLowerCase().includes(devLoginPermissionSearch.toLowerCase()),
              )
            : []

    // Combined filter: text search AND role filter AND permission filter
    const devLoginFilteredUsers = devUsers
        ? devUsers.filter((u) => {
              const q = devLoginSearch.toLowerCase()
              const matchesText =
                  !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
              const matchesRole = !devLoginRoleFilter || u.roles.includes(devLoginRoleFilter)
              const matchesPermission =
                  !devLoginPermissionFilter || u.permissions.includes(devLoginPermissionFilter)
              return matchesText && matchesRole && matchesPermission
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
        devLoginPermissionSearch,
        setDevLoginPermissionSearch,
        devLoginPermissionFilter,
        setDevLoginPermissionFilter,
        devLoginAllPermissions,
        devLoginPermissionSuggestions,
        devLoginFilteredUsers,
        devUsers,
        isLoadingDevUsers,
        cacheStats,
        shortcutLabel,
        isMobile,
        swaggerDocsUrl: getSwaggerDocsUrl(),
        handleMouseDown,
        handleDragKeyDown,
        toggleSection,
        toggleMinimized,
        jumpToSection,
        refreshQueries,
        handleDevLogin,
    }
}
