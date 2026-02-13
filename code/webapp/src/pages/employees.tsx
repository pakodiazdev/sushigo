import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Edit, Search } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { Select } from '@/components/ui/form-fields'
import { EmployeeForm } from '@/components/employees'
import { useEmployees } from '@/services/employee-hooks'
import { EMPLOYEE_POSITION_ROLES } from '@/types/employee'
import type { Employee, EmployeeFilters, EmployeePositionRole } from '@/types/employee'

export const Route = createFileRoute('/employees')({
    component: EmployeesPage,
})

const ROLE_COLORS: Record<string, string> = {
    'employee-manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'employee-cook': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'employee-kitchen-assistant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'employee-delivery-driver': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    'employee-acting-manager': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function EmployeesPage() {
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
    const [filters, setFilters] = useState<EmployeeFilters>({
        per_page: 20,
        page: 1,
    })

    const { data, isLoading } = useEmployees(filters)

    const handleFilterChange = (key: keyof EmployeeFilters, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value === '' ? undefined : value,
            page: 1,
        }))
    }

    const columns: Column<Employee>[] = [
        {
            key: 'code',
            header: 'Codigo',
            width: '120px',
            render: (item) => (
                <span className="font-mono font-semibold">{item.code}</span>
            ),
        },
        {
            key: 'name',
            header: 'Nombre',
            render: (item) => (
                <div className="font-medium">
                    {item.first_name} {item.last_name}
                </div>
            ),
        },
        {
            key: 'roles',
            header: 'Puestos',
            width: '220px',
            render: (item) => (
                <div className="flex flex-wrap gap-1">
                    {(item.roles || []).map(role => (
                        <span key={role} className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'
                        }`}>
                            {EMPLOYEE_POSITION_ROLES[role as EmployeePositionRole] || role}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            key: 'is_active',
            header: 'Estado',
            width: '100px',
            align: 'center',
            render: (item) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    item.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                    {item.is_active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: 'Fecha Creacion',
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
                        setSelectedEmployee(item)
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
                title="Empleados"
                description="Gestiona los empleados de tu negocio"
            />

            <div className="mt-6 space-y-4">
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={filters.search || ''}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-md text-sm"
                            placeholder="Buscar por nombre o codigo..."
                        />
                    </div>

                    {/* Role filter */}
                    <Select
                        value={filters.role || ''}
                        onChange={(e) => handleFilterChange('role', e.target.value)}
                        className="w-48"
                    >
                        <option value="">Todos los puestos</option>
                        {Object.entries(EMPLOYEE_POSITION_ROLES).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </Select>

                    {/* Active filter */}
                    <Select
                        value={filters.is_active === undefined ? '' : String(filters.is_active)}
                        onChange={(e) => {
                            const val = e.target.value
                            handleFilterChange('is_active', val === '' ? undefined : val === 'true')
                        }}
                        className="w-36"
                    >
                        <option value="">Todos</option>
                        <option value="true">Activos</option>
                        <option value="false">Inactivos</option>
                    </Select>

                    {/* Spacer + Create button */}
                    <div className="flex-1" />
                    <Button
                        onClick={() => {
                            setSelectedEmployee(null)
                            setIsFormOpen(true)
                        }}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Empleado
                    </Button>
                </div>

                {/* Data Grid */}
                <DataGrid
                    data={data?.data || []}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage="No se encontraron empleados"
                    pagination={data?.meta ? {
                        currentPage: data.meta.current_page,
                        totalPages: data.meta.last_page,
                        onPageChange: (page) => setFilters(prev => ({ ...prev, page })),
                    } : undefined}
                />
            </div>

            <EmployeeForm
                employee={selectedEmployee}
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false)
                    setSelectedEmployee(null)
                }}
                onSuccess={() => {
                    setIsFormOpen(false)
                    setSelectedEmployee(null)
                }}
            />
        </PageContainer>
    )
}
