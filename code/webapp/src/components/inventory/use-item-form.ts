import { zodResolver } from '@hookform/resolvers/zod'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { useSuggestedCode } from '@/hooks/use-suggested-code'
import { isApiError } from '@/lib/api-error'
import { itemApi } from '@/services/inventory-api'
import type { Item } from '@/types/inventory'

// PRODUCTO is deliberately excluded — Products are created exclusively via the
// /inventory/products SlidePanel (#423); this quick-item form is INSUMO/ACTIVO only (#429).
export const itemSchema = z.object({
  sku: z.string().min(2, 'SKU must be at least 2 characters'),
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string(),
  type: z.enum(['INSUMO', 'ACTIVO']),
  is_stocked: z.boolean(),
  is_perishable: z.boolean(),
  is_active: z.boolean(),
  media_gallery_id: z.string().optional(),
  owner_token: z.string().optional(),
})

export type ItemFormValues = z.infer<typeof itemSchema>

/** Extra keys the create endpoint adds to the standard 422 body on a SKU race (#500). */
interface SkuCollisionResponse {
  rejected_sku?: string
  suggested_sku?: string
}

export interface ItemSkuCollision {
  rejectedSku: string
  suggestedSku: string
}

export interface UseItemFormOptions {
  item?: Item | null
  onSuccess: () => void
}

