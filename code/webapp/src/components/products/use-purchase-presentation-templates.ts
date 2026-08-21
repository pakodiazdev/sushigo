import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/toast-context'
import { getApiErrorMessage } from '@/lib/api-error'
import { inventoryQueryKeys } from '@/hooks/use-inventory-queries'
import { purchasePresentationTemplateApi } from '@/services/inventory-api'
import type { PurchasePresentationTemplate } from '@/types/inventory'

/**
 * Panel state for the secondary Purchase Presentation Template manager (#427) — a standalone
 * SlidePanel reachable from the embedded Presentation list, not a fourth level nested inside
 * the Product/Variant/Presentation panel (see this issue's PR Assumptions note). Same
 * list/create/edit shape as the other catalog managers in this file family.
 */
export type PurchasePresentationTemplateManagerMode = 'list' | 'create' | 'edit'

export function usePurchasePresentationTemplates(isOpen: boolean) {
  const queryClient = useQueryClient()
  const { showError } = useToast()

  const [mode, setMode] = useState<PurchasePresentationTemplateManagerMode>('list')
  const [selectedTemplate, setSelectedTemplate] = useState<PurchasePresentationTemplate | null>(null)

  const wasOpenRef = useRef(false)
  useLayoutEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setMode('list')
      setSelectedTemplate(null)
    }
    wasOpenRef.current = isOpen
  }, [isOpen])

  const templatesQuery = useQuery({
    queryKey: ['purchase-presentation-templates', 'manager'],
    // Unfiltered — an admin managing templates needs to see (and reactivate) inactive ones
    // too, unlike usePurchasePresentationTemplatesSelect's active-only assignment picker.
    queryFn: () => purchasePresentationTemplateApi.list(),
    enabled: isOpen,
  })
  const templates = templatesQuery.data?.data.data ?? []

  useEffect(() => {
    if (templatesQuery.isError) {
      showError(getApiErrorMessage(templatesQuery.error, 'Failed to load purchase presentation templates'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templatesQuery.isError])

  const invalidateTemplates = () => {
    // Invalidate both this manager's own key and usePurchasePresentationTemplatesSelect's
    // key (the "Assign template" picker in purchase-presentation-form.tsx) — they don't share a
    // key prefix, so a create/reactivate here would otherwise leave the picker serving its
    // 5-minute-stale cache (App.tsx's default staleTime) until it expires or the page reloads.
    queryClient.invalidateQueries({ queryKey: ['purchase-presentation-templates'] })
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.purchasePresentationTemplates() })
  }

  const handleNewTemplate = () => {
    setSelectedTemplate(null)
    setMode('create')
  }

  const handleTemplateClick = (template: PurchasePresentationTemplate) => {
    setSelectedTemplate(template)
    setMode('edit')
  }

  const handleBackToList = () => {
    setSelectedTemplate(null)
    setMode('list')
  }

  const handleTemplateSaved = () => {
    invalidateTemplates()
    setSelectedTemplate(null)
    setMode('list')
  }

  return {
    templates,
    isLoading: templatesQuery.isLoading,
    isError: templatesQuery.isError,
    mode,
    selectedTemplate,
    handleNewTemplate,
    handleTemplateClick,
    handleBackToList,
    handleTemplateSaved,
  }
}
