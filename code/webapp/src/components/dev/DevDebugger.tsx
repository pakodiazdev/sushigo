import { useState } from 'react'
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
    GitBranch,
    Zap,
    Clock,
    ExternalLink,
    type LucideIcon,
} from 'lucide-react'
import { useRouterState } from '@tanstack/react-router'
import { gitBranch } from 'virtual:git-branch'
import { useDevDebugger, sectionElementId, type DevUser } from './use-dev-debugger'
import { PayrollCloseActions } from './page-actions/payroll-close-actions'
import { ClockDebugPanel } from '@/components/devtools/ClockDebugPanel'
import type { User as AuthUser } from '@/types/auth'

const PAGE_ACTIONS: Record<string, { title: string; component: React.ReactNode }> = {
    '/attendance/payroll/close': {
        title: 'Cierre de Nómina',
        component: <PayrollCloseActions />,
    },
}

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
        swaggerDocsUrl,
        handleMouseDown,
        toggleSection,
        toggleMinimized,
        jumpToSection,
        refreshQueries,
        handleDevLogin,
    } = useDevDebugger()

    const currentPath = useRouterState({ select: (s) => s.location.pathname })
    const pageAction = PAGE_ACTIONS[currentPath] ?? null

    const sectionItems: { key: keyof typeof state.expandedSections; title: string; icon: LucideIcon }[] = [
        { key: 'user', title: 'Usuario', icon: User },
        ...(pageAction ? [{ key: 'pageActions' as const, title: `Acciones — ${pageAction.title}`, icon: Zap }] : []),
        { key: 'roles', title: 'Roles y Permisos', icon: Shield },
        ...(devLoginSectionVisible ? [{ key: 'devLogin' as const, title: 'Dev Login', icon: LogIn }] : []),
        { key: 'clock', title: 'Reloj (Simulación)', icon: Clock },
        { key: 'queries', title: 'Query Cache', icon: RefreshCw },
    ]

    /** Renders the Swagger link + one icon button per section, so every quick-link is directly visible (no dropdown). */
    function renderQuickLinks(hoverBgClass: string) {
        return (
            <>
                <a
                    href={swaggerDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-1 ${hoverBgClass} rounded shrink-0`}
                    title="Abrir documentación Swagger"
                    aria-label="Abrir documentación Swagger"
                >
                    <ExternalLink className="h-4 w-4" />
                </a>
                {sectionItems.map((item) => (
                    <button
                        type="button"
                        key={item.key}
                        onClick={() => jumpToSection(item.key)}
                        className={`p-1 ${hoverBgClass} rounded shrink-0`}
                        title={item.title}
                        aria-label={`Ir a ${item.title}`}
                    >
                        <item.icon className="h-4 w-4" />
                    </button>
                ))}
            </>
        )
    }

    if (isHidden) {
        return null
    }

    if (isMinimized) {
        return (
            <MinimizedDebugger
                isMobile={isMobile}
                dragRef={dragRef}
                position={state.position}
                handleMouseDown={handleMouseDown}
                toggleMinimized={toggleMinimized}
                renderQuickLinks={renderQuickLinks}
            />
        )
    }

    return (
        <div
            ref={isMobile ? undefined : dragRef}
            style={
                isMobile
                    ? { maxHeight: '70vh' }
                    : { left: state.position.x, top: state.position.y, width: '380px', maxHeight: '80vh' }
            }
            className={
                isMobile
                    ? 'fixed inset-x-0 bottom-0 z-[9999] bg-gray-900 text-white shadow-2xl border-t-2 border-blue-500 overflow-hidden flex flex-col'
                    : 'fixed z-[9999] bg-gray-900 text-white rounded-lg shadow-2xl border-2 border-blue-500 overflow-hidden flex flex-col'
            }
            data-testid="dev-debugger"
        >
            <div
                className={`bg-blue-600 px-4 py-2 flex items-center justify-between ${isMobile ? '' : 'cursor-move'}`}
                onMouseDown={isMobile ? undefined : handleMouseDown}
            >
                <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5" />
                    <span className="font-semibold text-sm">Dev Debugger</span>
                </div>
                <div className="flex items-center gap-1 min-w-0">
                    {isMobile && (
                        <div className="flex items-center gap-1 overflow-x-auto">{renderQuickLinks('hover:bg-blue-700')}</div>
                    )}
                    <button
                        type="button"
                        onClick={refreshQueries}
                        className="p-1 hover:bg-blue-700 rounded shrink-0"
                        title="Refresh all queries"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={toggleMinimized}
                        className="p-1 hover:bg-blue-700 rounded shrink-0"
                        title="Minimize debugger"
                        aria-label="Minimize debugger"
                    >
                        <MinusCircle className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {gitBranch && (
                <div className="bg-gray-950 px-4 py-1.5 flex items-center gap-2 text-xs font-mono border-b border-gray-700">
                    <GitBranch className="h-3 w-3 text-yellow-400 shrink-0" />
                    <span className="text-yellow-300 truncate">{gitBranch}</span>
                    {import.meta.env.VITE_AGENT_LABEL?.trim() && (
                        <span className="ml-auto text-gray-500 shrink-0">{import.meta.env.VITE_AGENT_LABEL.trim()}</span>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                <Section
                    id={sectionElementId('user')}
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

                {pageAction && (
                    <Section
                        id={sectionElementId('pageActions')}
                        icon={Zap}
                        title={`Acciones — ${pageAction.title}`}
                        isExpanded={state.expandedSections.pageActions}
                        onToggle={() => toggleSection('pageActions')}
                    >
                        {pageAction.component}
                    </Section>
                )}

                <Section
                    id={sectionElementId('roles')}
                    icon={Shield}
                    title="Roles y Permisos"
                    isExpanded={state.expandedSections.roles}
                    onToggle={() => toggleSection('roles')}
                    badge={user?.roles?.length}
                >
                    <RolesPermissionsSection user={user} isAdmin={isAdmin} />
                </Section>

                {devLoginSectionVisible && (
                    <Section
                        id={sectionElementId('devLogin')}
                        icon={LogIn}
                        title="Dev Login"
                        isExpanded={state.expandedSections.devLogin}
                        onToggle={() => toggleSection('devLogin')}
                        badge={devUsers?.length}
                    >
                        <DevLoginSection
                            devLoginSearch={devLoginSearch}
                            setDevLoginSearch={setDevLoginSearch}
                            devLoginAllRoles={devLoginAllRoles}
                            devLoginRoleFilter={devLoginRoleFilter}
                            setDevLoginRoleFilter={setDevLoginRoleFilter}
                            devLoginPermissionSearch={devLoginPermissionSearch}
                            setDevLoginPermissionSearch={setDevLoginPermissionSearch}
                            devLoginPermissionFilter={devLoginPermissionFilter}
                            setDevLoginPermissionFilter={setDevLoginPermissionFilter}
                            devLoginPermissionSuggestions={devLoginPermissionSuggestions}
                            devLoginAllPermissions={devLoginAllPermissions}
                            devLoginFilteredUsers={devLoginFilteredUsers}
                            devUsers={devUsers}
                            isLoadingDevUsers={isLoadingDevUsers}
                            loggingInUserId={loggingInUserId}
                            onLogin={handleDevLogin}
                        />
                    </Section>
                )}

                <Section
                    id={sectionElementId('clock')}
                    icon={Clock}
                    title="Reloj (Simulación)"
                    isExpanded={state.expandedSections.clock}
                    onToggle={() => toggleSection('clock')}
                >
                    <ClockDebugPanel />
                </Section>

                <Section
                    id={sectionElementId('queries')}
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

            {!isMobile && (
                <>
                    <div className="bg-gray-800 px-4 py-2 flex items-center justify-start gap-1 overflow-x-auto border-t border-gray-700">
                        {renderQuickLinks('hover:bg-gray-700')}
                    </div>
                    <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
                        {shortcutLabel} para ocultar o mostrar
                    </div>
                </>
            )}
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
    readonly id?: string
    readonly icon: LucideIcon
    readonly title: string
    readonly isExpanded: boolean
    readonly onToggle: () => void
    readonly badge?: number
    readonly children: React.ReactNode
}

function Section({ id, icon: Icon, title, isExpanded, onToggle, badge, children }: Readonly<SectionProps>) {
    return (
        <div id={id} className="bg-gray-800 rounded-lg overflow-hidden">
            <button
                type="button"
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

function InfoRow({ label, value, highlight }: Readonly<InfoRowProps>) {
    return (
        <div className="flex justify-between items-center gap-3">
            <span className="text-gray-400">{label}:</span>
            <span className={highlight ? 'text-green-400 font-semibold text-right' : 'text-white text-right'}>
                {value?.toString() || '-'}
            </span>
        </div>
    )
}

interface MinimizedDebuggerProps {
    readonly isMobile: boolean
    readonly dragRef: React.RefObject<HTMLDivElement | null>
    readonly position: { x: number; y: number }
    readonly handleMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void
    readonly toggleMinimized: () => void
    readonly renderQuickLinks: (hoverBgClass: string) => React.ReactNode
}

function MinimizedDebugger({ isMobile, dragRef, position, handleMouseDown, toggleMinimized, renderQuickLinks }: Readonly<MinimizedDebuggerProps>) {
    if (isMobile) {
        return (
            <div
                className="fixed inset-x-0 bottom-0 z-[9999] bg-gray-900 text-white border-t-2 border-blue-500 shadow-2xl px-3 py-2 flex items-center justify-between"
                data-testid="dev-debugger"
            >
                <button
                    type="button"
                    onClick={toggleMinimized}
                    className="flex items-center gap-2"
                    title="Expandir debugger"
                >
                    <Bug className="h-5 w-5 text-blue-400" />
                    <span className="text-sm font-mono">Debugger</span>
                </button>
                <div className="flex items-center gap-1 min-w-0">
                    <div className="flex items-center gap-1 overflow-x-auto">{renderQuickLinks('hover:bg-gray-800')}</div>
                    <button
                        type="button"
                        onClick={toggleMinimized}
                        className="p-1 hover:bg-gray-800 rounded shrink-0"
                        title="Expandir debugger"
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
            style={{ left: position.x, top: position.y }}
            className="fixed z-[9999] cursor-move"
            data-testid="dev-debugger"
            onMouseDown={handleMouseDown}
        >
            <div className="bg-gray-900 text-white rounded-lg shadow-2xl p-3 flex items-center gap-2 border-2 border-blue-500">
                <Bug className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-mono">Debugger</span>
                <button
                    type="button"
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

interface RolesPermissionsSectionProps {
    readonly user: AuthUser | null | undefined
    readonly isAdmin: boolean
}

function RolesPermissionsSection({ user, isAdmin }: Readonly<RolesPermissionsSectionProps>) {
    if (!user) {
        return <p className="text-xs text-gray-400">No autenticado</p>
    }

    return (
        <div className="space-y-2 text-xs font-mono">
            <InfoRow label="isAdmin (store)" value={isAdmin ? 'true' : 'false'} highlight={isAdmin} />
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
    )
}

interface DevLoginSectionProps {
    readonly devLoginSearch: string
    readonly setDevLoginSearch: (value: string) => void
    readonly devLoginAllRoles: string[]
    readonly devLoginRoleFilter: string | null
    readonly setDevLoginRoleFilter: (value: string | null) => void
    readonly devLoginPermissionSearch: string
    readonly setDevLoginPermissionSearch: (value: string) => void
    readonly devLoginPermissionFilter: string | null
    readonly setDevLoginPermissionFilter: (value: string | null) => void
    readonly devLoginPermissionSuggestions: string[]
    readonly devLoginAllPermissions: string[]
    readonly devLoginFilteredUsers: DevUser[]
    readonly devUsers: DevUser[] | null | undefined
    readonly isLoadingDevUsers: boolean
    readonly loggingInUserId: number | null
    readonly onLogin: (devUser: DevUser) => void
}

function DevLoginSection({
    devLoginSearch,
    setDevLoginSearch,
    devLoginAllRoles,
    devLoginRoleFilter,
    setDevLoginRoleFilter,
    devLoginPermissionSearch,
    setDevLoginPermissionSearch,
    devLoginPermissionFilter,
    setDevLoginPermissionFilter,
    devLoginPermissionSuggestions,
    devLoginAllPermissions,
    devLoginFilteredUsers,
    devUsers,
    isLoadingDevUsers,
    loggingInUserId,
    onLogin,
}: Readonly<DevLoginSectionProps>) {
    const [permissionInputFocused, setPermissionInputFocused] = useState(false)

    let permissionDropdownItems: string[] = []
    if (devLoginPermissionSearch.length > 0) {
        permissionDropdownItems = devLoginPermissionSuggestions
    } else if (permissionInputFocused) {
        permissionDropdownItems = devLoginAllPermissions
    }

    return (
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
                                type="button"
                                key={role}
                                onClick={() =>
                                    setDevLoginRoleFilter(devLoginRoleFilter === role ? null : role)
                                }
                                className={`text-[10px] px-1.5 py-0.5 rounded border transition-opacity ${getRoleColor(role, devLoginAllRoles)} ${devLoginRoleFilter && devLoginRoleFilter !== role ? 'opacity-40' : 'opacity-100'}`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="space-y-1">
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Permiso</p>
                {devLoginPermissionFilter ? (
                    <div className="flex items-center gap-1">
                        <span className="flex-1 text-[10px] px-1.5 py-0.5 rounded border bg-teal-500/20 text-teal-300 border-teal-500/40 truncate">
                            {devLoginPermissionFilter}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setDevLoginPermissionFilter(null)
                                setDevLoginPermissionSearch('')
                            }}
                            className="text-gray-400 hover:text-white text-[11px] px-1 leading-none"
                            aria-label="Quitar filtro de permiso"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar permiso..."
                            value={devLoginPermissionSearch}
                            onChange={(e) => setDevLoginPermissionSearch(e.target.value)}
                            onFocus={() => setPermissionInputFocused(true)}
                            onBlur={() => setPermissionInputFocused(false)}
                            className="w-full bg-gray-700 text-white text-xs rounded pl-7 pr-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        {permissionDropdownItems.length > 0 && (
                            <ul className="absolute z-10 mt-0.5 w-full max-h-36 overflow-y-auto bg-gray-800 border border-gray-600 rounded shadow-lg">
                                {permissionDropdownItems.map((perm) => (
                                    <li key={perm}>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setDevLoginPermissionFilter(perm)
                                                setDevLoginPermissionSearch('')
                                                setPermissionInputFocused(false)
                                            }}
                                            className="w-full text-left text-[10px] px-2 py-1 text-gray-200 hover:bg-teal-600/30 hover:text-teal-200 truncate"
                                        >
                                            {perm}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
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
                                type="button"
                                key={devUser.id}
                                data-testid="dev-login-user"
                                onClick={() => onLogin(devUser)}
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
    )
}
