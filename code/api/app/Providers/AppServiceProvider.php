<?php

namespace App\Providers;

use App\Contracts\PasswordResetTokenRecorder;
use App\Services\Testing\FileTokenRecorder;
use App\Services\Testing\NullTokenRecorder;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Bind PasswordResetTokenRecorder based on environment.
        // In testing/dev: FileTokenRecorder writes links to storage/testing/
        // so Cypress can retrieve them without Mailhog.
        // In production: NullTokenRecorder (no-op).
        if ($this->app->environment('testing', 'local', 'dev', 'devtest')) {
            $this->app->singleton(PasswordResetTokenRecorder::class, FileTokenRecorder::class);
        } else {
            $this->app->singleton(PasswordResetTokenRecorder::class, NullTokenRecorder::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
