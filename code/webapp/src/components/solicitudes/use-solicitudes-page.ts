import { useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'
import { usePendingRequestsCount } from '@/services/employee-request-hooks'
import { useMyEmployee } from '@/services/employee-hooks'
import type { TabId } from './SolicitudesLayout'

export function useSolicitudesPage() {
  const { can } = useAuthStore()
  const canApprove = can('employee-requests.approve')
  const [activeTab, setActiveTab] = useState<TabId>('mine')
  const [showExtraDayForm, setShowExtraDayForm] = useState(false)

  const { data: pendingCount = 0 } = usePendingRequestsCount({ enabled: canApprove })
  const { data: myEmployee, isLoading: isLoadingEmployee } = useMyEmployee()

  return {
    isManager: canApprove,
    activeTab,
    pendingCount,
    onTabChange: setActiveTab,
    showExtraDayForm,
    openExtraDayForm: () => setShowExtraDayForm(true),
    closeExtraDayForm: () => setShowExtraDayForm(false),
    myEmployeeId: myEmployee?.id,
    isLoadingEmployee,
  }
}
