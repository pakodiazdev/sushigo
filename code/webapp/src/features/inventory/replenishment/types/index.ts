export type { ReplenishmentPolicy } from '@/types/inventory'

export interface ReplenishmentPolicyPayload {
  min_stock: number
  max_stock: number
  notes?: string | null
}
