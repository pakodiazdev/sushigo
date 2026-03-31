import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, FormEvent } from 'react'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/forgot-password')({
    component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
    const [identifier, setIdentifier] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const isEmail = identifier.includes('@')

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!identifier.trim()) {
            setError('Ingresa tu correo electrónico o teléfono')
            return
        }

        setIsLoading(true)

        try {
            const payload: Record<string, string> = {}
            if (isEmail) {
                payload.email = identifier
            } else {
                payload.phone = identifier
            }

            await apiClient.post('/auth/forgot-password', payload)
            setSuccess(true)
        } catch (err: unknown) {
            const message = getApiErrorMessage(err, 'No se pudo enviar el enlace. Verifica tus datos e intenta de nuevo.')
            setError(message)
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardHeader className="space-y-4 flex flex-col items-center">
                        <Logo collapsed={false} />
                        <div className="text-center">
                            <CardTitle className="text-2xl">Enlace enviado</CardTitle>
                            <CardDescription>
                                Revisa tu {isEmail ? 'correo electrónico' : 'WhatsApp'} para restablecer tu contraseña.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <CheckCircle className="h-12 w-12 text-green-500" />
                        <p className="text-sm text-muted-foreground text-center">
                            Hemos enviado un enlace de restablecimiento a <strong>{identifier}</strong>.
                            {isEmail
                                ? ' Revisa tu bandeja de entrada y spam.'
                                : ' Revisa tus mensajes de WhatsApp.'}
                        </p>
                        <Link to="/login" className="w-full">
                            <Button variant="outline" className="w-full">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver a Inicio de Sesión
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sushigo-navy/5 via-sushigo-coral/5 to-sushigo-cream/30 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-4 flex flex-col items-center">
                    <Logo collapsed={false} />
                    <div className="text-center">
                        <CardTitle className="text-2xl">¿Olvidaste tu contraseña?</CardTitle>
                        <CardDescription>
                            Ingresa tu correo o teléfono y te enviaremos un enlace para restablecerla.
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

                        <div className="space-y-2">
                            <label htmlFor="identifier" className="text-sm font-medium">
                                Correo electrónico o teléfono
                            </label>
                            <Input
                                id="identifier"
                                type="text"
                                placeholder="tu@email.com o +525512345678"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
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
                                    Enviando...
                                </>
                            ) : (
                                'Enviar enlace de restablecimiento'
                            )}
                        </Button>

                        <div className="text-center">
                            <Link
                                to="/login"
                                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                            >
                                <ArrowLeft className="inline mr-1 h-3 w-3" />
                                Volver a Inicio de Sesión
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
