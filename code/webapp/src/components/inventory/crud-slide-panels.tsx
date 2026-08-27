import type { ReactNode } from 'react'
import { SlidePanel } from '@/components/ui/slide-panel'

interface CrudSlidePanelsProps {
  detailsTitle: string
  isDetailsOpen: boolean
  onDetailsClose: () => void
  detailsContent: ReactNode
  formTitle: string
  isFormOpen: boolean
  onFormClose: () => void
  formContent: ReactNode
}

/**
 * The details + create/edit `SlidePanel` pair shared by every simple Inventory
 * list screen (Insumos, Variantes, Ubicaciones). Each screen keeps ownership of
 * its own selection state and mutations; this only removes the identical panel
 * scaffolding they all rendered inline.
 */
export function CrudSlidePanels({
  detailsTitle,
  isDetailsOpen,
  onDetailsClose,
  detailsContent,
  formTitle,
  isFormOpen,
  onFormClose,
  formContent,
}: Readonly<CrudSlidePanelsProps>) {
  return (
    <>
      <SlidePanel isOpen={isDetailsOpen} onClose={onDetailsClose} title={detailsTitle}>
        {detailsContent}
      </SlidePanel>

      <SlidePanel isOpen={isFormOpen} onClose={onFormClose} title={formTitle}>
        {formContent}
      </SlidePanel>
    </>
  )
}
