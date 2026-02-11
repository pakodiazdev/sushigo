<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification sent when a user requests a password reset.
 */
class ResetPasswordNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $resetUrl,
    ) {}

    /**
     * @return array<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('SushiGo - Restablecer contraseña')
            ->greeting("¡Hola {$notifiable->name}!")
            ->line('Recibimos una solicitud para restablecer tu contraseña.')
            ->action('Restablecer Contraseña', $this->resetUrl)
            ->line('Este enlace expirará en 60 minutos.')
            ->line('Si no solicitaste un restablecimiento de contraseña, no es necesario realizar ninguna acción.')
            ->salutation('Saludos, el equipo de SushiGo');
    }
}
