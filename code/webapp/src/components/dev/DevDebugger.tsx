import { useState, useEffect, useRef } from 'react'
import { 
  Bug, 
  User, 
  Building2, 
  Shield, 
  MinusCircle, 
  PlusCircle, 
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useQueryClient } from '@tanstack/react-query'

interface DebuggerState {
  isMinimized: boolean
  position: { x: number; y: number }
  expandedSections: {
    user: boolean
    branch: boolean
    permissions: boolean
    roles: boolean
    queries: boolean
  }
}

const STORAGE_KEY = 'dev_debugger_state'

export function DevDebugger() {
  const { user, currentBranch, availableBranches, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const dragRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Load state from localStorage
  const [state, setState] = useState<DebuggerState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {
      isMinimized: false,
      position: { x: window.innerWidth - 420, y: 100 },
      expandedSections: {
        user: true,
        branch: true,
        permissions: false,
        roles: false,
        queries: false,
      }
    }
  })

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  // Dragging logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return

      setState(prev => ({
        ...prev,
        position: {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    
    const rect = dragRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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
    setState(prev => ({ ...prev, isMinimized: !prev.isMinimized }))
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

  // Minimized view
  if (state.isMinimized) {
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
          >
            <PlusCircle className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Full view
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
      {/* Header - Draggable */}
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
          >
            <MinusCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {/* User Section */}
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
                label="Admin" 
                value={isAdmin ? 'Sí' : 'No'} 
                highlight={isAdmin}
              />
              <InfoRow 
                label="Activo" 
                value={user.is_active ? 'Sí' : 'No'} 
                highlight={user.is_active}
              />
            </div>
          ) : (
            <p className="text-xs text-gray-400">No autenticado</p>
          )}
        </Section>

        {/* Branch Section */}
        <Section
          icon={Building2}
          title="Sucursal"
          isExpanded={state.expandedSections.branch}
          onToggle={() => toggleSection('branch')}
        >
          {currentBranch ? (
            <div className="space-y-2">
              <div className="space-y-1 text-xs font-mono">
                <InfoRow label="ID" value={currentBranch.id} />
                <InfoRow label="Nombre" value={currentBranch.name} />
                <InfoRow label="Código" value={currentBranch.code} />
                {currentBranch.region && (
                  <InfoRow label="Región" value={currentBranch.region} />
                )}
              </div>
              {availableBranches.length > 1 && (
                <div className="pt-2 border-t border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">
                    Disponibles: {availableBranches.length}
                  </p>
                  <div className="space-y-1">
                    {availableBranches.map(b => (
                      <div 
                        key={b.id} 
                        className={`text-xs px-2 py-1 rounded ${
                          b.id === currentBranch.id 
                            ? 'bg-blue-900 text-blue-200' 
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {b.name} ({b.code})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin sucursal seleccionada</p>
          )}
        </Section>

        {/* Roles Section */}
        <Section
          icon={Shield}
          title="Roles"
          isExpanded={state.expandedSections.roles}
          onToggle={() => toggleSection('roles')}
          badge={user?.roles?.length}
        >
          {user?.roles && user.roles.length > 0 ? (
            <div className="space-y-1">
              {user.roles.map(role => (
                <div 
                  key={role.id} 
                  className="text-xs bg-gray-800 px-2 py-1 rounded font-mono"
                >
                  <span className="text-blue-400">{role.name}</span>
                  {role.display_name && (
                    <span className="text-gray-400 ml-2">({role.display_name})</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Sin roles asignados</p>
          )}
        </Section>

        {/* Permissions Section */}
        <Section
          icon={Shield}
          title="Permisos"
          isExpanded={state.expandedSections.permissions}
          onToggle={() => toggleSection('permissions')}
          badge={user?.permissions?.length}
        >
          {user?.permissions && user.permissions.length > 0 ? (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {user.permissions.map(perm => (
                <div 
                  key={perm.id} 
                  className="text-xs bg-gray-800 px-2 py-1 rounded font-mono"
                >
                  {perm.name}
                </div>
              ))}
            </div>
          ) : isAdmin ? (
            <p className="text-xs text-green-400">Admin: Todos los permisos</p>
          ) : (
            <p className="text-xs text-gray-400">Sin permisos directos</p>
          )}
        </Section>

        {/* Query Cache Section */}
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

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-2 text-xs text-gray-400 border-t border-gray-700">
        Solo visible en desarrollo
      </div>
    </div>
  )
}

// Helper Components
interface SectionProps {
  icon: any
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
  value: any
  highlight?: boolean
}

function InfoRow({ label, value, highlight }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}:</span>
      <span className={highlight ? 'text-green-400 font-semibold' : 'text-white'}>
        {value?.toString() || '-'}
      </span>
    </div>
  )
}
