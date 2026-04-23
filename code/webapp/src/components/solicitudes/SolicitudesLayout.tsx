import { cn } from '@/lib/utils'

type TabId = 'mine' | 'pending'

interface SolicitudesLayoutProps {
  isManager: boolean
  activeTab: TabId
  pendingCount: number
  onTabChange: (tab: TabId) => void
  children: React.ReactNode
}

export type { TabId }

export function SolicitudesLayout({
  isManager,
  activeTab,
  pendingCount,
  onTabChange,
  children,
}: SolicitudesLayoutProps) {
  if (!isManager) {
    return <div className="mt-6">{children}</div>
  }

  return (
    <div className="mt-6">
      <div className="flex border-b mb-6">
        <TabButton
          active={activeTab === 'mine'}
          onClick={() => onTabChange('mine')}
        >
          Mis solicitudes
        </TabButton>
        <TabButton
          active={activeTab === 'pending'}
          onClick={() => onTabChange('pending')}
        >
          Pendientes de aprobación
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-xs font-medium bg-destructive text-destructive-foreground">
              {pendingCount}
            </span>
          )}
        </TabButton>
      </div>
      {children}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}
