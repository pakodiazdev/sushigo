import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField, Textarea, Checkbox, Select } from '@/components/ui/form-fields'
import { SlidePanel } from '@/components/ui/slide-panel'
import { MediaGalleryUploader } from '@/components/media'
import type { Dish, DishExtraGroup, DishExtraSelectionType } from '@/types/dishes'
import { useDishForm } from './use-dish-form'

const extraGroupQuickAddSchema = z.object({
  // .trim() runs before .min() — a whitespace-only name (length > 0) is normalized to
  // empty first and correctly rejected here, matching the same fix on the category and
  // dish name fields.
  name: z.string().trim().min(1, 'Name is required'),
  selectionType: z.enum(['SINGLE', 'MULTIPLE']),
  isRequired: z.boolean(),
})
type ExtraGroupQuickAddValues = z.infer<typeof extraGroupQuickAddSchema>

const extraOptionQuickAddSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  priceDelta: z.number().min(0, 'Price cannot be negative'),
})
type ExtraOptionQuickAddValues = z.infer<typeof extraOptionQuickAddSchema>

interface DishFormProps {
  dish?: Dish | null
  onSuccess: () => void
  onCancel: () => void
}

export function DishForm({ dish, onSuccess, onCancel }: Readonly<DishFormProps>) {
  const {
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
  } = useDishForm({ dish, onSuccess })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      <SlidePanel.Body className="flex-1 space-y-6">
        <FormField label="Category" required error={allErrors.dish_category_id}>
          <Select {...register('dish_category_id')} error={!!allErrors.dish_category_id}>
            <option value="">Select a category…</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Dish Name" required error={allErrors.name}>
          <Input
            {...register('name')}
            placeholder="e.g., California Roll"
            error={!!allErrors.name}
          />
        </FormField>

        <FormField label="Description">
          <Textarea {...register('description')} rows={3} placeholder="Ingredients, notes…" />
        </FormField>

        <FormField label="Base Price" required error={allErrors.base_price}>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...register('base_price', { valueAsNumber: true })}
            error={!!allErrors.base_price}
          />
        </FormField>

        {isEditing ? (
          // Uploader is create-only — there is still no GET-gallery-assets endpoint, so
          // showing it here (with no way to see what's about to be replaced) risks silently
          // detaching the dish's existing photo. Mirrors ItemForm's identical restriction.
          <FormField label="Photo">
            <p className="text-sm text-muted-foreground">
              Photo management for existing dishes isn&apos;t available yet — this form has no
              way to show the photo this dish already has, so uploading here would replace it
              without warning. This will be enabled once the backend can list a gallery&apos;s
              existing assets.
            </p>
          </FormField>
        ) : (
          <MediaGalleryUploader
            disabled={isSubmitting}
            onChange={(galleryId, ownerToken) => {
              setValue('media_gallery_id', galleryId)
              setValue('owner_token', ownerToken)
            }}
            onBusyChange={setIsUploaderBusy}
          />
        )}

        <Checkbox
          id="dish-is-active"
          checked={isActive}
          onChange={(e) => setValue('is_active', e.target.checked)}
          label="Active"
        />

        <div className="space-y-3 rounded-lg border border-border p-4">
          <h4 className="text-sm font-medium text-foreground">Extras</h4>
          {isEditing && dish ? (
            <ExtrasEditor
              groups={extraGroups}
              disabled={isMutatingExtras}
              onAddGroup={addExtraGroup}
              onRemoveGroup={removeExtraGroup}
              onAddOption={addExtraOption}
              onRemoveOption={removeExtraOption}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Extras (sauce choices, spice levels, add-ons…) can only be configured once the
              dish has been saved — save it first, then reopen it to edit to add extra groups
              and options.
            </p>
          )}
        </div>
      </SlidePanel.Body>

      <SlidePanel.Footer>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitDisabled}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? 'Update' : 'Create'} Dish
          </Button>
        </div>
      </SlidePanel.Footer>
    </form>
  )
}

interface ExtrasEditorProps {
  groups: DishExtraGroup[]
  disabled: boolean
  onAddGroup: (params: { name: string; selectionType: DishExtraSelectionType; isRequired: boolean }) => void
  onRemoveGroup: (groupId: string) => void
  onAddOption: (groupId: string, params: { name: string; priceDelta: number }) => void
  onRemoveOption: (groupId: string, optionId: string) => void
}

