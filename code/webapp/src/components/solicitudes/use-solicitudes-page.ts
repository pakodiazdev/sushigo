import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { usePendingRequestsCount } from '@/services/employee-request-hooks'
import type { TabId } from './SolicitudesLayout'

export function useSolicitudesPage() {
  const { isAdmin } = useAuthStore()
  const [activeTab, setActiveTab] = useState<TabId>('mine')

  const { data: pendingCount = 0 } = usePendingRequestsCount()

  return {
    isManager: isAdmin,
    activeTab,
    pendingCount,
    onTabChange: setActiveTab,
  }
}
