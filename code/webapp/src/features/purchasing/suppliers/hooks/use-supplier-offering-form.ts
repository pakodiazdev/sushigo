import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useFormMutation } from '@/hooks/use-form-mutation'
import { productApi, productVariantApi, variantPurchasePresentationApi } from '@/services/inventory-api'
import { supplierOfferingApi } from '../api/supplier-api'
import type { SupplierOffering } from '../types'

const offeringSchema = z.object({
  product_id: z.string(),
  variant_id: z.string(),
  variant_purchase_presentation_id: z.string().min(1, 'Selecciona una presentación'),
  supplier_code: z.string().trim().max(100, 'El código no puede exceder 100 caracteres'),
  quoted_price: z.number({ message: 'Ingresa un precio válido' }).min(0, 'El precio no puede ser negativo'),
  currency: z.string().trim().length(3, 'Usa un código ISO de 3 letras'),
  valid_from: z.string(),
  valid_until: z.string(),
  minimum_order_quantity: z.number({ message: 'Ingresa una cantidad válida' })
    .positive('La cantidad mínima debe ser mayor a cero'),
  lead_time_days: z.union([
    z.number({ message: 'Ingresa una cantidad de días válida' })
      .int('Los días de entrega deben ser un número entero')
      .min(0, 'Los días de entrega no pueden ser negativos'),
    z.nan(),
  ]),
  is_active: z.boolean(),
}).superRefine((values, context) => {
  if (values.valid_from && values.valid_until && values.valid_until < values.valid_from) {
    context.addIssue({ code: 'custom', path: ['valid_until'], message: 'Debe ser posterior o igual al inicio' })
  }
})

export type SupplierOfferingFormValues = z.infer<typeof offeringSchema>

export interface UseSupplierOfferingFormOptions {
  supplierId: string
  offering?: SupplierOffering | null
  onSuccess: () => void
}