export function useItemForm({ item, onSuccess }: Readonly<UseItemFormOptions>) {
  const isEditing = !!item

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      sku: item?.sku || '',
      name: item?.name || '',
      description: item?.description || '',
      // PUT /items/{id} ignores `type` entirely (not in UpdateItemRequest's rules), so a legacy
      // PRODUCTO item being edited here simply falls back to INSUMO with no effect on the request.
      type: item?.type === 'ACTIVO' ? 'ACTIVO' : 'INSUMO',
      is_stocked: item?.is_stocked ?? true,
      is_perishable: item?.is_perishable ?? false,
      is_active: item?.is_active ?? true,
      media_gallery_id: undefined,
      owner_token: undefined,
    },
  })

  // ── Server-suggested contextual SKU (create mode only) ──────────────────────
  // The prefix is derived from the name, so the suggestion is re-fetched as the
  // operator types — debounced to one request per pause, plus an explicit regenerate.
  const currentName = (watch('name') || '').trim()
  const debouncedName = useDebouncedValue(currentName, 400)
  const suggestion = useSuggestedCode(
    ['items', 'next-sku', debouncedName],
    async () => {
      const { data } = await itemApi.nextSku({ name: debouncedName })
      return { code: data.sku, prefix: data.prefix }
    },
    !isEditing && debouncedName.length > 0,
  )

  // `true` once the operator types in the SKU field — their value is never
  // overwritten by a fetched or collision-regenerated suggestion after that.
  // The ref mirrors the state so async callbacks (submit → collision) read the
  // current value instead of a stale render's.
  const [skuManuallyEdited, setSkuManuallyEdited] = useState(false)
  const skuManuallyEditedRef = useRef(false)
  const setManualEdited = (value: boolean) => {
    skuManuallyEditedRef.current = value
    setSkuManuallyEdited(value)
  }

  // After a collision we hold the fresh alternative in the field (`pinnedSku`) and
  // show an alert (`collision`). Both belong to one specific name — the ref records
  // which — and are dropped the moment that name context changes (see effect below).
  const [pinnedSku, setPinnedSku] = useState<string | null>(null)
  const [collision, setCollision] = useState<ItemSkuCollision | null>(null)
  const systemSkuForNameRef = useRef<string | null>(null)

  const clearGeneratedSku = () => {
    systemSkuForNameRef.current = null
    setPinnedSku(null)
    setCollision(null)
  }

  const pinnedSkuIsCurrent = pinnedSku !== null && systemSkuForNameRef.current === currentName
  // A fetched suggestion is only usable once its request is settled *and* was
  // fired for the name currently in the field — during the debounce gap or an
  // in-flight/failed request there is deliberately no value.
  const suggestionSettledForCurrentName =
    currentName === debouncedName && !suggestion.isLoading && !suggestion.isRefreshing
  const settledSuggestionSku = suggestionSettledForCurrentName ? suggestion.suggestedCode : undefined

  // While the SKU is system-managed (create mode, operator hasn't typed one) the
  // field always mirrors the best value for the *current* name: the post-collision
  // pin, else a settled suggestion, else empty. Empty — never a stale value for a
  // previous name — means a mismatched SKU can't be submitted unnoticed; the empty
  // field simply fails validation until the suggestion resolves or the operator
  // regenerates / types one.
  const managedSku = (pinnedSkuIsCurrent ? pinnedSku : settledSuggestionSku) ?? ''

  const isResolvingSuggestion =
    !isEditing &&
    !skuManuallyEdited &&
    !pinnedSkuIsCurrent &&
    currentName.length > 0 &&
    (currentName !== debouncedName || suggestion.isLoading || suggestion.isRefreshing)

  useEffect(() => {
    if (isEditing || skuManuallyEdited) return
    setValue('sku', managedSku, { shouldValidate: false })
  }, [isEditing, skuManuallyEdited, managedSku, setValue])

  // Drop a collision pin / alert once the name it was generated for is no longer
  // the active context — otherwise it would keep overriding a fresh suggestion for
  // the new name (and the alert would be about a name the operator has moved on from).
  useEffect(() => {
    if (isEditing || skuManuallyEdited) return
    if (systemSkuForNameRef.current !== null && systemSkuForNameRef.current !== currentName) {
      clearGeneratedSku()
    }
  }, [isEditing, skuManuallyEdited, currentName])

  const skuField = register('sku', {
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setValue('sku', event.target.value.toUpperCase(), { shouldValidate: false })
      setManualEdited(true)
      clearGeneratedSku()
    },
  })

  const handleRegenerateSku = () => {
    setManualEdited(false)
    clearGeneratedSku()
    suggestion.refresh()
  }

  // ── Media uploader busy state ──────────────────────────────────────────────
  const [isUploaderBusy, setIsUploaderBusy] = useState(false)

  // ── Mutation ──────────────────────────────────────────────────────────────
  const { mutation, validationErrors, clearValidationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: ItemFormValues) => itemApi.create({ ...data, sku: data.sku.toUpperCase() }),
    updateFn: (data: ItemFormValues) => itemApi.update(item!.id, { ...data, sku: data.sku.toUpperCase() }),
    entityName: 'Item',
    isEditing,
    onSuccess,
  })

  const applyCollision = (submittedSku: string, body: SkuCollisionResponse) => {
    const next: ItemSkuCollision = {
      rejectedSku: body.rejected_sku ?? submittedSku.toUpperCase(),
      suggestedSku: body.suggested_sku as string,
    }
    systemSkuForNameRef.current = currentName
    setCollision(next)
    // An untouched generated value is replaced in place; the operator still has
    // to submit again. The stale "SKU already taken" field error from the failed
    // submit is cleared — it applied to the rejected SKU, not the fresh one.
    // A manually chosen value is left alone (error kept) — the view offers an
    // explicit "use this instead" action driven by `collision`.
    if (!skuManuallyEditedRef.current) {
      setPinnedSku(next.suggestedSku)
      setValue('sku', next.suggestedSku, { shouldValidate: false })
      clearValidationErrors()
    }
  }

  const applySuggestedSku = () => {
    if (!collision) return
    systemSkuForNameRef.current = currentName
    setPinnedSku(collision.suggestedSku)
    setManualEdited(false)
    setCollision(null)
    setValue('sku', collision.suggestedSku, { shouldValidate: true })
    clearValidationErrors()
  }

  const isSubmitDisabled = isPending || isUploaderBusy

  const onSubmit = async (values: ItemFormValues) => {
    // Guard the handler itself, not just the button — a submit triggered by Enter in a
    // text field dispatches the form's submit event directly and would still reach here.
    if (isSubmitDisabled) {
      return
    }
    clearValidationErrors()
    try {
      await mutation.mutateAsync(values)
      clearGeneratedSku()
    } catch (error) {
      const body = isApiError(error)
        ? (error.response?.data as SkuCollisionResponse | undefined)
        : undefined
      if (body?.suggested_sku) {
        applyCollision(values.sku, body)
      }
    }
  }

  const allErrors = {
    sku: errors.sku?.message || validationErrors.sku,
    name: errors.name?.message || validationErrors.name,
  }

  return {
    isEditing,
    register,
    skuField,
    skuValue: watch('sku'),
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isStocked: watch('is_stocked'),
    isPerishable: watch('is_perishable'),
    isActive: watch('is_active'),
    isSubmitting: isPending,
    isSubmitDisabled,
    setIsUploaderBusy,
    // Suggested-SKU UI
    isSkuSuggested: !isEditing && !skuManuallyEdited,
    isResolvingSuggestion,
    isSuggestionLoading: suggestion.isLoading,
    isRefreshingSku: suggestion.isRefreshing,
    suggestionFailed: suggestion.isError && !suggestion.isRefreshing && currentName === debouncedName,
    handleRegenerateSku,
    collision,
    canApplySuggestedSku: collision !== null && skuManuallyEdited,
    applySuggestedSku,
  }
}
