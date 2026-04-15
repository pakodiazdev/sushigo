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
    type LucideIcon,
} from 'lucide-react'
import { useDevDebugger } from './use-dev-debugger'

export function DevDebugger() {
    const {
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
    } = useDevDebugger()

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

                {devLoginSectionVisible && (
                    <Section
                        icon={LogIn}
                        title="Dev Login"
                        isExpanded={state.expandedSections.devLogin}
                        onToggle={() => toggleSection('devLogin')}
                        badge={devUsers?.length}
                    >
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Usuario</p>
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
                            </div>
                            {devLoginAllRoles.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Rol</p>
                                    <div className="flex flex-wrap gap-1">
                                        {devLoginAllRoles.map((role) => (
                                            <button
                                                key={role}
                                                onClick={() =>
                                                    setDevLoginRoleFilter(
                                                        devLoginRoleFilter === role ? null : role,
                                                    )
                                                }
                                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-opacity ${getRoleColor(role, devLoginAllRoles)} ${devLoginRoleFilter && devLoginRoleFilter !== role ? 'opacity-40' : 'opacity-100'}`}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {isLoadingDevUsers && (
                                <div className="space-y-1">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-8 bg-gray-700 rounded animate-pulse" />
                                    ))}
                                </div>
                            )}
                            {devUsers && (
                                devLoginFilteredUsers.length === 0 ? (
                                    <p className="text-xs text-gray-400">Sin resultados</p>
                                ) : (
                                    <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                                        {devLoginFilteredUsers.map((devUser) => (
                                            <button
                                                key={devUser.id}
                                                data-testid="dev-login-user"
                                                onClick={() => handleDevLogin(devUser)}
                                                disabled={loggingInUserId !== null}
                                                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
                                            >
                                                <div className="min-w-0 space-y-0.5">
                                                    <p className="text-xs text-white truncate">{devUser.name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{devUser.email}</p>
                                                    {devUser.roles.length > 0 && (
                                                        <div className="flex flex-wrap gap-0.5">
                                                            {devUser.roles.map((role) => (
                                                                <span
                                                                    key={role}
                                                                    className={`text-[9px] px-1 py-0 rounded border ${getRoleColor(role, devLoginAllRoles)}`}
                                                                >
                                                                    {role}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
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
                            )}
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

const ROLE_COLORS: Record<string, string> = {
    'super-admin': 'bg-red-500/20 text-red-300 border-red-500/40',
    admin: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    'inventory-manager': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    cashier: 'bg-green-500/20 text-green-300 border-green-500/40',
    manager: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    staff: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
}

const ROLE_FALLBACK_COLORS = [
    'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    'bg-pink-500/20 text-pink-300 border-pink-500/40',
    'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
]

function getRoleColor(role: string, allRoles: string[]): string {
    const known = ROLE_COLORS[role]
    if (known) return known
    const index = allRoles.indexOf(role) % ROLE_FALLBACK_COLORS.length
    return ROLE_FALLBACK_COLORS[index] ?? ROLE_FALLBACK_COLORS[0] ?? 'bg-gray-500/20 text-gray-300 border-gray-500/40'
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
