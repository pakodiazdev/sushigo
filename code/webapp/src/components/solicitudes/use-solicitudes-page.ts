import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { usePendingRequestsCount } from '@/services/employee-request-hooks'
import type { TabId } from './SolicitudesLayout'

export function useSolicitudesPage() {
  const { can } = useAuthStore()
  const canApprove = can('employee-requests.approve')
  const [activeTab, setActiveTab] = useState<TabId>('mine')

  const { data: pendingCount = 0 } = usePendingRequestsCount({ enabled: canApprove })

  return {
    isManager: canApprove,
    activeTab,
    pendingCount,
    onTabChange: setActiveTab,
  }
}
