import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { usePunctualityConfigPage } from './use-punctuality-config-page'
import { BonusGroupsSection, PunctualityRangesFields } from './punctuality-config-shared'

export const Route = createFileRoute('/attendance/punctuality-config')({
  beforeLoad: requirePermission('punctuality.manage'),
  component: PunctualityConfigPage,
})

export function PunctualityConfigPage() {
  const { ranges, isLoading, form, fields, remove, onSubmit, addRow, isPending } =
    usePunctualityConfigPage()

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Configuración de Puntualidad" description="Cargando configuración..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Configuración de Puntualidad"
        description="Define los rangos de bono y los grupos de monto semanal."
      />

      <PunctualityRangesFields
        titleAs="h2"
        previewPrefix="Rangos actuales guardados:"
        ranges={ranges}
        form={form}
        fields={fields}
        remove={remove}
        onSubmit={onSubmit}
        addRow={addRow}
        isPending={isPending}
      />

      <BonusGroupsSection titleAs="h2" />
    </PageContainer>
  )
}
