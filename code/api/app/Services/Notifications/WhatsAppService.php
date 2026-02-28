<?php

namespace App\Services\Notifications;

use Illuminate\Support\Facades\Log;

/**
 * WhatsApp notification service.
 *
 * In development, messages are logged instead of sent to a real provider.
 * When a real provider is configured, this service will send HTTP requests
 * to the WhatsApp Business API or a third-party service (e.g., Twilio, 360dialog).
 */
class WhatsAppService
{
    public function sendMessage(string $phone, string $message): void
    {
        // TODO: Replace with real WhatsApp provider integration
        // Example providers: Twilio WhatsApp API, 360dialog, Meta Cloud API
        Log::channel('single')->info('[WhatsApp Service] Message to be sent', [
            'phone' => $this->maskPhone($phone),
        ]);
    }

    public function sendPasswordResetLink(string $phone, string $resetUrl): void
    {
        $message = "🔐 *SushiGo - Configurar contraseña*\n\n"
            ."Se ha creado una cuenta para ti. Haz clic en el siguiente enlace para configurar tu contraseña:\n\n"
            .$resetUrl."\n\n"
            ."Este enlace expira en 60 minutos.\n"
            .'Si no solicitaste esto, ignora este mensaje.';

        $this->sendMessage($phone, $message);

        Log::channel('single')->info('[WhatsApp Service] Password reset link sent', [
            'phone' => $this->maskPhone($phone),
        ]);
    }

    private function maskPhone(string $phone): string
    {
        $visible = substr($phone, -4);

        return str_repeat('*', max(0, strlen($phone) - 4)).$visible;
    }
}
