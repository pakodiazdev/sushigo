import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const Route = createFileRoute('/Productos')({
    component: ProductosPage,
});

export function ProductosPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Productos"
                description="Gestiona tu catálogo de productos"
            >
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Producto
                </Button>
            </PageHeader>

            <div className="mt-6 p-8 text-center border-2 border-dashed rounded-lg border-sushigo-cream/50">
                <p className="text-muted-foreground">Página en construcción</p>
            </div>
        </PageContainer>
    );
}
