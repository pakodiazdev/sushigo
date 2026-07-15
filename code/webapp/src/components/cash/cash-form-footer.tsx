import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField, Checkbox } from '@/components/ui/form-fields'

export interface CashFormFooterProps {
    isActive: boolean
    onActiveChange: (checked: boolean) => void
    onCancel: () => void
    isLoading: boolean
    isEditing: boolean
}

/** Must be rendered inside a `<form>` — the submit button relies on the ancestor form's onSubmit. */
export function CashFormFooter({ isActive, onActiveChange, onCancel, isLoading, isEditing }: Readonly<CashFormFooterProps>) {
    return (
        <>
            <FormField label="Estado">
                <Checkbox
                    checked={isActive}
                    onChange={(e) => onActiveChange(e.target.checked)}
                    label="Activa"
                />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                    type="button"
                    variant="neutral"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    variant="info"
                    disabled={isLoading}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Actualizar' : 'Crear'}
                </Button>
            </div>
        </>
    )
}
