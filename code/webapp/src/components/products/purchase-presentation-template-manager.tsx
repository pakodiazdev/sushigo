import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SlidePanel } from '@/components/ui/slide-panel'
import { CanAccess } from '@/components/auth'
import { useCanAccess } from '@/hooks/use-can-access'
import { usePurchasePresentationTemplates } from './use-purchase-presentation-templates'
import { PurchasePresentationTemplateForm } from './purchase-presentation-template-form'

interface PurchasePresentationTemplateManagerProps {
  isOpen: boolean
  onClose: () => void
}

const TITLE_BY_MODE = {
  list: 'Plantillas de presentación de compra',
  create: 'Nueva plantilla de presentación',
  edit: 'Editar plantilla de presentación',
} as const

/**
 * The secondary, authorized-only manager for reusable Purchase Presentation Templates (#427
 * Technical Task) — a standalone SlidePanel, independent from the Product/Variant/Presentation
 * panel instance (see this issue's PR Assumptions note on why it isn't nested a fourth level
 * deep). Reachable from the embedded Presentation list's "Manage templates" button.
 */
export function PurchasePresentationTemplateManager({
  isOpen,
  onClose,
}: Readonly<PurchasePresentationTemplateManagerProps>) {
  const {
    templates,
    isLoading,
    isError,
    mode,
    selectedTemplate,
    handleNewTemplate,
    handleTemplateClick,
    handleBackToList,
    handleTemplateSaved,
  } = usePurchasePresentationTemplates(isOpen)

  // The edit form's PUT route requires purchase_presentation_templates.manage — a viewer-only
  // role can legitimately open this manager (gated on .view above the New button already) but
  // would otherwise get a clickable row that always ends in a 403 on submit. Render the row as a
  // non-interactive summary instead, keeping the same fields visible without implying they're
  // editable.
  const canEditTemplate = useCanAccess({ permission: 'purchase_presentation_templates.manage' })

  return (
    <SlidePanel isOpen={isOpen} onClose={onClose} title={TITLE_BY_MODE[mode]}>
      {mode === 'list' && (
        <div className="flex h-full flex-col">
          <SlidePanel.Body className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Definiciones reutilizables de empaque comercial para variantes con una unidad base compatible.
              </p>
              <CanAccess permission="purchase_presentation_templates.manage">
                <Button type="button" size="sm" onClick={handleNewTemplate} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Nueva plantilla
                </Button>
              </CanAccess>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {!isLoading && isError && (
              <p className="text-sm text-muted-foreground">
                No fue posible cargar las plantillas. Vuelve a intentarlo.
              </p>
            )}

            {!isLoading && !isError && templates.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Aún no hay plantillas. Crea la primera para asignar presentaciones de compra.
              </p>
            )}

            {!isLoading && !isError && templates.length > 0 && (
              <ul className="space-y-2">
                {templates.map((template) => {
                  const rowContent = (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {template.code} · {template.package_type} · ×{template.base_unit_quantity}
                          {template.compatible_dimension_uom && ` ${template.compatible_dimension_uom.symbol}`}
                        </p>
                      </div>
                      <span
                        className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${template.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                          }`}
                      >
                        {template.is_active ? 'Activa' : 'Inactiva'}
                      </span>
                    </>
                  )

                  return (
                    <li key={template.id}>
                      {canEditTemplate ? (
                        <button
                          type="button"
                          onClick={() => handleTemplateClick(template)}
                          className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {rowContent}
                        </button>
                      ) : (
                        <div className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left">
                          {rowContent}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </SlidePanel.Body>
        </div>
      )}

      {mode === 'create' && (
        <PurchasePresentationTemplateForm onSuccess={handleTemplateSaved} onCancel={handleBackToList} />
      )}

      {mode === 'edit' && selectedTemplate && (
        <PurchasePresentationTemplateForm
          template={selectedTemplate}
          onSuccess={handleTemplateSaved}
          onCancel={handleBackToList}
        />
      )}
    </SlidePanel>
  )
}