export function useSupplierOfferingForm({
  supplierId,
  offering,
  onSuccess,
}: Readonly<UseSupplierOfferingFormOptions>) {
  const isEditing = Boolean(offering)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SupplierOfferingFormValues>({
    resolver: zodResolver(offeringSchema),
    defaultValues: {
      product_id: offering?.presentation.variant?.product?.id ?? '',
      variant_id: offering?.presentation.variant?.id ?? '',
      variant_purchase_presentation_id: offering?.presentation.id ?? '',
      supplier_code: offering?.supplier_code ?? '',
      quoted_price: offering?.quoted_price ?? 0,
      currency: offering?.currency ?? 'MXN',
      valid_from: offering?.valid_from ?? '',
      valid_until: offering?.valid_until ?? '',
      minimum_order_quantity: offering?.minimum_order_quantity ?? 1,
      lead_time_days: offering?.lead_time_days ?? Number.NaN,
      is_active: offering?.is_active ?? true,
    },
  })

  const productId = watch('product_id')
  const variantId = watch('variant_id')

  // Producto and Variante are server-side searched (debounced free text → paginated query,
  // `per_page` kept small) instead of a single page-1 fetch dumped into a native <select>.
  // Without this, any product past the first page — or any variant of a product with more
  // than one page of variants — could never be picked when creating an offering (#506).
  const [productSearch, setProductSearch] = useState('')
  const [variantSearch, setVariantSearch] = useState('')

  const productsQuery = useQuery({
    queryKey: ['supplier-form-products', productSearch],
    queryFn: () => productApi.list({ is_active: true, search: productSearch || undefined, per_page: 20 }),
    enabled: !isEditing,
  })
  const variantsQuery = useQuery({
    queryKey: ['supplier-form-variants', productId, variantSearch],
    // is_active is filtered server-side (before pagination) so an active match can't be pushed
    // off page 1 by inactive rows that sort ahead of it.
    queryFn: () => productVariantApi.list(productId, { search: variantSearch || undefined, is_active: true, per_page: 20 }),
    enabled: Boolean(productId) && !isEditing,
  })
  const presentationsQuery = useQuery({
    queryKey: ['supplier-form-presentations', productId, variantId],
    queryFn: () => variantPurchasePresentationApi.list(productId, variantId),
    enabled: Boolean(productId && variantId) && !isEditing,
  })

  const products = productsQuery.data?.data.data ?? []
  const variants = (variantsQuery.data?.data.data ?? []).filter((variant) => variant.is_active)
  const presentations = (presentationsQuery.data?.data.data ?? []).filter((presentation) => presentation.is_active)

  const { execute, validationErrors, isPending } = useFormMutation({
    mutationFn: (values: SupplierOfferingFormValues) => {
      const data = {
        variant_purchase_presentation_id: values.variant_purchase_presentation_id,
        supplier_code: values.supplier_code || null,
        quoted_price: values.quoted_price,
        currency: values.currency.toUpperCase(),
        valid_from: values.valid_from || null,
        valid_until: values.valid_until || null,
        minimum_order_quantity: values.minimum_order_quantity,
        lead_time_days: Number.isNaN(values.lead_time_days) ? null : values.lead_time_days,
        is_active: values.is_active,
      }
      return offering
        ? supplierOfferingApi.update(supplierId, offering.id, data)
        : supplierOfferingApi.create(supplierId, data)
    },
    successMessage: isEditing ? 'Oferta actualizada' : 'Oferta creada',
    errorMessageFallback: 'No fue posible guardar la oferta',
    onSuccess,
  })

  const allErrors = {
    variant_purchase_presentation_id:
      errors.variant_purchase_presentation_id?.message || validationErrors.variant_purchase_presentation_id,
    supplier_code: errors.supplier_code?.message || validationErrors.supplier_code,
    quoted_price: errors.quoted_price?.message || validationErrors.quoted_price,
    currency: errors.currency?.message || validationErrors.currency,
    valid_from: errors.valid_from?.message || validationErrors.valid_from,
    valid_until: errors.valid_until?.message || validationErrors.valid_until,
    minimum_order_quantity: errors.minimum_order_quantity?.message || validationErrors.minimum_order_quantity,
    lead_time_days: errors.lead_time_days?.message || validationErrors.lead_time_days,
  }

  const onProductChange = (nextProductId: string) => {
    setValue('product_id', nextProductId)
    setValue('variant_id', '')
    setValue('variant_purchase_presentation_id', '')
    // Drop the previous product's variant search term — otherwise the new product's
    // variant list stays filtered by it and can look empty.
    setVariantSearch('')
  }

  const onVariantChange = (nextVariantId: string) => {
    setValue('variant_id', nextVariantId)
    setValue('variant_purchase_presentation_id', '')
  }

  // A refined search can drop the currently selected product/variant from the latest page of
  // results, leaving the <select> blank while the form still holds the stale id. Clear it (and
  // its dependent cascade) once a fetch *succeeds* without the selection — never on a failed or
  // still-pending request, so a transient network error doesn't wipe what the user already typed.
  useEffect(() => {
    if (isEditing || !productId || !productsQuery.isSuccess) return
    if (!products.some((product) => product.id === productId)) {
      onProductChange('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productsQuery.data, productsQuery.isSuccess])

  useEffect(() => {
    if (isEditing || !variantId || !variantsQuery.isSuccess) return
    if (!variants.some((variant) => variant.id === variantId)) {
      onVariantChange('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantsQuery.data, variantsQuery.isSuccess])

  const onSubmit = async (values: SupplierOfferingFormValues) => {
    await execute(values)
  }

  return {
    isEditing,
    productId,
    variantId,
    products,
    variants,
    presentations,
    productSearch,
    setProductSearch,
    variantSearch,
    setVariantSearch,
    isLoadingProducts: productsQuery.isLoading,
    isLoadingVariants: variantsQuery.isLoading,
    hasProductSearchError: productsQuery.isError,
    hasVariantSearchError: variantsQuery.isError,
    register,
    handleSubmit,
    setValue,
    onProductChange,
    onVariantChange,
    onSubmit,
    allErrors,
    isActive: watch('is_active'),
    isSubmitting: isPending,
  }
}
