import { createFileRoute } from '@tanstack/react-router';
import { useState, FormEvent } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/login')({
    component: LoginPage,
});

export function LoginPage() {
    const { login, error, isLoading } = useAuthStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await login({ email, password });
        } catch (err) {
            // Error is handled by auth store
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-4 flex flex-col items-center">
                    <Logo collapsed={false} />
                    <div className="text-center">
                        <CardTitle className="text-2xl">Bienvenido</CardTitle>
                        <CardDescription>
                            Ingresa tus credenciales para acceder
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                                Correo electrónico
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Contraseña
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Iniciando sesión...
                                </>
                            ) : (
                                'Iniciar Sesión'
                            )}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground mt-4">
                            Demo: <strong>admin@sushigo.com</strong> / <strong>admin123456</strong>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
