import { createFileRoute } from '@tanstack/react-router';
import { requireRole } from '@/lib/route-guards';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

export const Route = createFileRoute('/Configuracion')({
    beforeLoad: requireRole('super-admin'),
    component: ConfiguracionPage,
});

export function ConfiguracionPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Configuración"
                description="Configura los parámetros del sistema"
            >
                <Button className="gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                </Button>
            </PageHeader>

            <div className="mt-6 p-8 text-center border-2 border-dashed rounded-lg border-sushigo-cream/50">
                <p className="text-muted-foreground">Página en construcción</p>
            </div>
        </PageContainer>
    );
}
