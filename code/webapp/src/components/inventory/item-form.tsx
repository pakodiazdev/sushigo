import { Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { MediaGalleryUploader } from '@/components/media'
import type { Item } from '@/types/inventory'
import { useItemForm } from './use-item-form'

interface ItemFormProps {
  item?: Item | null
  onSuccess: () => void
  onCancel: () => void
}

export function ItemForm({ item, onSuccess, onCancel }: Readonly<ItemFormProps>) {
  const {
    isEditing,
    register,
    skuField,
    handleSubmit,
    setValue,
    onSubmit,
    allErrors,
    isStocked,
    isPerishable,
    isActive,
    isSubmitting,
    isSubmitDisabled,
    setIsUploaderBusy,
    isResolvingSuggestion,
    isSuggestionLoading,
    isRefreshingSku,
    suggestionFailed,
    handleRegenerateSku,
    collision,
    canApplySuggestedSku,
    applySuggestedSku,
  } = useItemForm({ item, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField
          label="SKU (Stock Keeping Unit)"
          required
          error={allErrors.sku}
          hint={
            isEditing
              ? 'Unique identifier for this item'
              : 'Sugerencia automática a partir del nombre; puedes modificarla.'
          }
        >
          <div className="flex items-center gap-2">
            <Input
              {...skuField}
              placeholder="e.g., SAL-001"
              error={!!allErrors.sku}
              disabled={isEditing}
              className="flex-1"
            />
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Regenerar SKU"
                title="Regenerar SKU"
                disabled={isSuggestionLoading || isRefreshingSku}
                onClick={handleRegenerateSku}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshingSku ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>

          {!isEditing && isResolvingSuggestion && (
            <p className="mt-1 text-xs text-muted-foreground">Generando sugerencia…</p>
          )}
          {!isEditing && suggestionFailed && (
            <p className="mt-1 text-xs text-amber-600">
              No se pudo generar una sugerencia; escribe un SKU manualmente.
            </p>
          )}
          {!isEditing && collision && (
            <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800">
              <p>
                ⚠ El SKU <strong>{collision.rejectedSku}</strong> acaba de ser utilizado. Te
                proponemos <strong>{collision.suggestedSku}</strong>.
              </p>
              {canApplySuggestedSku && (
                <button
                  type="button"
                  className="mt-1 font-medium underline"
                  onClick={applySuggestedSku}
                >
                  Usar {collision.suggestedSku}
                </button>
              )}
            </div>
          )}
        </FormField>

        <FormField label="Item Name" required error={allErrors.name}>
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
