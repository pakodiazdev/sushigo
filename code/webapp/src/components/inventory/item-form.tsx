import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { useCreateUpdateMutation } from '@/hooks/use-form-mutation'
import { itemApi } from '@/services/inventory-api'
import { MediaGalleryUploader } from '@/components/media'
import type { Item } from '@/types/inventory'

// PRODUCTO is deliberately excluded — Products are created exclusively via the
// /inventory/products SlidePanel (#423); this quick-item form is INSUMO/ACTIVO only (#429).
const itemSchema = z.object({
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

type ItemFormValues = z.infer<typeof itemSchema>

interface ItemFormProps {
  item?: Item | null
  onSuccess: () => void
  onCancel: () => void
}

export function ItemForm({ item, onSuccess, onCancel }: Readonly<ItemFormProps>) {
  const isEditing = !!item
  // Blocks submit while the uploader has an upload/remove/reorder in flight, or while a failed
  // upload's error is still unacknowledged — otherwise either a submit that races an in-flight
  // upload ships the item without the photo it just finished uploading, or a submit that follows
  // a failed upload (e.g. missing media.upload permission) silently ships the item without the
  // photo the user tried to add and without any indication it didn't attach.
  const [isUploaderBusy, setIsUploaderBusy] = useState(false)

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
      // PUT /items/{id} ignores `type` entirely (it's not in UpdateItemRequest's rules), so this
      // only needs to satisfy the narrower create-only union — a legacy PRODUCTO item being
      // edited here simply falls back to INSUMO, which has no effect on the update request sent.
      type: item?.type === 'ACTIVO' ? 'ACTIVO' : 'INSUMO',
      is_stocked: item?.is_stocked ?? true,
      is_perishable: item?.is_perishable ?? false,
      is_active: item?.is_active ?? true,
      media_gallery_id: undefined,
      owner_token: undefined,
    },
  })

  const { execute, validationErrors, isPending } = useCreateUpdateMutation({
    createFn: (data: ItemFormValues) => itemApi.create(data),
    updateFn: (data: ItemFormValues) => itemApi.update(item!.id, data),
    entityName: 'Item',
    isEditing,
    onSuccess,
  })

  // Merge client and server validation errors
  const allErrors = {
    sku: errors.sku?.message || validationErrors.sku,
    name: errors.name?.message || validationErrors.name,
  }

  const isSubmitting = isPending
  // Cancel stays enabled while a photo is uploading — matching the accepted design that
  // cancelling mid-upload leaves the file in an orphaned gallery, swept up later by
  // media:cleanup-orphans (doc/architecture/media/media-architecture.en.md §7.2) — only the
  // submit path needs to wait, so it doesn't ship the item without the photo.
  const isSubmitDisabled = isSubmitting || isUploaderBusy

  const onSubmit = async (data: ItemFormValues) => {
    // Guard the handler itself, not just the submit button's disabled attribute — a submit
    // triggered by pressing Enter in a text field (or any other non-click path) dispatches the
    // form's submit event directly and would otherwise still reach execute() while busy.
    if (isSubmitDisabled) {
      return
    }
    await execute(data)
  }

  // Watch values for controlled checkboxes
  const isStocked = watch('is_stocked')
  const isPerishable = watch('is_perishable')
  const isActive = watch('is_active')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="SKU (Stock Keeping Unit)"
          required
          error={allErrors.sku}
          hint="Unique identifier for this item"
        >
          <Input
            {...register('sku', {
              onChange: (e) => setValue('sku', e.target.value.toUpperCase()),
            })}
            placeholder="e.g., SAL-001"
            error={!!allErrors.sku}
            disabled={isEditing}
          />
        </FormField>

        <FormField
          label="Item Name"
          required
          error={allErrors.name}
        >
          <Input
            {...register('name')}
            placeholder="e.g., Fresh Salmon"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            {...register('description')}
            rows={3}
            placeholder="Additional description or notes"
          />
        </FormField>

        {isEditing ? (
          // The uploader is create-only: it always starts from an empty gallery (there's no
          // GET endpoint yet to load an item's existing photos into it — see PR #407's
          // Assumptions), so uploading here while editing would attach a brand-new gallery and
          // detach the item's current one. That old gallery then has zero attachments, making
          // it an orphan that media:cleanup-orphans permanently deletes after its grace period —
          // silent, unrecoverable loss of every photo the item already had. Showing the uploader
          // here (with no way to see what's about to be replaced) is not a risk worth taking for
          // a real restaurant's menu photos; hide it until the backend can list a gallery's
          // existing assets.
          <FormField label="Photos">
            <p className="text-sm text-muted-foreground">
              Photo management for existing items isn&apos;t available yet — this form has no way
              to show the photos this item already has, so uploading here would replace them
              without warning. This will be enabled once the backend can list an item&apos;s
              existing gallery.
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

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-medium text-gray-900">Item Properties</h4>

          <Checkbox
            checked={isStocked}
            onChange={(e) => setValue('is_stocked', e.target.checked)}
            label="Track inventory for this item"
          />

          <Checkbox
            checked={isPerishable}
            onChange={(e) => setValue('is_perishable', e.target.checked)}
            label="Perishable (has expiration date)"
          />

          <Checkbox
            checked={isActive}
            onChange={(e) => setValue('is_active', e.target.checked)}
            label="Active"
          />
        </div>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {/* isSubmitting only, not isSubmitDisabled: the button is also disabled while the
                uploader has an unresolved error (e.g. a rejected file type), and nothing is
                actually in flight then — spinning in that state falsely tells the user the item
                is being saved when the real next step is dismissing the error banner. */}
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Item
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}
