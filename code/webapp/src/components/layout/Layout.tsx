import { Outlet, useRouter, useRouterState } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth.store';
import { useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Loader2 } from 'lucide-react';

export default function Layout() {
    const { isAuthenticated, isLoading, initializeAuth, user, token } = useAuthStore();
    const router = useRouter();
    const routerState = useRouterState();
    const currentPath = routerState.location.pathname;

    // Initialize auth only once on mount
    useEffect(() => {
        console.log('[Layout] Initializing auth...');
        initializeAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Log when route changes
    useEffect(() => {
        console.log('[Layout] 🔄 Route changed to:', currentPath);
    }, [currentPath]);

    // Debug logging
    useEffect(() => {
        console.log('[Layout] State:', {
            isAuthenticated,
            isLoading,
            hasUser: !!user,
            hasToken: !!token,
            currentPath
        });
    }, [isAuthenticated, isLoading, user, token, currentPath]);

    // Handle redirections - only after loading is complete
    useEffect(() => {
        // Don't redirect while loading
        if (isLoading) {
            console.log('[Layout] Still loading, skipping redirect logic');
            return;
        }

        console.log('[Layout] Checking redirects:', {
            isAuthenticated,
            currentPath,
            hasUser: !!user,
            hasToken: !!token
        });

        // Redirect to home if authenticated but on login page
        if (isAuthenticated && user && currentPath === '/login') {
            console.log('[Layout] Redirecting to home - already authenticated');
            router.navigate({ to: '/' });
            return;
        }

        // Redirect to login if not authenticated (except on login page)
        if (!isAuthenticated && currentPath !== '/login') {
            console.log('[Layout] Redirecting to login - not authenticated');
            router.navigate({ to: '/login' });
            return;
        }
    }, [isAuthenticated, isLoading, currentPath, user, token, router]);

    // Show loading spinner while checking auth
    if (isLoading) {
        console.log('[Layout] Showing loading spinner');
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30">
                <Loader2 className="h-12 w-12 animate-spin text-sushigo-navy" />
            </div>
        );
    }

    // Don't show sidebar/header on login and logout pages
    if (currentPath === '/login' || currentPath === '/logout') {
        console.log('[Layout] Showing page without layout:', currentPath);
        return <Outlet />;
    }

    // Show main layout only if authenticated
    if (!isAuthenticated) {
        console.log('[Layout] Not authenticated, returning null');
        return null;
    }

    console.log('[Layout] ✅ RENDERING FULL LAYOUT with sidebar and header', {
        isAuthenticated,
        hasUser: !!user,
        hasToken: !!token,
        currentPath
    });

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
