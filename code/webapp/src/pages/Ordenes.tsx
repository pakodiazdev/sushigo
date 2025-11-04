import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const Route = createFileRoute('/Ordenes')({
    component: OrdenesPage,
});

export function OrdenesPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Órdenes"
                description="Gestiona todas las órdenes de tus clientes"
            >
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Órden
                </Button>
            </PageHeader>

            <div className="mt-6 p-8 text-center border-2 border-dashed rounded-lg border-sushigo-cream/50">
                <p className="text-muted-foreground">Página en construcción</p>
            </div>
        </PageContainer>
    );
}
