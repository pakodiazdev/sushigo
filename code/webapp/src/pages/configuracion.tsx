import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { requirePermission } from '@/lib/route-guards'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabPanel } from '@/components/ui/tabs'
import { PunctualityConfigSection } from '@/components/settings/punctuality-config-section'

export const Route = createFileRoute('/configuracion')({
    beforeLoad: requirePermission('settings.manage'),
    component: ConfiguracionPage,
})

const TABS = [
    { id: 'puntualidad', label: 'Puntualidad' },
]

export function ConfiguracionPage() {
    const [activeTab, setActiveTab] = useState('puntualidad')

    return (
        <PageContainer>
            <PageHeader
                title="Configuración"
                description="Configura los parámetros del sistema"
            />

            <div className="mt-6 rounded-lg border border-border">
                <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

                <div className="p-6">
                    <TabPanel id="puntualidad" activeTab={activeTab}>
                        <PunctualityConfigSection />
                    </TabPanel>
                </div>
            </div>
        </PageContainer>
    )
}
