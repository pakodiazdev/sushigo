import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { OpenSessionDialog } from '@/components/cash'
import { Plus, DollarSign } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/cash/open-session')({
    component: OpenSessionPage,
})

function OpenSessionPage() {
    const { currentBranch } = useAuth()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleSuccess = () => {
        // Session opened successfully
        alert('¡Sesión de caja abierta exitosamente!')
        setIsDialogOpen(false)
    }

    const handleOpenDialog = () => {
        setIsDialogOpen(true)
    }

    return (
        <PageContainer>
            <PageHeader
                title="Abrir Sesión de Caja"
                description="Inicia una nueva sesión de caja para comenzar las operaciones del día"
            >
                <Button onClick={handleOpenDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    Abrir Nueva Sesión
                </Button>
            </PageHeader>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Info Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-green-600" />
                            ¿Qué es una sesión de caja?
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>
                            Una sesión de caja es el período operativo durante el cual se
                            registran todas las transacciones de entrada y salida de efectivo.
                        </p>
                        <p className="font-medium text-foreground">
                            Debes abrir una sesión antes de comenzar a registrar ventas o gastos.
                        </p>
                    </CardContent>
                </Card>

                {/* Current Branch Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sucursal Actual</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {currentBranch ? (
                            <div className="space-y-1">
                                <p className="text-lg font-semibold">{currentBranch.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Código: {currentBranch.code}
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No hay sucursal seleccionada
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Instructions Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Instrucciones</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Selecciona la caja registradora a usar</li>
                            <li>Confirma la fecha de operación</li>
                            <li>Ingresa el fondo inicial (opcional)</li>
                            <li>Haz clic en "Abrir Sesión"</li>
                        </ol>
                    </CardContent>
                </Card>
            </div>

            <OpenSessionDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSuccess={handleSuccess}
                branchId={currentBranch?.id}
            />
        </PageContainer>
    )
}
