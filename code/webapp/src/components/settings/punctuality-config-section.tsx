import { usePunctualityConfigPage } from '@/pages/attendance/use-punctuality-config-page'
import { BonusGroupsSection, PunctualityRangesFields } from '@/pages/attendance/punctuality-config-shared'

export function PunctualityConfigSection() {
    const { ranges, isLoading, form, fields, remove, onSubmit, addRow, isPending } =
        usePunctualityConfigPage()

    if (isLoading) {
        return <p className="text-sm text-muted-foreground py-4">Cargando configuración...</p>
    }

    return (
        <div className="space-y-0">
            <PunctualityRangesFields
                titleAs="h3"
                previewPrefix="Rangos actuales:"
                ranges={ranges}
                form={form}
                fields={fields}
                remove={remove}
                onSubmit={onSubmit}
                addRow={addRow}
                isPending={isPending}
            />

            <BonusGroupsSection titleAs="h3" />
        </div>
    )
}
