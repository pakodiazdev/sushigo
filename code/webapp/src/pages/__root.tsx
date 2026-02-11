import { createRootRoute, useRouterState, Link } from '@tanstack/react-router'
import Layout from '@/components/layout/Layout'

function RootNotFound() {
    const state = useRouterState()
    const pathname = state.location.pathname

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-sushigo-navy">404</h1>
                <p className="text-lg text-muted-foreground">
                    La página <code className="bg-muted px-2 py-1 rounded">{pathname}</code> no existe.
                </p>
                <Link to="/login" className="inline-block px-6 py-2 bg-sushigo-navy text-white rounded-md hover:bg-sushigo-navy/90">
                    Ir al inicio
                </Link>
            </div>
        </div>
    )
}

export const Route = createRootRoute({
    component: Layout,
    notFoundComponent: RootNotFound,
})
