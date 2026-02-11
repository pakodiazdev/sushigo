<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Notification sent when a new employee/user is created.
 * Contains a password reset link so the user can set their own password.
 */
class WelcomeEmployeeNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $resetUrl,
    ) {}

    /**
     * Determine the delivery channels.
     *
     * @return array<string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Bienvenido a SushiGo - Configura tu contraseña')
            ->greeting("¡Hola {$notifiable->name}!")
            ->line('Se ha creado una cuenta para ti en SushiGo.')
            ->line('Para comenzar, necesitas configurar tu contraseña.')
            ->action('Configurar Contraseña', $this->resetUrl)
            ->line('Este enlace expirará en 60 minutos.')
            ->line('Si no esperabas recibir este correo, puedes ignorarlo.')
            ->salutation('Saludos, el equipo de SushiGo');
    }
}
