import { useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { OpenSessionDialog } from '@/components/cash'
import { Plus } from 'lucide-react'

export function TestOpenSessionPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSuccess = (sessionId: string) => {
    console.log('Sesión creada con ID:', sessionId)
    alert(`¡Sesión abierta exitosamente! ID: ${sessionId}`)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Test - Abrir Sesión de Caja"
        description="Página de prueba para el componente OpenSessionDialog"
      >
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Abrir Sesión
        </Button>
      </PageHeader>

      <div className="mt-6">
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Haz clic en "Abrir Sesión" para probar el componente
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Usando Branch ID: 1 (hardcoded para testing)
          </p>
        </div>
      </div>

      <OpenSessionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleSuccess}
        branchId={1}
      />
    </PageContainer>
  )
}
