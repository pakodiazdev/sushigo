import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabPanel } from '@/components/ui/tabs'
import { PunctualityConfigSection } from '@/components/settings/punctuality-config-section'
import { OvertimeLftTiersSection } from '@/components/settings/overtime-lft-tiers-section'
import { useAuthStore } from '@/stores/auth.store'

export const Route = createFileRoute('/configuracion')({
    beforeLoad: requirePermission('settings.manage'),
    component: ConfiguracionPage,
})

export function ConfiguracionPage() {
    const { can } = useAuthStore()

    const tabs = [
        can('punctuality.manage') && { id: 'puntualidad', label: 'Puntualidad' },
        can('overtime.manage') && { id: 'horas-extra', label: 'Horas Extra' },
    ].filter((tab): tab is { id: string; label: string } => tab !== false)

    const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '')

    return (
        <PageContainer>
            <PageHeader
                title="Configuración"
                description="Configura los parámetros del sistema"
            />

            <div className="mt-6 rounded-lg border border-border">
                <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

                <div className="p-6">
                    <TabPanel id="puntualidad" activeTab={activeTab}>
                        <PunctualityConfigSection />
                    </TabPanel>
                    <TabPanel id="horas-extra" activeTab={activeTab}>
                        <OvertimeLftTiersSection />
                    </TabPanel>
                </div>
            </div>
        </PageContainer>
    )
}
