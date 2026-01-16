import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Edit } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { CashTerminalForm, formatDate } from '@/components/cash'
import { useCashTerminals } from '@/services/cash-hooks'
import { apiClient } from '@/lib/api-client'
import type { CashTerminal } from '@/types/cash'

export const Route = createFileRoute('/cash/terminals')({
    component: CashTerminalsPage,
})

export function CashTerminalsPage() {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedTerminal, setSelectedTerminal] = useState<CashTerminal | null>(null)

    const { data, isLoading } = useCashTerminals({ per_page: 20, page: 1 })

    // Fetch operating units to extract branches
    const { data: operatingUnitsData } = useQuery({
        queryKey: ['operating-units-for-branches'],
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

    const columns: Column<CashTerminal>[] = [
        {
            key: 'name',
            header: 'Nombre',
            render: (item) => (
                <div>
                    <div className="font-medium">{item.name}</div>
                    {item.branch && (
                        <div className="text-xs text-muted-foreground mt-1">
                            {item.branch.name}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'provider',
            header: 'Proveedor',
            width: '120px',
            render: (item) => (
                <span className="font-medium">{item.provider}</span>
            ),
        },
        {
            key: 'account_ref',
            header: 'Ref. Cuenta',
            width: '150px',
            render: (item) => (
                <span className="font-mono text-sm">{item.account_ref}</span>
            ),
        },
        {
            key: 'last_four',
            header: 'Últimos 4',
            width: '100px',
            align: 'center',
            render: (item) => (
                <span className="font-mono font-semibold">****{item.last_four}</span>
            ),
        },
        {
            key: 'is_active',
            header: 'Estado',
            width: '100px',
            align: 'center',
            render: (item) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                    {item.is_active ? 'Activa' : 'Inactiva'}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: 'Fecha Creación',
            width: '150px',
            render: (item) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(item.created_at)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Acciones',
            width: '80px',
            align: 'center',
            render: (item) => (
                <Button
                    size="sm"
                    onClick={(e) => {
                        e.stopPropagation()
                        setSelectedTerminal(item)
                        setIsFormOpen(true)
                    }}
                    className="h-8 w-8 p-0"
                    title="Editar"
                >
                    <Edit className="h-4 w-4" />
                </Button>
            ),
        },
    ]

    return (
        <PageContainer>
            <PageHeader
                title="Terminales de Pago"
                description="Gestiona las terminales bancarias para pagos con tarjeta"
            />

            <div className="mt-6 space-y-4">
                {/* Header with create button */}
                <div className="flex justify-end">
                    <Button
                        onClick={() => {
                            setSelectedTerminal(null)
                            setIsFormOpen(true)
                        }}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Terminal
                    </Button>
                </div>

                {/* Data Grid */}
                <DataGrid
                    data={data?.data || []}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage="No se encontraron terminales"
                    pagination={data?.meta ? {
                        currentPage: data.meta.current_page,
                        totalPages: data.meta.last_page,
                        onPageChange: () => { /* Pagination disabled for now */ },
                    } : undefined}
                />
            </div>

            <CashTerminalForm
                terminal={selectedTerminal}
                branches={branches}
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false)
                    setSelectedTerminal(null)
                }}
                onSuccess={() => {
                    setIsFormOpen(false)
                    setSelectedTerminal(null)
                }}
            />
        </PageContainer>
    )
}
