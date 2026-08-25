import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { useAuthStore } from '@/stores/auth.store'
import { supplierApi, supplierOfferingApi } from '../api/supplier-api'
import type { Supplier, SupplierOffering } from '../types'

export function useSuppliersPage() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()
  const canManage = useAuthStore((state) => state.can('suppliers.manage'))
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [supplierFormOpen, setSupplierFormOpen] = useState(false)
  const [offeringFormOpen, setOfferingFormOpen] = useState(false)
  const [selectedOffering, setSelectedOffering] = useState<SupplierOffering | null>(null)

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', search, status],
    queryFn: () => supplierApi.list({
      search: search || undefined,
      is_active: status ? status === 'active' : undefined,
    }),
  })
  const offeringsQuery = useQuery({
    queryKey: ['supplier-offerings', selectedSupplier?.id],
    queryFn: () => supplierOfferingApi.list(selectedSupplier!.id),
    enabled: Boolean(selectedSupplier),
  })
  const deactivateSupplier = useMutation({
    mutationFn: (supplier: Supplier) => supplierApi.update(supplier.id, { is_active: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      showSuccess('El proveedor fue desactivado; sus referencias históricas se conservaron.', 'Proveedor desactivado')
      setSelectedSupplier((current) => current ? { ...current, is_active: false } : current)
    },
    onError: () => showError('No fue posible desactivar el proveedor.', 'Error'),
  })

  const openNewSupplier = () => {
    setSelectedSupplier(null)
    setSupplierFormOpen(true)
  }
  const openSupplier = (supplier: Supplier) => setSelectedSupplier(supplier)
  const closeSupplier = () => setSelectedSupplier(null)
  const openSupplierEdit = () => setSupplierFormOpen(true)
  const closeSupplierForm = () => setSupplierFormOpen(false)
  const openNewOffering = () => {
    setSelectedOffering(null)
    setOfferingFormOpen(true)
  }
  const openOffering = (offering: SupplierOffering) => {
    if (!canManage) return

    setSelectedOffering(offering)
    setOfferingFormOpen(true)
  }
  const closeOfferingForm = () => setOfferingFormOpen(false)
  const deactivateSelectedSupplier = () => {
    if (selectedSupplier) deactivateSupplier.mutate(selectedSupplier)
  }
  const refreshSupplier = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    setSupplierFormOpen(false)
    setSelectedSupplier(null)
  }
  const refreshOfferings = () => {
    queryClient.invalidateQueries({ queryKey: ['supplier-offerings', selectedSupplier?.id] })
    queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    setOfferingFormOpen(false)
    setSelectedOffering(null)
  }

  return {
    canManage,
    search,
    setSearch,
    status,
    setStatus,
    selectedSupplier,
    selectedOffering,
    supplierFormOpen,
    offeringFormOpen,
    suppliers: suppliersQuery.data?.data.data ?? [],
    suppliersLoading: suppliersQuery.isLoading,
    offerings: offeringsQuery.data?.data.data ?? [],
    offeringsLoading: offeringsQuery.isLoading,
    openNewSupplier,
    openSupplier,
    closeSupplier,
    openSupplierEdit,
    closeSupplierForm,
    openNewOffering,
    openOffering,
    closeOfferingForm,
    deactivateSelectedSupplier,
    refreshSupplier,
    refreshOfferings,
  }
}
