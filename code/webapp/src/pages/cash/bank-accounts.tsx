import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Building2 } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { DataGrid, type Column } from '@/components/ui/data-grid'
import { FilterSelect } from '@/components/ui/filter-select'
import { SearchInput } from '@/components/ui/search-input'
import { BankAccountForm, formatDate } from '@/components/cash'
import { useBankAccounts, useDeleteBankAccount } from '@/services/cash-hooks'
import { apiClient } from '@/lib/api-client'
import type { BankAccount, BankAccountFilters } from '@/types/cash'

export const Route = createFileRoute('/cash/bank-accounts')({
  component: BankAccountsPage,
})

export function BankAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null)
  const [filters, setFilters] = useState<BankAccountFilters>({
    per_page: 20,
    page: 1,
  })

  const { data, isLoading } = useBankAccounts(filters)
  const deleteMutation = useDeleteBankAccount()

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

  const handleDelete = async (account: BankAccount) => {
    if (!confirm(`¿Estás seguro de eliminar la cuenta "${account.alias}"?`)) {
      return
    }

    try {
      await deleteMutation.mutateAsync(account.id)
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const columns: Column<BankAccount>[] = [
    {
      key: 'alias',
      header: 'Alias',
      render: (item) => (
        <div>
          <div className="font-medium">{item.alias}</div>
          {item.branch && (
            <div className="text-xs text-muted-foreground mt-1">
              <Building2 className="inline h-3 w-3 mr-1" />
              {item.branch.name}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'bank_name',
      header: 'Banco',
      width: '150px',
      render: (item) => (
        <span className="font-medium">{item.bank_name}</span>
      ),
    },
    {
      key: 'account_number_masked',
      header: 'Cuenta',
      width: '120px',
      align: 'center',
      render: (item) => (
        <span className="font-mono font-semibold">****{item.account_number_masked}</span>
      ),
    },
    {
      key: 'clabe_masked',
      header: 'CLABE',
      width: '120px',
      align: 'center',
      render: (item) => (
        <span className="font-mono text-sm">
          {item.clabe_masked || '-'}
        </span>
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
      width: '120px',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedAccount(item)
              setIsFormOpen(true)
            }}
            className="h-8 w-8 p-0"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item)
            }}
            className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
            title="Eliminar"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Cuentas Bancarias"
        description="Gestiona las cuentas bancarias para recibir transferencias"
      />

      <div className="mt-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
            <SearchInput
              placeholder="Buscar por alias o banco..."
              value={filters.search || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, search: value, page: 1 }))}
              className="w-full sm:w-64"
            />

            <FilterSelect
              label="Sucursal"
              value={filters.branch_id?.toString() || ''}
              onChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  branch_id: value ? parseInt(value) : undefined,
                  page: 1 
                }))
              }
              placeholder="Todas las sucursales"
              options={branches.map((b: any) => ({ value: b.id.toString(), label: b.name }))}
              className="w-full sm:w-48"
            />

            <FilterSelect
              label="Estado"
              value={filters.is_active?.toString() || ''}
              onChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  is_active: value ? value === 'true' : undefined,
                  page: 1 
                }))
              }
              placeholder="Todos los estados"
              options={[
                { value: 'true', label: 'Activas' },
                { value: 'false', label: 'Inactivas' },
              ]}
              className="w-full sm:w-40"
            />
          </div>

          <Button
            onClick={() => {
              setSelectedAccount(null)
              setIsFormOpen(true)
            }}
            className="bg-blue-600 text-white hover:bg-blue-700 w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cuenta
          </Button>
        </div>

        {/* Data Grid */}
        <DataGrid
          data={data?.data || []}
          columns={columns}
          loading={isLoading}
          emptyMessage="No se encontraron cuentas bancarias"
          pagination={data?.meta ? {
            currentPage: data.meta.current_page,
            totalPages: data.meta.last_page,
            onPageChange: (page) => setFilters(prev => ({ ...prev, page })),
          } : undefined}
        />
      </div>

      <BankAccountForm
        account={selectedAccount}
        branches={branches}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setSelectedAccount(null)
        }}
        onSuccess={() => {
          setIsFormOpen(false)
          setSelectedAccount(null)
        }}
      />
    </PageContainer>
  )
}
