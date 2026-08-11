import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { dishCategoryApi } from '@/services/dishes-api'
import type { DishCategory } from '@/types/dishes'

const newCategorySchema = z.object({
  // .trim() runs before .min() — a whitespace-only name (length > 0, so it'd otherwise pass
  // client-side) is normalized to empty first and correctly rejected here instead of only
  // failing after createCategory's own .trim() sends an empty name and the API 422s.
  name: z.string().trim().min(1, 'Name is required'),
})
export type NewCategoryFormValues = z.infer<typeof newCategorySchema>

export function useDishCategoryManager() {
  const queryClient = useQueryClient()
  const { showError, showSuccess } = useToast()
  const [isMutating, setIsMutating] = useState(false)

  const form = useForm<NewCategoryFormValues>({
    resolver: zodResolver(newCategorySchema),
    defaultValues: { name: '' },
  })

  const categoriesQuery = useQuery({
    queryKey: ['dish-categories'],
    queryFn: () => dishCategoryApi.list(),
  })

  const categories = [...(categoriesQuery.data?.data.data ?? [])].sort(
    (a, b) => a.position - b.position
  )

  // Awaited at every call site below (not fire-and-forget) — invalidateQueries() resolves
  // once the refetch of active observers completes, so awaiting it before clearing
  // isMutating guarantees `categories` is fresh before the buttons re-enable. Without
  // this, a rapid second move (isMutating already false, but `categories` still holding
  // pre-refetch positions) computes its swap from stale data, leaving what's on screen
  // out of sync with what was actually saved.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dish-categories'] })

  // categories.length assumes positions are contiguous/0-based, which the API doesn't
  // guarantee (position defaults to 0 when omitted, so sparse/duplicate values are
  // possible) — appending after the current max avoids colliding with or landing
  // in the middle of the existing order.
  const nextPosition = () => categories.reduce((max, category) => Math.max(max, category.position), -1) + 1

  const createCategory = form.handleSubmit(async (data) => {
    setIsMutating(true)
    try {
      // data.name is already trimmed by the schema's own .trim().
      await dishCategoryApi.create({ name: data.name, position: nextPosition() })
      form.reset()
      showSuccess('Category created successfully', 'Category Created')
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to create category'))
    } finally {
      await invalidate()
      setIsMutating(false)
    }
  })

  const toggleActive = async (category: DishCategory) => {
    setIsMutating(true)
    try {
      await dishCategoryApi.update(category.id, { is_active: !category.is_active })
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to update category'))
    } finally {
      await invalidate()
      setIsMutating(false)
    }
  }

  /**
   * Moves this category one slot in the given direction, then renumbers *every* category
   * to its sequential index (0..N-1) in the resulting order — not just a two-way swap of
   * the moved pair's own stored position values. A swap only touching two rows can't
   * guarantee a consistent order when positions are sparse or gapped elsewhere in the list
   * (every untouched row keeps a stale value that may no longer sit correctly relative to
   * the two that changed, which could shuffle unrelated categories or leave the saved order
   * inconsistent with what's on screen); reassigning everyone to their new index is the only
   * representation that's always internally consistent, regardless of the existing spread.
   * Rows whose position already equals their new index are skipped — no PUT needed.
   */
  const move = async (category: DishCategory, direction: 'up' | 'down') => {
    const index = categories.findIndex((c) => c.id === category.id)
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || targetIndex < 0 || targetIndex >= categories.length) return

    const reordered = [...categories]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved!)

    setIsMutating(true)
    try {
      await Promise.all(
        reordered
          .map((c, position) => ({ c, position }))
          .filter(({ c, position }) => c.position !== position)
          .map(({ c, position }) => dishCategoryApi.update(c.id, { position }))
      )
    } catch (err: unknown) {
      showError(getApiErrorMessage(err, 'Failed to reorder categories'))
    } finally {
      // Always refetches, success or failure — Promise.all rejects on the *first* PUT that
      // fails, but any others already in flight may still have succeeded server-side. Without
      // this in the failure path too, the screen keeps showing the pre-move order while the
      // server has actually applied a partial reorder — invalidating here is what keeps
      // "what's on screen" truthful to "what's actually saved" in both outcomes.
      await invalidate()
      setIsMutating(false)
    }
  }

  return {
    categories,
    isLoading: categoriesQuery.isLoading,
    form,
    isMutating,
    createCategory,
    toggleActive,
    move,
  }
}
