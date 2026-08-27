import { apiClient } from '@/lib/api-client'
import type { CollectionResponse, EntityResponse } from '@/types/inventory'
import type { Supplier, SupplierOffering } from '../types'

export interface SupplierPayload {
  code: string
  name: string
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  is_active?: boolean
}

export interface SupplierOfferingPayload {
  variant_purchase_presentation_id: string
  supplier_code?: string | null
  quoted_price: number
  currency: string
  valid_from?: string | null
  valid_until?: string | null
  minimum_order_quantity?: number
  lead_time_days?: number | null
  is_active?: boolean
}

export const supplierApi = {
  list: (params?: { search?: string; is_active?: boolean }) =>
    apiClient.get<CollectionResponse<Supplier>>('/inventory/suppliers', { params }),
  nextCode: () =>
    apiClient.get<{ code: string; prefix: string }>('/inventory/suppliers/next-code'),
  get: (supplierId: string) =>
    apiClient.get<EntityResponse<Supplier>>(`/inventory/suppliers/${supplierId}`),
  create: (data: SupplierPayload) =>
    apiClient.post<EntityResponse<Supplier>>('/inventory/suppliers', data),
  update: (supplierId: string, data: Partial<SupplierPayload>) =>
    apiClient.put<EntityResponse<Supplier>>(`/inventory/suppliers/${supplierId}`, data),
  delete: (supplierId: string) => apiClient.delete(`/inventory/suppliers/${supplierId}`),
}

export const supplierOfferingApi = {
  list: (supplierId: string, params?: { is_active?: boolean; currency?: string; valid_on?: string }) =>
    apiClient.get<CollectionResponse<SupplierOffering>>(`/inventory/suppliers/${supplierId}/offerings`, { params }),
  create: (supplierId: string, data: SupplierOfferingPayload) =>
    apiClient.post<EntityResponse<SupplierOffering>>(`/inventory/suppliers/${supplierId}/offerings`, data),
  update: (supplierId: string, offeringId: string, data: Partial<SupplierOfferingPayload>) =>
    apiClient.put<EntityResponse<SupplierOffering>>(`/inventory/suppliers/${supplierId}/offerings/${offeringId}`, data),
  delete: (supplierId: string, offeringId: string) =>
    apiClient.delete(`/inventory/suppliers/${supplierId}/offerings/${offeringId}`),
}