function ExtrasEditor({
  groups,
  disabled,
  onAddGroup,
  onRemoveGroup,
  onAddOption,
  onRemoveOption,
}: Readonly<ExtrasEditorProps>) {
  // A quick-add widget, not the entity's own submission form (that's DishForm's outer
  // <form>) — react-hook-form is used here without a nested <form> element (nesting a
  // second <form> inside DishForm's would be invalid HTML), calling handleSubmit's
  // returned validator directly from the "+" button's onClick instead.
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtraGroupQuickAddValues>({
    resolver: zodResolver(extraGroupQuickAddSchema),
    defaultValues: { name: '', selectionType: 'SINGLE', isRequired: false },
  })

  const submitNewGroup = handleSubmit((data) => {
    onAddGroup(data)
    reset()
  })

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <ExtraGroupRow
          key={group.id}
          group={group}
          disabled={disabled}
          onRemoveGroup={() => onRemoveGroup(group.id)}
          onAddOption={(params) => onAddOption(group.id, params)}
          onRemoveOption={(optionId) => onRemoveOption(group.id, optionId)}
        />
      ))}

      <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/50 p-3">
        <div className="flex-1 min-w-[140px]">
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="new-extra-group-name">
            New extra group
          </label>
          <Input
            id="new-extra-group-name"
            {...register('name')}
            placeholder="e.g., Elige tu salsa"
            disabled={disabled}
            error={!!errors.name}
            // The Input is a native <input> (an interactive element, unlike the row's wrapping
            // <div>) so attaching the handler here keeps SonarCloud's typescript:S6848 happy.
            // These fields sit inside DishForm's own outer <form> (a second nested <form> isn't
            // valid HTML — see submitNewGroup's own comment). Without this, pressing Enter here
            // falls through to the browser's default "submit the nearest form" behavior, which
            // saves and closes the *whole dish*, not just this row's add action.
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submitNewGroup()
              }
            }}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
        </div>
        <Select {...register('selectionType')} disabled={disabled} className="w-auto">
          <option value="SINGLE">Single choice</option>
          <option value="MULTIPLE">Multiple choice</option>
        </Select>
        <Checkbox id="new-extra-group-required" {...register('isRequired')} label="Required" disabled={disabled} />
        <Button type="button" variant="outline" size="sm" onClick={submitNewGroup} disabled={disabled} aria-label="Add extra group">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface ExtraGroupRowProps {
  group: DishExtraGroup
  disabled: boolean
  onRemoveGroup: () => void
  onAddOption: (params: { name: string; priceDelta: number }) => void
  onRemoveOption: (optionId: string) => void
}

function ExtraGroupRow({ group, disabled, onRemoveGroup, onAddOption, onRemoveOption }: Readonly<ExtraGroupRowProps>) {
  // Same quick-add pattern as ExtrasEditor's new-group widget above — see its comment.
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExtraOptionQuickAddValues>({
    resolver: zodResolver(extraOptionQuickAddSchema),
    defaultValues: { name: '', priceDelta: 0 },
  })

  const submitNewOption = handleSubmit((data) => {
    onAddOption(data)
    reset()
  })

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-foreground">{group.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {group.selection_type === 'SINGLE' ? 'Single choice' : 'Multiple choice'} ·{' '}
            {group.is_required ? 'Required' : 'Optional'}
          </span>
        </div>
        <button
          type="button"
          aria-label="Remove extra group"
          disabled={disabled}
          onClick={onRemoveGroup}
        >
          <Trash2 className="h-4 w-4 text-red-600" />
        </button>
      </div>

      {group.options && group.options.length > 0 && (
        <ul className="mt-2 space-y-1">
          {group.options.map((option) => (
            <li key={option.id} className="flex items-center justify-between text-sm">
              <span>
                {option.name}
                {option.price_delta > 0 && (
                  <span className="ml-1 text-muted-foreground">+${option.price_delta.toFixed(2)}</span>
                )}
              </span>
              <button
                type="button"
                aria-label="Remove option"
                disabled={disabled}
                onClick={() => onRemoveOption(option.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-end gap-2">
        <div className="flex-1">
          <Input
            {...register('name')}
            placeholder="Option name"
            disabled={disabled}
            error={!!errors.name}
            // Attached to the native <input> rather than the row's wrapping <div> — an
            // onKeyDown on a non-interactive element trips typescript:S6848. Same reasoning
            // as the new-extra-group row above — without this, Enter here falls through to
            // submitting/closing the whole dish form instead of just adding the option.
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submitNewOption()
              }
            }}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name.message}</p>}
        </div>
        <div className="w-24">
          <Input
            type="number"
            step="0.01"
            {...register('priceDelta', {
              // Not valueAsNumber: true — HTMLInputElement.valueAsNumber reads an emptied
              // number input as NaN, which zod's number type rejects outright with no
              // rendered error (nothing here surfaced one), silently blocking the add. An
              // empty price field specifically means "no extra charge" and coerces to 0 —
              // genuinely non-numeric input (e.g. pasted text) is left as NaN instead of
              // also silently becoming 0, so zod's number check still catches and reports it.
              setValueAs: (value: string) => (value === '' ? 0 : Number(value)),
            })}
            placeholder="+$"
            disabled={disabled}
            error={!!errors.priceDelta}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                submitNewOption()
              }
            }}
          />
          {errors.priceDelta && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.priceDelta.message}</p>
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={submitNewOption} disabled={disabled} aria-label="Add option">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
