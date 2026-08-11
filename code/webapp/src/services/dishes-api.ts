import { apiClient } from '@/lib/api-client'
import type {
  CollectionResponse,
  Dish,
  DishCategory,
  DishExtraGroup,
  DishExtraOption,
  DishMediaAttachment,
  EntityResponse,
} from '@/types/dishes'

const api = apiClient

// Dishes
export const dishApi = {
  list: (params?: { dish_category_id?: string; is_active?: boolean; search?: string }) =>
    api.get<CollectionResponse<Dish>>('/dishes', { params }),

  get: (id: string) =>
    api.get<EntityResponse<Dish>>(`/dishes/${id}`),

  create: (data: Partial<Dish> & Partial<DishMediaAttachment>) =>
    api.post<EntityResponse<Dish>>('/dishes', data),

  update: (id: string, data: Partial<Dish>) =>
    api.put<EntityResponse<Dish>>(`/dishes/${id}`, data),

  delete: (id: string) =>
    api.delete(`/dishes/${id}`),
}

// Dish Categories
export const dishCategoryApi = {
  list: (params?: { is_active?: boolean }) =>
    api.get<CollectionResponse<DishCategory>>('/dish-categories', { params }),

  get: (id: string) =>
    api.get<EntityResponse<DishCategory>>(`/dish-categories/${id}`),

  create: (data: Partial<DishCategory>) =>
    api.post<EntityResponse<DishCategory>>('/dish-categories', data),

  update: (id: string, data: Partial<DishCategory>) =>
    api.put<EntityResponse<DishCategory>>(`/dish-categories/${id}`, data),

  delete: (id: string) =>
    api.delete(`/dish-categories/${id}`),
}

// Dish Extra Groups
export const dishExtraGroupApi = {
  create: (data: Partial<DishExtraGroup>) =>
    api.post<EntityResponse<DishExtraGroup>>('/dish-extra-groups', data),

  update: (id: string, data: Partial<DishExtraGroup>) =>
    api.put<EntityResponse<DishExtraGroup>>(`/dish-extra-groups/${id}`, data),

  delete: (id: string) =>
    api.delete(`/dish-extra-groups/${id}`),
}

// Dish Extra Options
export const dishExtraOptionApi = {
  create: (data: Partial<DishExtraOption>) =>
    api.post<EntityResponse<DishExtraOption>>('/dish-extra-options', data),

  update: (id: string, data: Partial<DishExtraOption>) =>
    api.put<EntityResponse<DishExtraOption>>(`/dish-extra-options/${id}`, data),

  delete: (id: string) =>
    api.delete(`/dish-extra-options/${id}`),
}
