import { useOvertimeLftTiersConfigPage } from '@/pages/attendance/use-overtime-lft-tiers-config-page'
import { OvertimeLftTiersFields } from '@/pages/attendance/overtime-lft-tiers-shared'

export function OvertimeLftTiersSection() {
    const { tiers, isLoading, form, fields, remove, onSubmit, addRow, isPending } =
        useOvertimeLftTiersConfigPage()

    if (isLoading) {
        return <p className="text-sm text-muted-foreground py-4">Cargando configuración...</p>
    }

    return (
        <OvertimeLftTiersFields
            titleAs="h3"
            tiers={tiers}
            form={form}
            fields={fields}
            remove={remove}
            onSubmit={onSubmit}
            addRow={addRow}
            isPending={isPending}
        />
    )
}
