import { createFileRoute, useSearch, Link, useRouter } from '@tanstack/react-router'
import { useState, useEffect, FormEvent } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

// The URL param is `t` (not `token`) — format: {40-char plainToken}.{24-char selector}
type ResetPasswordSearch = {
    t?: string
}

export const Route = createFileRoute('/reset-password')({
    component: ResetPasswordPage,
    validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
        t: (search.t as string) || undefined,
    }),
})

type VerifyState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'valid'; maskedIdentifier: string }
    | { status: 'invalid' }

function ResetPasswordPage() {
    const { t } = useSearch({ from: '/reset-password' })

    const [verifyState, setVerifyState] = useState<VerifyState>({ status: 'idle' })
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const router = useRouter()

    useEffect(() => {
        if (!t) {
            setVerifyState({ status: 'invalid' })
            return
        }

        setVerifyState({ status: 'loading' })

        apiClient
            .post('/auth/verify-reset-token', { t })
            .then((res) => {
                setVerifyState({ status: 'valid', maskedIdentifier: res.data.masked_identifier })
            })
            .catch(() => {
                setVerifyState({ status: 'invalid' })
            })
    }, [t])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres')
            return
        }

        if (password !== passwordConfirmation) {
            setError('Las contraseñas no coinciden')
            return
        }

        if (!t) return

        setIsLoading(true)

        try {
            const response = await apiClient.post('/auth/reset-password', {
                t,
                password,
                password_confirmation: passwordConfirmation,
            })

            // ResetPasswordController returns AuthTokenResponse — same shape as login:
            // { status, data: { token, token_type, user: { id, name, email, roles, permissions } } }
            const payload = response.data?.data
            if (payload?.token && payload?.user) {
                const { initializeAfterReset } = useAuthStore.getState()
                await initializeAfterReset(payload.user, payload.token)
                setTimeout(() => {
                    router.navigate({ to: '/' })
                }, 100)
                return
            }

            setSuccess(true)
        } catch (err: any) {
            const message =
                err.response?.data?.errors?.t?.[0] ||
                err.response?.data?.message ||
                'No se pudo restablecer la contraseña. El enlace puede haber expirado.'
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    if (verifyState.status === 'loading' || verifyState.status === 'idle') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="space-y-4 flex flex-col items-center">
                        <Logo collapsed={false} />
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4 py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Verificando enlace...</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (verifyState.status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="space-y-4 flex flex-col items-center">
                        <Logo collapsed={false} />
                        <div className="text-center">
                            <CardTitle className="text-2xl">Enlace inválido</CardTitle>
                            <CardDescription>
                                Este enlace de restablecimiento es inválido o ha expirado.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <AlertCircle className="h-12 w-12 text-red-500" />
                        <p className="text-sm text-muted-foreground text-center">
                            Por favor, solicita un nuevo enlace de restablecimiento desde la pantalla de inicio de sesión.
                        </p>
                        <Link to="/login" className="w-full">
                            <Button className="w-full">
                                Ir a Inicio de Sesión
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="space-y-4 flex flex-col items-center">
                        <Logo collapsed={false} />
                        <div className="text-center">
                            <CardTitle className="text-2xl">¡Contraseña actualizada!</CardTitle>
                            <CardDescription>
                                Tu contraseña ha sido configurada exitosamente.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <p className="text-sm text-muted-foreground text-center">
                            Ya puedes iniciar sesión con tu nueva contraseña.
                        </p>
                        <Link to="/login" className="w-full">
                            <Button className="w-full">
                                Ir a Inicio de Sesión
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // verifyState.status === 'valid'
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-4 flex flex-col items-center">
                    <Logo collapsed={false} />
                    <div className="text-center">
                        <CardTitle className="text-2xl">Configurar contraseña</CardTitle>
                        <CardDescription>
                            Ingresa tu nueva contraseña para acceder a tu cuenta.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <div className="p-3 text-sm text-muted-foreground bg-muted rounded-md">
                            Cuenta: <strong>{verifyState.maskedIdentifier}</strong>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                Nueva contraseña
                            </label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                minLength={8}
                            />
                            <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password_confirmation" className="text-sm font-medium">
                                Confirmar contraseña
                            </label>
                            <Input
                                id="password_confirmation"
                                type="password"
                                placeholder="••••••••"
                                value={passwordConfirmation}
                                onChange={(e) => setPasswordConfirmation(e.target.value)}
                                required
                                disabled={isLoading}
                                minLength={8}
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
                                    Guardando...
                                </>
                            ) : (
                                'Guardar contraseña'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
