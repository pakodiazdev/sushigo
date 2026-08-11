// Platillos (dishes) catalog types — menu catalog, distinct from the resale
// Item/ItemVariant inventory (no stock quantity, no recipe costing). See
// doc/architecture and code/api/app/Models/{Dish,DishCategory,DishExtraGroup,DishExtraOption}.php

export interface DishCategory {
  id: string
  name: string
  position: number
  is_active: boolean
  dishes_count?: number
  created_at?: string
  updated_at?: string
}

export type DishExtraSelectionType = 'SINGLE' | 'MULTIPLE'

export interface DishExtraOption {
  id: string
  dish_extra_group_id: string
  name: string
  price_delta: number
  is_active: boolean
  position: number
  created_at?: string
  updated_at?: string
}

export interface DishExtraGroup {
  id: string
  dish_id: string
  name: string
  is_required: boolean
  selection_type: DishExtraSelectionType
  options?: DishExtraOption[]
  created_at?: string
  updated_at?: string
}

export interface Dish {
  id: string
  dish_category_id: string
  name: string
  description?: string | null
  base_price: number
  is_active: boolean
  position: number
  /** Primary photo URL, or null when no gallery is attached. */
  photo_url: string | null
  extra_groups?: DishExtraGroup[]
  created_at?: string
  updated_at?: string
}

/**
 * Request-only fields accepted by POST /dishes to attach a media gallery —
 * never present on a GET response (see doc/conventions/backend/media-uploads.md).
 * Create-only: there is no GET-gallery-assets endpoint yet, so update doesn't
 * accept these (mirrors Item's own uploader restriction in item-form.tsx).
 */
export interface DishMediaAttachment {
  media_gallery_id?: string
  owner_token?: string
}

// API Response Types — dishes/categories/extras endpoints return a plain
// (non-paginated) collection, unlike Item's paginated list.
export interface CollectionResponse<T> {
  status: number
  data: T[]
  meta: null
}

export interface EntityResponse<T> {
  status: number
  data: T
}
