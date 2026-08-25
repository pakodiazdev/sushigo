import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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

  const productsQuery = useQuery({
    queryKey: ['supplier-form-products'],
    queryFn: () => productApi.list({ is_active: true, per_page: 100 }),
  })
  const variantsQuery = useQuery({
    queryKey: ['supplier-form-variants', productId],
    queryFn: () => productVariantApi.list(productId, { per_page: 100 }),
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
  }

  const onVariantChange = (nextVariantId: string) => {
    setValue('variant_id', nextVariantId)
    setValue('variant_purchase_presentation_id', '')
  }

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
