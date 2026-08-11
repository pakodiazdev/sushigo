import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { dishApi, dishCategoryApi } from '@/services/dishes-api'
import type { Dish, DishCategory } from '@/types/dishes'

export interface DishCategoryGroup {
  category: DishCategory
  dishes: Dish[]
}

export function useDishesList() {
  const queryClient = useQueryClient()
  const { showSuccess, showError } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false)
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false)
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false)

  const categoriesQuery = useQuery({
    queryKey: ['dish-categories'],
    queryFn: () => dishCategoryApi.list(),
  })

  const dishesQuery = useQuery({
    queryKey: ['dishes', searchQuery, categoryFilter, statusFilter],
    queryFn: () =>
      dishApi.list({
        search: searchQuery || undefined,
        dish_category_id: categoryFilter || undefined,
        is_active: statusFilter ? statusFilter === 'active' : undefined,
      }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dishApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] })
      queryClient.invalidateQueries({ queryKey: ['dish-categories'] })
      setIsDetailsPanelOpen(false)
      setSelectedDish(null)
      showSuccess('Dish deleted successfully', 'Dish Deleted')
    },
    onError: (error: unknown) => {
      showError(getApiErrorMessage(error, 'Failed to delete dish'), 'Delete Error')
    },
  })

  // Surfaced once per failure — a transient categories-fetch error must not silently blank
  // the whole catalog (see the `groups` fallback below) without at least telling the user
  // why the grouping/filtering looks broken.
  useEffect(() => {
    if (categoriesQuery.isError) {
      showError(getApiErrorMessage(categoriesQuery.error, 'Failed to load categories'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriesQuery.isError])

  const categories = categoriesQuery.data?.data.data ?? []
  const dishes = dishesQuery.data?.data.data ?? []

  // Grouped by category, in the category's own display position — matches the backend's
  // own ordering (dish_categories.position, then dishes.position within it). Categories
  // with no dish in the current filtered set are simply omitted, not shown empty.
  //
  // If the categories query itself failed (but dishes loaded fine), grouping by category
  // is impossible — falling through to an empty `categories` array would render every
  // dish as "no results", hiding a menu the restaurant can already see is there. Show
  // dishes ungrouped instead so the failure only degrades grouping, not the whole page.
  let groups: DishCategoryGroup[]
  if (categoriesQuery.isError) {
    groups =
      dishes.length > 0
        ? [{ category: { id: '', name: 'All Dishes', position: 0, is_active: true }, dishes }]
        : []
  } else {
    groups = [...categories]
      .sort((a, b) => a.position - b.position)
      .map((category) => ({
        category,
        dishes: dishes.filter((dish) => dish.dish_category_id === category.id),
      }))
      .filter((group) => group.dishes.length > 0)
  }

  const handleRowClick = (dish: Dish) => {
    setSelectedDish(dish)
    setIsDetailsPanelOpen(true)
  }

  const handleNewDish = () => {
    setSelectedDish(null)
    setIsFormPanelOpen(true)
  }

  const handleEdit = (dish: Dish) => {
    setSelectedDish(dish)
    setIsDetailsPanelOpen(false)
    setIsFormPanelOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este platillo?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['dishes'] })
    queryClient.invalidateQueries({ queryKey: ['dish-categories'] })
    setIsFormPanelOpen(false)
    setSelectedDish(null)
  }

  const closeDetailsPanel = () => {
    setIsDetailsPanelOpen(false)
    setSelectedDish(null)
  }

  const closeFormPanel = () => {
    setIsFormPanelOpen(false)
    setSelectedDish(null)
  }

  return {
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    categories,
    groups,
    // Both queries feed `groups` — if dishes resolve before categories, groups would compute
    // from an empty categories array and briefly flash the "no results" empty state.
    isLoading: dishesQuery.isLoading || categoriesQuery.isLoading,
    selectedDish,
    isDetailsPanelOpen,
    isFormPanelOpen,
    isCategoryManagerOpen,
    setIsCategoryManagerOpen,
    handleRowClick,
    handleNewDish,
    handleEdit,
    handleDelete,
    handleFormSuccess,
    closeDetailsPanel,
    closeFormPanel,
  }
}
