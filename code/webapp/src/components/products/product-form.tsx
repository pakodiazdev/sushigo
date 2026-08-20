import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { MediaGalleryUploader } from '@/components/media'
import type { Product } from '@/types/inventory'
import { useProductForm } from './use-product-form'

interface ProductFormProps {
  product?: Product | null
  onSuccess: (product: Product) => void
  onCancel: () => void
}

export function ProductForm({ product, onSuccess, onCancel }: Readonly<ProductFormProps>) {
  const isEditing = !!product
  const {
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
  } = useProductForm({ product, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField label="Product Name" required error={allErrors.name}>
          <Input
            {...register('name')}
            placeholder="e.g., Coca-Cola Original 600 ml"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField label="Category" required error={allErrors.inventory_category_id}>
          <Select {...register('inventory_category_id')} error={!!allErrors.inventory_category_id}>
            <option value="">Select a category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Brand" error={allErrors.brand_id}>
          <Select {...register('brand_id')} error={!!allErrors.brand_id}>
            <option value="">No brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Description">
          <Textarea {...register('description')} rows={3} placeholder="Optional notes…" />
        </FormField>

        {isEditing ? (
          // Uploader is create-only — there is still no GET-gallery-assets endpoint, so
          // showing it here (with no way to see what's about to be replaced) risks silently
          // detaching the product's existing photo. Mirrors ItemForm/DishForm's identical
          // restriction.
          <FormField label="Photos">
            <p className="text-sm text-muted-foreground">
              Photo management for existing products isn&apos;t available yet — this form has
              no way to show the photos this product already has, so uploading here would
              replace them without warning. This will be enabled once the backend can list a
              product&apos;s existing gallery.
            </p>
          </FormField>
        ) : (
          // No outer FormField here — MediaGalleryUploader renders its own "Photos" label
          <MediaGalleryUploader
            context="item"
            disabled={isSubmitting}
            onChange={(galleryId, ownerToken) => {
              setValue('media_gallery_id', galleryId)
              setValue('owner_token', ownerToken)
            }}
            onBusyChange={setIsUploaderBusy}
          />
        )}

        <Checkbox
          id="product-is-active"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          label="Active"
        />
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {/* isSubmitting only, not isSubmitDisabled: the button is also disabled while the
                uploader has an unresolved error, and nothing is actually in flight then. */}
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Product
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
