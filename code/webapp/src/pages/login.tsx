import { createFileRoute, Link } from '@tanstack/react-router';
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
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    const isEmail = identifier.includes('@');

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const credentials = isEmail
            ? { email: identifier, password }
            : { phone: identifier, password };
        try {
            await login(credentials);
        } catch {
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
                            <label htmlFor="identifier" className="text-sm font-medium">
                                Correo electrónico o teléfono
                            </label>
                            <Input
                                id="identifier"
                                type="text"
                                inputMode={isEmail ? 'email' : 'tel'}
                                placeholder="tu@email.com o teléfono 551234567"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                disabled={isLoading}
                                autoComplete="username"
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
                                autoComplete="current-password"
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

                        <div className="text-center mt-4 space-y-2">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                            <p className="text-sm text-muted-foreground">
                                Demo: <strong>admin@sushigo.com</strong> / <strong>admin123456</strong>
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
