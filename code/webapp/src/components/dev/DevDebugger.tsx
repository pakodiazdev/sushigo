import { useState, useEffect, useRef } from 'react'
import {
    Bug,
    User,
    Shield,
    MinusCircle,
    PlusCircle,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    LogIn,
    Search,
    Loader2,
    type LucideIcon
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User as AuthUser } from '@/types/auth'
import { isDevLoginEnabled } from './dev-login-enabled'
import { listDevUsers, loginAs, type DevUser } from '@/services/dev-api'

interface DebuggerState {
    position: { x: number; y: number }
    expandedSections: {
        user: boolean
        roles: boolean
        queries: boolean
        devLogin: boolean
    }
}

const STORAGE_KEY = 'dev_debugger_state'
const SHOULD_START_HIDDEN = import.meta.env.VITE_DEV_DEBUGGER_START_HIDDEN === 'true'

function getDefaultState(): DebuggerState {
    return {
        position: { x: window.innerWidth - 420, y: 100 },
        expandedSections: {
            user: true,
            roles: false,
            queries: false,
            devLogin: true,
        }
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
            }
        }
    } catch {
        return fallback
    }
}

function isEditableElement(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false
    }

    return target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || target instanceof HTMLSelectElement
        || target.isContentEditable
}

export function DevDebugger() {
    const { user, isAuthenticated, isAdmin, token, initializeAfterReset } = useAuthStore()
    const queryClient = useQueryClient()
    const dragRef = useRef<HTMLDivElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isHidden, setIsHidden] = useState(SHOULD_START_HIDDEN)
    const [isMinimized, setIsMinimized] = useState(false)
    const [state, setState] = useState<DebuggerState>(loadDebuggerState)
    const [devLoginSearch, setDevLoginSearch] = useState('')
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
            window.location.reload()
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

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [])

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            if (!isDragging) return

            setState(prev => ({
                ...prev,
                position: {
                    x: event.clientX - dragOffset.x,
                    y: event.clientY - dragOffset.y,
                }
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
        setState(prev => ({
            ...prev,
            expandedSections: {
                ...prev.expandedSections,
                [section]: !prev.expandedSections[section],
            }
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
            fresh: queries.filter(q => q.state.dataUpdatedAt > Date.now() - 5000).length,
            stale: queries.filter(q => q.isStale()).length,
            fetching: queries.filter(q => q.state.fetchStatus === 'fetching').length,
        }
    }

    const cacheStats = getQueryCacheStats()
    const shortcutLabel = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac')
        ? 'Cmd+Shift+D'
        : 'Ctrl+Shift+D'

    if (isHidden) {
        return null
    }

    if (isMinimized) {
        return (
            <div
                ref={dragRef}
                style={{
                    left: state.position.x,
                    top: state.position.y,
                }}
                className="fixed z-[9999] cursor-move"
                onMouseDown={handleMouseDown}
            >
                <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-3 flex items-center gap-2 border-2 border-blue-500">
                    <Bug className="h-5 w-5 text-blue-400" />
                    <span className="text-sm font-mono">Debugger</span>
                    <button
                        onClick={toggleMinimized}
                        className="ml-2 p-1 hover:bg-gray-800 rounded"
                        title="Expand debugger"
                    >
                        <PlusCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={dragRef}
            style={{
                left: state.position.x,
                top: state.position.y,
                width: '380px',
                maxHeight: '80vh',
            }}
            className="fixed z-[9999] bg-gray-900 text-white rounded-lg shadow-2xl border-2 border-blue-500 overflow-hidden flex flex-col"
        >
            <div
                className="bg-blue-600 px-4 py-2 flex items-center justify-between cursor-move"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5" />
                    <span className="font-semibold text-sm">Dev Debugger</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={refreshQueries}
                        className="p-1 hover:bg-blue-700 rounded"
                        title="Refresh all queries"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        onClick={toggleMinimized}
                        className="p-1 hover:bg-blue-700 rounded"
                        title="Minimize debugger"
                    >
                        <MinusCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                <Section
                    icon={User}
                    title="Usuario"
                    isExpanded={state.expandedSections.user}
                    onToggle={() => toggleSection('user')}
                >
                    {user ? (
                        <div className="space-y-1 text-xs font-mono">
                            <InfoRow label="ID" value={user.id} />
                            <InfoRow label="Nombre" value={user.name} />
                            <InfoRow label="Email" value={user.email} />
                            <InfoRow
                                label="Autenticado"
                                value={isAuthenticated ? 'Sí' : 'No'}
                                highlight={isAuthenticated}
                            />
                            <InfoRow
                                label="Token"
                                value={token ? token.substring(0, 20) + '...' : 'No'}
                                highlight={!!token}
                            />
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">No autenticado</p>
                    )}
                </Section>

                <Section
                    icon={Shield}
                    title="Roles y Permisos"
                    isExpanded={state.expandedSections.roles}
                    onToggle={() => toggleSection('roles')}
                    badge={user?.roles?.length}
                >
                    {user ? (
                        <div className="space-y-2 text-xs font-mono">
                            <InfoRow
                                label="isAdmin (store)"
                                value={isAdmin ? 'true' : 'false'}
                                highlight={isAdmin}
                            />
                            <div>
                                <span className="text-gray-400">Roles:</span>
                                {user.roles && user.roles.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {user.roles.map((role) => (
                                            <span
                                                key={role.id}
                                                className="inline-block bg-purple-600 text-white px-2 py-0.5 rounded text-xs"
                                            >
                                                {role.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="ml-2 text-yellow-400">Sin roles</span>
                                )}
                            </div>
                            <div>
                                <span className="text-gray-400">Permisos:</span>
                                {user.permissions && user.permissions.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {user.permissions.map((perm) => (
                                            <span
                                                key={perm.id}
                                                className="inline-block bg-teal-600 text-white px-2 py-0.5 rounded text-xs"
                                            >
                                                {perm.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="ml-2 text-gray-500">Sin permisos directos</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">No autenticado</p>
                    )}
                </Section>

                {!isAuthenticated && devLoginEnabled && (
                    <Section
                        icon={LogIn}
                        title="Dev Login"
                        isExpanded={state.expandedSections.devLogin}
                        onToggle={() => toggleSection('devLogin')}
                        badge={devUsers?.length}
                    >
                        <div className="space-y-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar usuario..."
                                    value={devLoginSearch}
                                    onChange={(e) => setDevLoginSearch(e.target.value)}
                                    className="w-full bg-gray-700 text-white text-xs rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            {isLoadingDevUsers && (
                                <div className="space-y-1">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />
                                    ))}
                                </div>
                            )}
                            {devUsers && (() => {
                                const q = devLoginSearch.toLowerCase()
                                const filtered = devUsers.filter(
                                    (u) =>
                                        u.name.toLowerCase().includes(q) ||
                                        u.email.toLowerCase().includes(q)
                                )
                                return filtered.length === 0 ? (
                                    <p className="text-xs text-gray-400">Sin resultados</p>
                                ) : (
                                    <div className="space-y-1 max-h-40 overflow-y-auto pr-0.5">
                                        {filtered.map((devUser) => (
                                            <button
                                                key={devUser.id}
                                                data-testid="dev-login-user"
                                                onClick={() => handleDevLogin(devUser)}
                                                disabled={loggingInUserId !== null}
                                                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs text-white truncate">{devUser.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{devUser.email}</p>
                                                </div>
                                                {loggingInUserId === devUser.id ? (
                                                    <Loader2 className="h-3 w-3 text-blue-400 shrink-0 animate-spin" />
                                                ) : (
                                                    <LogIn className="h-3 w-3 text-blue-400 shrink-0" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )
                            })()}
                        </div>
                    </Section>
                )}

                <Section
                    icon={RefreshCw}
                    title="Query Cache"
                    isExpanded={state.expandedSections.queries}
                    onToggle={() => toggleSection('queries')}
                >
                    <div className="space-y-1 text-xs font-mono">
                        <InfoRow label="Total" value={cacheStats.total} />
                        <InfoRow
                            label="Fresh"
                            value={cacheStats.fresh}
                            highlight={cacheStats.fresh > 0}
                        />
                        <InfoRow label="Stale" value={cacheStats.stale} />
                        <InfoRow
                            label="Fetching"
                            value={cacheStats.fetching}
                            highlight={cacheStats.fetching > 0}
                        />
                    </div>
                </Section>
            </div>

            <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
                {shortcutLabel} para ocultar o mostrar
            </div>
        </div>
    )
}

interface SectionProps {
    icon: LucideIcon
    title: string
    isExpanded: boolean
    onToggle: () => void
    badge?: number
    children: React.ReactNode
}

function Section({ icon: Icon, title, isExpanded, onToggle, badge, children }: SectionProps) {
    return (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-blue-400" />
                    <span className="font-semibold text-sm">{title}</span>
                    {badge !== undefined && badge > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                ) : (
                    <ChevronDown className="h-4 w-4" />
                )}
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    {children}
                </div>
            )}
        </div>
    )
}

interface InfoRowProps {
    label: string
    value: string | number | boolean | null | undefined
    highlight?: boolean
}

function InfoRow({ label, value, highlight }: InfoRowProps) {
    return (
        <div className="flex justify-between items-center gap-3">
            <span className="text-gray-400">{label}:</span>
            <span className={highlight ? 'text-green-400 font-semibold text-right' : 'text-white text-right'}>
                {value?.toString() || '-'}
            </span>
        </div>
    )
}
