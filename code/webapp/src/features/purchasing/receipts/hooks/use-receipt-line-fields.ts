import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import type { UseFormSetValue } from 'react-hook-form'
import { fetchAllPages } from '@/lib/fetch-all-pages'
import { productApi, productVariantApi, variantPurchasePresentationApi } from '@/services/inventory-api'
import { supplierOfferingApi } from '@/features/purchasing/suppliers/api/supplier-api'
import type { ReceiptFormValues } from './use-receipt-form'

export interface UseReceiptLineFieldsOptions {
  index: number
  supplierId: string
  setValue: UseFormSetValue<ReceiptFormValues>
}

/**
 * Drives one receipt line's Product → Variant → Purchase Presentation cascade, mirroring
 * use-supplier-offering-form.ts's chain — plus the Supplier Offering options for the line's
 * currently-selected presentation, scoped to the receipt's chosen Supplier (#431 contract:
 * a Supplier Offering always belongs to exactly one Supplier + one Variant Purchase
 * Presentation pair).
 */
export function useReceiptLineFields({ index, supplierId, setValue }: UseReceiptLineFieldsOptions) {
  const [productId, setProductId] = useState('')
  const [variantId, setVariantId] = useState('')

  const productsQuery = useQuery({
    queryKey: ['receipt-form-products'],
    queryFn: () => fetchAllPages((page) => productApi.list({ is_active: true, page, per_page: 100 })),
  })
  const variantsQuery = useQuery({
    queryKey: ['receipt-form-variants', productId],
    queryFn: () => fetchAllPages((page) => productVariantApi.list(productId, { page, per_page: 100 })),
    enabled: Boolean(productId),
  })
  const presentationsQuery = useQuery({
    queryKey: ['receipt-form-presentations', productId, variantId],
    queryFn: () => variantPurchasePresentationApi.list(productId, variantId),
    enabled: Boolean(productId && variantId),
  })
  const offeringsQuery = useQuery({
    queryKey: ['receipt-form-offerings', supplierId],
    queryFn: () => supplierOfferingApi.list(supplierId, { is_active: true }),
    enabled: Boolean(supplierId),
  })

  const products = productsQuery.data?.data.data ?? []
  const variants = (variantsQuery.data?.data.data ?? []).filter((variant) => variant.is_active)
  const presentations = (presentationsQuery.data?.data.data ?? []).filter((presentation) => presentation.is_active)
  const offerings = offeringsQuery.data?.data.data ?? []

  const onProductChange = (nextProductId: string) => {
    setProductId(nextProductId)
    setVariantId('')
    setValue(`lines.${index}.variant_purchase_presentation_id`, '')
    setValue(`lines.${index}.supplier_offering_id`, '')
    setValue(`lines.${index}.presentation_factor`, 0)
  }

  const onVariantChange = (nextVariantId: string) => {
    setVariantId(nextVariantId)
    setValue(`lines.${index}.variant_purchase_presentation_id`, '')
    setValue(`lines.${index}.supplier_offering_id`, '')
    setValue(`lines.${index}.presentation_factor`, 0)
  }

  const onPresentationChange = (presentationId: string) => {
    setValue(`lines.${index}.variant_purchase_presentation_id`, presentationId)
    setValue(`lines.${index}.supplier_offering_id`, '')
    const presentation = presentations.find((candidate) => candidate.id === presentationId)
    setValue(`lines.${index}.presentation_factor`, presentation?.template?.base_unit_quantity ?? 0)
  }

  const offeringsForPresentation = (presentationId: string) =>
    offerings.filter((offering) => offering.presentation.id === presentationId)

  return {
    productId,
    variantId,
    products,
    variants,
    presentations,
    onProductChange,
    onVariantChange,
    onPresentationChange,
    offeringsForPresentation,
  }
}
