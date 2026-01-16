import { Plus, Edit } from 'lucide-react'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { Button } from '@/components/ui/button'
import {
    CashRegisterTypeBadge,
    formatDate
} from './cash-utils'
import { useCashRegisters } from '@/services/cash-hooks'
import type { CashRegister } from '@/types/cash'

interface CashRegisterListProps {
    onEdit: (register: CashRegister) => void
    onCreate: () => void
}

export function CashRegisterList({ onEdit, onCreate }: CashRegisterListProps) {
    const { data, isLoading } = useCashRegisters({ per_page: 20, page: 1 })

    const columns: Column<CashRegister>[] = [
        {
            key: 'code',
            header: 'Código',
            width: '120px',
            render: (item) => (
                <span className="font-mono font-semibold">{item.code}</span>
            ),
        },
        {
            key: 'name',
            header: 'Nombre',
            render: (item) => (
                <div className="font-medium">{item.name}</div>
            ),
        },
        {
            key: 'type',
            header: 'Tipo',
            width: '120px',
            align: 'center',
            render: (item) => <CashRegisterTypeBadge type={item.type} />,
        },
        {
            key: 'operating_unit',
            header: 'Unidad Operativa',
            width: '180px',
            render: (item) => (
                <span className="text-sm">
                    {item.operating_unit?.name || '-'}
                </span>
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
                        onEdit(item)
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
        <div className="space-y-4">
            {/* Header with create button */}
            <div className="flex justify-end">
                <Button
                    onClick={onCreate}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Caja
                </Button>
            </div>

            {/* Data Grid */}
            <DataGrid
                data={data?.data || []}
                columns={columns}
                loading={isLoading}
                emptyMessage="No se encontraron cajas registradoras"
                pagination={data?.meta ? {
                    currentPage: data.meta.current_page,
                    totalPages: data.meta.last_page,
                    onPageChange: () => { /* Pagination disabled for now */ },
                } : undefined}
            />
        </div>
    )
}
