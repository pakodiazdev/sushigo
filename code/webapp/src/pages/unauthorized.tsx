import { createFileRoute, Link } from '@tanstack/react-router'
import { Lock } from 'lucide-react'

export const Route = createFileRoute('/unauthorized')({
  component: UnauthorizedPage,
})

function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <Lock className="h-12 w-12 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-sushigo-navy">403</h1>
          <h2 className="text-xl font-semibold text-foreground">Sin acceso</h2>
          <p className="text-muted-foreground">
            No tienes permiso para ver esta página. Contacta a tu administrador
            si crees que esto es un error.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  )
}
