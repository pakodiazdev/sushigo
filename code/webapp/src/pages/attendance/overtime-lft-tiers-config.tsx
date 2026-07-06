import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { useOvertimeLftTiersConfigPage } from './use-overtime-lft-tiers-config-page'
import { OvertimeLftTiersFields } from './overtime-lft-tiers-shared'

export const Route = createFileRoute('/attendance/overtime-lft-tiers-config')({
  beforeLoad: requirePermission('overtime.manage'),
  component: OvertimeLftTiersConfigPage,
})

export function OvertimeLftTiersConfigPage() {
  const { tiers, isLoading, form, fields, remove, onSubmit, addRow, isPending } =
    useOvertimeLftTiersConfigPage()

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Tramos LFT de Horas Extra" description="Cargando configuración..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Tramos LFT de Horas Extra"
        description="Define el factor de pago aplicable según las horas extra acumuladas en la semana."
      />

      <OvertimeLftTiersFields
        titleAs="h2"
        tiers={tiers}
        form={form}
        fields={fields}
        remove={remove}
        onSubmit={onSubmit}
        addRow={addRow}
        isPending={isPending}
      />
    </PageContainer>
  )
}
