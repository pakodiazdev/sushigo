import { createFileRoute } from '@tanstack/react-router';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';

export const Route = createFileRoute('/Reportes')({
    component: ReportesPage,
});

export function ReportesPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Reportes"
                description="Visualiza estadísticas y reportes de ventas"
            >
                <Button variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" />
                    Exportar
                </Button>
            </PageHeader>

            <div className="mt-6 p-8 text-center border-2 border-dashed rounded-lg border-sushigo-cream/50">
                <p className="text-muted-foreground">Página en construcción</p>
            </div>
        </PageContainer>
    );
}
