import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { dishApi, dishCategoryApi, dishExtraGroupApi, dishExtraOptionApi } from '@/services/dishes-api'
import type { Dish, DishExtraGroup, DishExtraSelectionType } from '@/types/dishes'

const dishSchema = z.object({
  dish_category_id: z.string().min(1, 'Category is required'),
  // .trim() runs before .min() — a whitespace-only/padded name is normalized first so it's
  // judged on its real content length, not incidental leading/trailing spaces.
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string(),
  base_price: z.number({ message: 'Base price is required' }).min(0, 'Base price cannot be negative'),
  is_active: z.boolean(),
  media_gallery_id: z.string().optional(),
  owner_token: z.string().optional(),
})

export type DishFormValues = z.infer<typeof dishSchema>

export interface UseDishFormOptions {
  dish?: Dish | null
  onSuccess: () => void
}

export function useDishForm({ dish, onSuccess }: Readonly<UseDishFormOptions>) {
  const isEditing = !!dish
  const queryClient = useQueryClient()
  const { showError } = useToast()

  // Blocks submit while the uploader has an upload/remove/reorder in flight, or while a
  // failed upload's error is still unacknowledged — same guard as ItemForm.
  const [isUploaderBusy, setIsUploaderBusy] = useState(false)
  const [extraGroups, setExtraGroups] = useState<DishExtraGroup[]>(dish?.extra_groups ?? [])
  const [isMutatingExtras, setIsMutatingExtras] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['dish-categories'],
    queryFn: () => dishCategoryApi.list(),
  })
  const allCategories = categoriesQuery.data?.data.data ?? []
  // Excludes inactive categories from the picker — filing a dish under one is very
  // likely an oversight, not intent. The dish's own current category stays selectable
  // even if it's since gone inactive, so editing an unrelated field doesn't force
  // (or silently perform) a category change just because the <select> can't render it.
  const categories = allCategories.filter(
    (category) => category.is_active || category.id === dish?.dish_category_id
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DishFormValues>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      dish_category_id: dish?.dish_category_id || '',
      name: dish?.name || '',
      description: dish?.description || '',
      base_price: dish?.base_price ?? 0,
      is_active: dish?.is_active ?? true,
      media_gallery_id: undefined,
      owner_token: undefined,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: DishFormValues & { position?: number }) => dishApi.create(data),
    updateFn: (data: DishFormValues) => dishApi.update(dish!.id, data),
    entityName: 'Dish',
    isEditing,
    onSuccess,
  })

  const allErrors = {
    dish_category_id: errors.dish_category_id?.message || validationErrors.dish_category_id,
    name: errors.name?.message || validationErrors.name,
    base_price: errors.base_price?.message || validationErrors.base_price,
  }

  const isSubmitting = isPending
  const isSubmitDisabled = isSubmitting || isUploaderBusy

  const onSubmit = async (data: DishFormValues) => {
    if (isSubmitDisabled) {
      return
    }
    if (isEditing) {
      await execute(data)
      return
    }
    // New dishes otherwise all land on position 0 (the API's own default), leaving their
    // relative order within the category non-deterministic. dishes_count on the selected
    // category (already fetched for the picker, no extra request) is a reasonable proxy for
    // "how many dishes are already in this category" — good enough to file new dishes at
    // the end without needing an exact max-position query like the category reorder does.
    // Known limitation: if a dish was ever deleted from this category, dishes_count can
    // undercount the true max position, landing the new dish's position on top of an
    // existing one — a cosmetic sort-order tie (stable on id), not data loss or a crash,
    // and not worth an extra max-position query for the issue's actual ask (no dish
    // reordering was requested, only deterministic-enough filing order).
    const category = categories.find((c) => c.id === data.dish_category_id)
    await execute({ ...data, position: category?.dishes_count ?? 0 })
  }

  const isActive = watch('is_active')

  const addExtraGroup = async (params: {
    name: string
    selectionType: DishExtraSelectionType
    isRequired: boolean
  }) => {
    if (!dish) return
    setIsMutatingExtras(true)
    try {
      const response = await dishExtraGroupApi.create({
        dish_id: dish.id,
        name: params.name,
        selection_type: params.selectionType,
        is_required: params.isRequired,
      })
      setExtraGroups((prev) => [...prev, { ...response.data.data, options: [] }])
      queryClient.invalidateQueries({ queryKey: ['dishes'] })
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to add extra group'))
    } finally {
      setIsMutatingExtras(false)
    }
  }

  const removeExtraGroup = async (groupId: string) => {
    setIsMutatingExtras(true)
    try {
      await dishExtraGroupApi.delete(groupId)
      setExtraGroups((prev) => prev.filter((group) => group.id !== groupId))
      queryClient.invalidateQueries({ queryKey: ['dishes'] })
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to remove extra group'))
    } finally {
      setIsMutatingExtras(false)
    }
  }

  const addExtraOption = async (groupId: string, params: { name: string; priceDelta: number }) => {
    setIsMutatingExtras(true)
    try {
      const response = await dishExtraOptionApi.create({
        dish_extra_group_id: groupId,
        name: params.name,
        price_delta: params.priceDelta,
      })
      setExtraGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, options: [...(group.options ?? []), response.data.data] }
            : group
        )
      )
      queryClient.invalidateQueries({ queryKey: ['dishes'] })
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to add option'))
    } finally {
      setIsMutatingExtras(false)
    }
  }

  const removeExtraOption = async (groupId: string, optionId: string) => {
    setIsMutatingExtras(true)
    try {
      await dishExtraOptionApi.delete(optionId)
      setExtraGroups((prev) =>
        prev.map((group) =>
          group.id === groupId
            ? { ...group, options: (group.options ?? []).filter((option) => option.id !== optionId) }
            : group
        )
      )
      queryClient.invalidateQueries({ queryKey: ['dishes'] })
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to remove option'))
    } finally {
      setIsMutatingExtras(false)
    }
  }

  return {
    isEditing,
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
    extraGroups,
    isMutatingExtras,
    addExtraGroup,
    removeExtraGroup,
    addExtraOption,
    removeExtraOption,
  }
}
