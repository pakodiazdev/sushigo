import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/logout')({
    component: LogoutPage,
});

export function LogoutPage() {
    const { logout } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        const performLogout = async () => {
            console.log('[Logout] Cerrando sesión...');
            await logout();
            console.log('[Logout] Sesión cerrada, redirigiendo a home...');
            router.navigate({ to: '/' });
        };

        performLogout();
    }, [logout, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30">
            <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-sushigo-navy mx-auto" />
                <p className="text-lg text-sushigo-navy font-medium">
                    Cerrando sesión...
                </p>
            </div>
        </div>
    );
}
