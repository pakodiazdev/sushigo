import type { Product } from '@/types/inventory'

/**
 * A Product's own `is_active` flag can stay `true` while the backend still excludes
 * it from the "active" filter — e.g. its assigned category is inactive or deleted
 * (see ProductResource::warnings() / categoryWarningMessage() on the API). The
 * backend surfaces that mismatch as a `warnings` entry rather than a dedicated
 * boolean field, so treat any warning as "not effectively active" until one exists.
 */
export function isEffectivelyActive(product: Pick<Product, 'is_active' | 'warnings'>): boolean {
  return product.is_active && product.warnings.length === 0
}
