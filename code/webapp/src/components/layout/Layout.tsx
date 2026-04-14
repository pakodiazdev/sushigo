import { Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Loader2 } from 'lucide-react';

export default function Layout() {
    const { isAuthenticated, isLoading, initializeAuth, user, _hasHydrated } = useAuthStore();
    const router = useRouter();
    const routerState = useRouterState();
    const currentPath = routerState.location.pathname;

    // Initialize auth after hydration completes
    useEffect(() => {
        if (_hasHydrated) {
            initializeAuth();
        }
    }, [_hasHydrated, initializeAuth]);

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/logout', '/reset-password', '/forgot-password', '/unauthorized'];
    const isPublicRoute = publicRoutes.includes(currentPath);

    // Handle redirections - only after loading is complete
    useEffect(() => {
        // Don't redirect while loading
        if (isLoading) {
            return;
        }

        // Only redirect if we need to change pages
        const shouldRedirectToHome = isAuthenticated && user && currentPath === '/login';
        const shouldRedirectToLogin = !isAuthenticated && !isPublicRoute;

        if (shouldRedirectToHome) {
            router.navigate({ to: '/' });
            return;
        }

        if (shouldRedirectToLogin) {
            router.navigate({ to: '/login' });
            return;
        }
    }, [isAuthenticated, currentPath, user, router, isLoading]);

    // Show loading spinner while checking auth (but not on login/logout pages)
    // Login page handles its own loading state to preserve form data
    if (isLoading && !isPublicRoute) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30">
                <Loader2 className="h-12 w-12 animate-spin text-sushigo-navy" />
            </div>
        );
    }

    // Don't show sidebar/header on login and logout pages
    if (isPublicRoute) {
        return <Outlet />;
    }

    // Show main layout only if authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />

                <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gradient-to-br from-sushigo-cream/30 via-background to-sushigo-navy/5">
                    {/* Breadcrumbs - Only show if not on home page */}
                    {currentPath !== '/' && (
                        <div className="mb-4">
                            <Breadcrumbs />
                        </div>
                    )}

                    <Outlet />
                </main>
            </div>
        </div>
    );
}
