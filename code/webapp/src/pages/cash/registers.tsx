import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { CashRegisterList, CashRegisterForm } from '@/components/cash'
import { apiClient } from '@/lib/api-client'
import type { CashRegister } from '@/types/cash'

export const Route = createFileRoute('/cash/registers')({
    component: CashRegistersPage,
})

export function CashRegistersPage() {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedRegister, setSelectedRegister] = useState<CashRegister | null>(null)

    // Fetch operating units to extract branches and get all units
    const { data: operatingUnitsData } = useQuery({
        queryKey: ['operating-units-all'],
        queryFn: async () => {
            const response = await apiClient.get('/operating-units', {
                params: { per_page: 100, is_active: true }
            })
            return response.data
        },
    })

    // Extract unique branches from operating units
    const branches = React.useMemo(() => {
        if (!operatingUnitsData?.data) return []
        const branchesMap = new Map()
        operatingUnitsData.data.forEach((ou: any) => {
            if (ou.branch && !branchesMap.has(ou.branch.id)) {
                branchesMap.set(ou.branch.id, ou.branch)
            }
        })
        return Array.from(branchesMap.values())
    }, [operatingUnitsData])

    const operatingUnits = operatingUnitsData?.data || []

    const handleCreate = () => {
        setSelectedRegister(null)
        setIsFormOpen(true)
    }

    const handleEdit = (register: CashRegister) => {
        setSelectedRegister(register)
        setIsFormOpen(true)
    }

    const handleView = (register: CashRegister) => {
        // TODO: Navigate to register details page
        console.log('View register:', register)
    }

    const handleFormClose = () => {
        setIsFormOpen(false)
        setSelectedRegister(null)
    }

    const handleFormSuccess = () => {
        setIsFormOpen(false)
        setSelectedRegister(null)
    }

    return (
        <PageContainer>
            <PageHeader
                title="Cajas Registradoras"
                description="Gestiona las cajas registradoras de tu negocio"
            />

            <div className="mt-6">
                <CashRegisterList
                    onEdit={handleEdit}
                    onView={handleView}
                    onCreate={handleCreate}
                />
            </div>

            <CashRegisterForm
                register={selectedRegister}
                branches={branches}
                operatingUnits={operatingUnits}
                isOpen={isFormOpen}
                onClose={handleFormClose}
                onSuccess={handleFormSuccess}
            />
        </PageContainer>
    )
}
