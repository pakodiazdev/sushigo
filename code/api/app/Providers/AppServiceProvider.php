<?php

namespace App\Providers;

use App\Contracts\PasswordResetTokenRecorder;
use App\Contracts\VacationEntitlementRule;
use App\Services\Testing\FileTokenRecorder;
use App\Services\Testing\NullTokenRecorder;
use App\Services\VacationRules\VacationsLFTMX;
use App\Support\Clock\ApplicationClock;
use App\Support\Clock\DatabaseApplicationClock;
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

        // Application Clock: single source of truth for business time
        $this->app->singleton(ApplicationClock::class, DatabaseApplicationClock::class);

        // Active vacation entitlement rule — locked to LFT Mexico 2022 until #214
        $this->app->bind(VacationEntitlementRule::class, VacationsLFTMX::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
