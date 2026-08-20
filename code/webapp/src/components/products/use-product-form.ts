import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { brandApi, inventoryCategoryApi, productApi } from '@/services/inventory-api'
import type { Product } from '@/types/inventory'

// Catalog-identity-only contract (#422) — never asks for Variant, cost, price, UOM,
// stock or opening balance. See doc/architecture/product-catalog/product-catalog-architecture.en.md §6.
const productSchema = z.object({
  // .trim() runs before .min() — a whitespace-only name is normalized first so it's
  // judged on its real content length, matching the same fix on the Dish name field.
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  inventory_category_id: z.string().min(1, 'Category is required'),
  // Empty string means "no brand" — Brand is optional (arch doc §3.5).
  brand_id: z.string(),
  description: z.string(),
  is_active: z.boolean(),
  media_gallery_id: z.string().optional(),
  owner_token: z.string().optional(),
})

export type ProductFormValues = z.infer<typeof productSchema>

export interface UseProductFormOptions {
  product?: Product | null
  onSuccess: (product: Product) => void
}

/**
 * Brand-only helper (see the categoriesQuery comment below for why categories don't
 * need this). `items` comes from an `is_active: true`-filtered API call, so a `current`
 * reference that has since gone inactive is never in it — the backend excludes it
 * before the client ever sees it (ListBrandsController). Keep the defense-in-depth
 * `is_active` filter (in case the API ever returns more than asked), then append
 * `current` back in if it's still missing, so the picker keeps showing the product's
 * existing brand while editing instead of rendering blank.
 */
function withCurrentAssignment<T extends { id: string; name: string; is_active: boolean }>(
  items: T[],
  current?: { id: string; name: string } | null
): Array<{ id: string; name: string }> {
  const active = items.filter((item) => item.is_active)
  if (!current || active.some((item) => item.id === current.id)) {
    return active
  }
  return [...active, current]
}

export function useProductForm({ product, onSuccess }: Readonly<UseProductFormOptions>) {
  const isEditing = !!product

  // Blocks submit while the uploader has an upload/remove/reorder in flight, or while a
  // failed upload's error is still unacknowledged — same guard as ItemForm/DishForm.
  const [isUploaderBusy, setIsUploaderBusy] = useState(false)

  const brandsQuery = useQuery({
    queryKey: ['brands', { is_active: true }],
    queryFn: () => brandApi.list({ is_active: true }),
  })
  const allBrands = brandsQuery.data?.data.data ?? []
  // The query already asks the backend for active brands only (same rationale as the
  // Dish category picker), so merge the Product's own currently-assigned brand back in
  // even if it has since gone inactive — otherwise editing an unrelated field would
  // force the user to pick a different brand just to make the select non-blank.
  const brands = withCurrentAssignment(allBrands, product?.brand)

  // Unlike brand_id, CreateProductRequest/UpdateProductRequest only reject a category
  // that's soft-deleted, not merely inactive (see UpdateProductRequest::validateCategoryAssignment) —
  // inactive-category assignment is deliberately allowed, both for new products and when
  // reassigning an existing one. Fetch every non-deleted category rather than active-only,
  // so withCurrentAssignment's "keep the current one selectable" merge isn't needed here.
  const categoriesQuery = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: () => inventoryCategoryApi.list(),
  })
  const categories = categoriesQuery.data?.data.data ?? []

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      inventory_category_id: product?.inventory_category?.id || '',
      brand_id: product?.brand?.id || '',
      description: product?.description || '',
      is_active: product?.is_active ?? true,
      media_gallery_id: undefined,
      owner_token: undefined,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: ProductFormValues) =>
      productApi.create({
        name: data.name,
        inventory_category_id: data.inventory_category_id,
        // Always sent explicitly (never omitted) so clearing the brand selection can
        // unset a previously-assigned one — see UpdateProductRequest's productData().
        brand_id: data.brand_id || null,
        description: data.description,
        is_active: data.is_active,
        media_gallery_id: data.media_gallery_id,
        owner_token: data.owner_token,
      }),
    updateFn: (data: ProductFormValues) =>
      productApi.update(product!.id, {
        name: data.name,
        inventory_category_id: data.inventory_category_id,
        brand_id: data.brand_id || null,
        description: data.description,
        is_active: data.is_active,
      }),
    entityName: 'Product',
    isEditing,
    onSuccess: (response) => onSuccess(response.data.data),
  })

  // Merge client and server validation errors — server-side field names match the
  // request keys (inventory_category_id, brand_id), not the resolved public_id shape.
  const allErrors = {
    name: errors.name?.message || validationErrors.name,
    inventory_category_id: errors.inventory_category_id?.message || validationErrors.inventory_category_id,
    brand_id: errors.brand_id?.message || validationErrors.brand_id,
  }

  const isSubmitting = isPending
  const isSubmitDisabled = isSubmitting || isUploaderBusy

  const onSubmit = async (data: ProductFormValues) => {
    // Guard the handler itself, not just the submit button's disabled attribute — a
    // submit triggered by pressing Enter dispatches the form's submit event directly
    // and would otherwise still reach execute() while busy.
    if (isSubmitDisabled) {
      return
    }
    await execute(data)
  }

  const isActive = watch('is_active')

  return {
    isEditing,
    brands,
    categories,
    register,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isActive,
    isSubmitting,
    isSubmitDisabled,
    setIsUploaderBusy,
  }
}
